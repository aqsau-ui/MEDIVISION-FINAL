"""X-Ray Validation and Chat Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from typing import Optional, Dict
from pydantic import BaseModel
import logging
import base64
import subprocess
import json
import os
import numpy as np
from io import BytesIO
from PIL import Image
from skimage.metrics import structural_similarity as ssim
from datetime import datetime

from ..config.mongodb import get_mongodb
from ..models.schemas import ChatMessageRequest, SuccessResponse
from ..services.rag_service import rag_service
from ..services.xray_model_service import xray_model_service
from ..services.medical_explanations import get_heatmap_explanation, get_comparative_analysis, get_medical_disclaimer

xray_router = APIRouter(prefix="/api/xray", tags=["X-Ray Validation"])
chat_router = APIRouter(prefix="/api/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

# Conversation store (in production, use database)
conversation_store: Dict[str, list] = {}

@xray_router.post("/validate-xray")
async def validate_xray(file: UploadFile = File(...)):
    """Validate if uploaded image is a chest X-ray using pixel-level analysis."""
    try:
        file_content = await file.read()
        image = Image.open(BytesIO(file_content)).convert("RGB")

        # ── Resize for fast analysis ──
        thumb = image.resize((256, 256))
        pixels = list(thumb.getdata())
        total = len(pixels)

        # Per-pixel analysis
        gray_count = 0
        dark_count = 0       # brightness < 60  (background of X-ray)
        bright_count = 0     # brightness > 200 (lung/bone highlight)
        total_brightness = 0.0

        for r, g, b in pixels:
            brightness = (r + g + b) / 3.0
            total_brightness += brightness
            # Strict grayscale: R≈G≈B within ±12
            if max(abs(r - g), abs(g - b), abs(r - b)) <= 12:
                gray_count += 1
            if brightness < 60:
                dark_count += 1
            if brightness > 200:
                bright_count += 1

        gray_pct   = gray_count   / total * 100
        dark_pct   = dark_count   / total * 100
        bright_pct = bright_count / total * 100
        avg_brightness = total_brightness / total

        w, h = image.size
        aspect = w / h

        # ── Chest X-ray heuristics ──
        # 1. Strictly grayscale (≥85 % of pixels have R≈G≈B within ±12)
        is_grayscale   = gray_pct >= 85
        # 2. Dark background is dominant (≥25 %)
        has_dark_bg    = dark_pct >= 25
        # 3. Some bright regions (bone/lung) present (≥5 %)
        has_highlights = bright_pct >= 5
        # 4. Average brightness low-to-mid (typical X-ray range)
        good_brightness = 20 <= avg_brightness <= 160
        # 5. Portrait or near-square aspect ratio
        good_aspect    = 0.55 <= aspect <= 1.55

        score = sum([is_grayscale, has_dark_bg, has_highlights, good_brightness, good_aspect])
        is_xray = score >= 4   # must pass at least 4 of 5 criteria

        logger.info(
            f"Validation — gray:{gray_pct:.1f}% dark:{dark_pct:.1f}% "
            f"bright:{bright_pct:.1f}% avgBright:{avg_brightness:.1f} "
            f"aspect:{aspect:.2f} score:{score}/5 → {'PASS' if is_xray else 'FAIL'}"
        )

        return {
            "success": True,
            "isChestXray": is_xray,
            "confidence": round(score / 5, 2),
            "message": (
                "Valid chest X-ray detected."
                if is_xray else
                "Image does not meet chest X-ray characteristics. "
                "Please upload a standard posterior-anterior (PA) chest radiograph."
            )
        }

    except Exception as e:
        logger.error(f"X-ray validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating image. Please try again."
        )

@xray_router.post("/analyze")
async def analyze_xray(file: UploadFile = File(...), mongodb=Depends(get_mongodb)):
    """Analyze X-ray image for disease detection with heatmap visualization"""
    try:
        logger.info(f"📸 Analyzing X-ray image: {file.filename}")
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size too large. Maximum 10MB allowed."
            )
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Run disease detection
        prediction_result = await xray_model_service.predict(file_content)

        original_prediction = prediction_result["prediction"]
        original_confidence = prediction_result["confidence"]
        validation_info = None

        # Generate medical explanations with AI
        has_heatmap = prediction_result.get("heatmap") is not None
        medical_explanation = get_heatmap_explanation(
            prediction_result["prediction"],
            prediction_result["confidence"],
            has_heatmap,
            prediction_result["probabilities"]  # Pass probabilities for AI context
        )
        
        comparative_analysis = get_comparative_analysis(
            prediction_result["prediction"],
            prediction_result["probabilities"]
        )
        
        # Store analysis in MongoDB
        try:
            collection = mongodb.get_collection("xray_analyses")
            await collection.insert_one({
                "filename": file.filename,
                "prediction": prediction_result["prediction"],
                "confidence": prediction_result["confidence"],
                "probabilities": prediction_result["probabilities"],
                "is_normal": prediction_result["is_normal"],
                "timestamp": datetime.utcnow()
            })
            logger.info(f"✅ Stored analysis in MongoDB")
        except Exception as db_error:
            logger.warning(f"⚠️ Failed to store in MongoDB: {db_error}")
        
        logger.info(f"✅ Analysis complete: {prediction_result['prediction']} ({prediction_result['confidence']:.2%})")
        
        return {
            "success": True,
            "prediction": prediction_result["prediction"],
            "confidence": prediction_result["confidence"],
            "probabilities": prediction_result["probabilities"],
            "heatmap": prediction_result["heatmap"],
            "is_normal": prediction_result["is_normal"],
            "message": f"Detected: {prediction_result['prediction']} with {prediction_result['confidence']:.1%} confidence",
            "validation": {
                "was_validated": validation_info is not None,
                "original_prediction": original_prediction if validation_info else None,
                "validation_reason": validation_info.get('reason') if validation_info else None,
                "feature_score": validation_info.get('feature_score') if validation_info else None,
                "validation_passed": validation_info.get('validation_passed') if validation_info else None
            },
            "explanation": {
                "description": medical_explanation["description"],
                "what_detected": medical_explanation["what_detected"],
                "interpretation": medical_explanation["interpretation"],
                "medical_context": medical_explanation["medical_context"],
                "confidence_level": medical_explanation["confidence_level"],
                "comparative_analysis": comparative_analysis,
                "disclaimer": get_medical_disclaimer()
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ X-ray analysis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing X-ray image: {str(e)}"
        )

@chat_router.post("/message")
async def chat_message(request: dict, mongodb=Depends(get_mongodb)):
    """Send message to AI chatbot using RAG"""
    try:
        message = request.get("message", "")
        session_id = request.get("sessionId") or request.get("session_id") or "default"
        logger.info(f"📩 Received chat message: '{message}' from session: {session_id}")
        
        if not message or not message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Get or create conversation history
        conversation_history = conversation_store.get(session_id, [])
        
        # Process query with RAG service
        response = await rag_service.process_query(message, conversation_history)
        
        if response["success"]:
            # Update conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": response["message"]})
            
            # Keep only last 10 messages
            if len(conversation_history) > 10:
                conversation_history = conversation_history[-10:]
            
            conversation_store[session_id] = conversation_history
            
            # Store in MongoDB
            collection = mongodb.get_collection("chat_messages")
            await collection.insert_one({
                "sessionId": session_id,
                "message": message,
                "response": response["message"],
                "timestamp": datetime.utcnow()
            })
            
            logger.info(f"✅ Sending response to session {session_id}: {response['message'][:100]}...")
            
            return {
                "success": True,
                "message": response["message"],
                "sessionId": session_id
            }
        else:
            # Use fallback
            fallback_message = rag_service.get_fallback_response(message)
            return {
                "success": True,
                "message": fallback_message,
                "sessionId": session_id,
                "fallback": True
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        fallback = rag_service.get_fallback_response(message if message else "")
        return {
            "success": True,
            "message": fallback,
            "fallback": True
        }

@chat_router.post("/upload")
async def chat_upload(file: UploadFile = File(...)):
    """Upload file for chat"""
    try:
        # Read and store file
        file_content = await file.read()
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        logger.error(f"Chat upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading file"
        )

@chat_router.post("/clear")
async def clear_chat(session_id: Optional[str] = None, mongodb=Depends(get_mongodb)):
    """Clear chat history"""
    try:
        # Clear memory store
        if session_id:
            conversation_store.pop(session_id, None)
        else:
            conversation_store.clear()
        
        # Clear MongoDB
        collection = mongodb.get_collection("chat_messages")
        filter_query = {"sessionId": session_id} if session_id else {}
        result = await collection.delete_many(filter_query)
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} messages"
        }
    
    except Exception as e:
        logger.error(f"Clear chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing chat"
        )

@chat_router.get("/health")
async def chat_health():
    """Chat service health check"""
    return {
        "success": True,
        "message": "Chat service is healthy",
        "rag_initialized": rag_service.knowledge_base["tb"] is not None or rag_service.knowledge_base["pneumonia"] is not None
    }


# ---------------------------------------------------------------------------
# Progress tracking helpers
# ---------------------------------------------------------------------------

def _compute_severity_and_score(prediction: str, confidence: float):
    """Return (severity, health_score) from prediction + confidence."""
    if prediction.lower() == "normal":
        return "Normal", max(80, int(100 - confidence * 15))
    # Pneumonia
    if confidence < 0.50:
        return "Mild", int(75 - confidence * 20)
    if confidence < 0.70:
        return "Moderate", int(60 - confidence * 15)
    return "Severe", int(45 - confidence * 10)


# ---------------------------------------------------------------------------
# Progress endpoints
# ---------------------------------------------------------------------------

class BaselineRequest(BaseModel):
    patient_id: str
    prediction: str
    confidence: float
    probabilities: Optional[dict] = {}
    heatmap: Optional[str] = ""
    originalImage: Optional[str] = ""

@xray_router.post("/progress/baseline")
async def save_progress_baseline(
    req: BaselineRequest,
    mongodb=Depends(get_mongodb)
):
    """Save every X-ray result from PatientProfile into the progress collection."""
    try:
        collection = mongodb.get_collection("patient_xray_progress")

        severity, health_score = _compute_severity_and_score(req.prediction, req.confidence)
        probability = round(req.confidence * 100, 1)

        def to_disease_prob(pred: str, conf: float) -> float:
            return round((1.0 - conf) * 100, 1) if pred.lower() == "normal" else round(conf * 100, 1)

        disease_probability = to_disease_prob(req.prediction, req.confidence)

        doc = {
            "patient_id": req.patient_id,
            "xray_image": req.originalImage or "",
            "disease": req.prediction,
            "probability": probability,
            "disease_probability": disease_probability,
            "confidence": req.confidence,
            "severity": severity,
            "health_score": health_score,
            "heatmap": req.heatmap or "",
            "analysis": {
                "prediction": req.prediction,
                "confidence": req.confidence,
                "probabilities": req.probabilities,
            },
            "timestamp": datetime.utcnow(),
            "source": "patient_profile",
        }
        await collection.insert_one(doc)
        return {"success": True, "message": "Record saved"}
    except Exception as e:
        logger.error(f"Baseline save error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@xray_router.get("/progress/history/{patient_id}")
async def get_progress_history(patient_id: str, mongodb=Depends(get_mongodb)):
    """Return all progress records and chart history for a patient."""
    try:
        collection = mongodb.get_collection("patient_xray_progress")
        cursor = collection.find(
            {"patient_id": patient_id},
            {"_id": 1, "patient_id": 1, "xray_image": 1, "disease": 1,
             "probability": 1, "severity": 1, "health_score": 1,
             "timestamp": 1, "analysis": 1, "heatmap": 1}
        ).sort("timestamp", 1)
        records = await cursor.to_list(length=200)

        # Convert ObjectId to str
        for r in records:
            r["_id"] = str(r["_id"])

        history = [
            {
                "date": r["timestamp"].isoformat() if isinstance(r.get("timestamp"), datetime) else str(r.get("timestamp", "")),
                "health_score": r.get("health_score", 50),
                "disease": r.get("disease", "Unknown"),
                "severity": r.get("severity", "Unknown"),
                "probability": r.get("probability", 0),
            }
            for r in records
        ]

        return {"success": True, "history": history, "records": records}
    except Exception as e:
        logger.error(f"Progress history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@xray_router.get("/progress/eligibility")
async def check_progress_eligibility(
    patient_id: str = Query(...),
    mongodb=Depends(get_mongodb)
):
    """Check if patient has a prior record; always allow upload."""
    try:
        collection = mongodb.get_collection("patient_xray_progress")
        existing = await collection.find_one({"patient_id": patient_id})
        has_prior = existing is not None
        return {"success": True, "eligible": True, "has_prior_record": has_prior}
    except Exception as e:
        logger.error(f"Eligibility check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@xray_router.post("/progress/analyze")
async def analyze_progress_xray(
    file: UploadFile = File(...),
    patient_id: str = Query(...),
    mongodb=Depends(get_mongodb)
):
    """Run disease detection for progress tracking; compare with prior record."""
    try:
        if not patient_id:
            raise HTTPException(status_code=400, detail="patient_id is required")

        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File size too large. Maximum 10MB allowed.")
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid file type.")

        # Run model
        prediction_result = await xray_model_service.predict(file_content)
        prediction = prediction_result["prediction"]
        confidence = prediction_result["confidence"]
        probability = round(confidence * 100, 1)

        severity, health_score = _compute_severity_and_score(prediction, confidence)

        # Encode X-ray as base64 for storage / display
        xray_b64 = f"data:{file.content_type};base64,{base64.b64encode(file_content).decode()}"

        # Fetch most-recent prior record for comparison
        collection = mongodb.get_collection("patient_xray_progress")
        prior = await collection.find_one(
            {"patient_id": patient_id},
            sort=[("timestamp", -1)]
        )

        comparison = None
        if prior:
            prev_prob = prior.get("probability", probability)
            prev_health_score = prior.get("health_score", health_score)
            # Normalise to "pneumonia probability" so comparison is always apples-to-apples:
            # For Normal predictions, disease probability = 1 - confidence (prob of being Pneumonia)
            # For Pneumonia predictions, disease probability = confidence
            def to_disease_prob(pred: str, conf: float) -> float:
                return round((1.0 - conf) * 100, 1) if pred.lower() == "normal" else round(conf * 100, 1)

            prev_disease_prob = prior.get("disease_probability",
                to_disease_prob(prior.get("disease", ""), prior.get("confidence", 0.5)))
            curr_disease_prob = to_disease_prob(prediction, confidence)

            # Compute real SSIM between prior and current X-ray
            ssim_score = None
            try:
                prior_b64 = prior.get("xray_image", "")
                if prior_b64 and "," in prior_b64:
                    prior_b64 = prior_b64.split(",", 1)[1]
                if prior_b64:
                    prior_bytes = base64.b64decode(prior_b64)
                    prior_img = np.array(Image.open(BytesIO(prior_bytes)).convert("L").resize((224, 224)))
                    curr_img = np.array(Image.open(BytesIO(file_content)).convert("L").resize((224, 224)))
                    score, _ = ssim(prior_img, curr_img, full=True)
                    ssim_score = round(float(score), 4)
            except Exception as ssim_err:
                logger.warning(f"SSIM computation failed: {ssim_err}")

            # Determine status using prediction class as primary signal
            prev_disease = prior.get("disease", "").lower()
            curr_disease = prediction.lower()

            if prev_disease == "normal" and curr_disease == "normal":
                # Both Normal → always Stable (minor health-score jitter is not clinically meaningful)
                comp_status = "Stable"
            elif prev_disease != "normal" and curr_disease == "normal":
                # Was sick, now Normal → Improved
                comp_status = "Improved"
            elif prev_disease == "normal" and curr_disease != "normal":
                # Was Normal, now Pneumonia → Worsened
                comp_status = "Worsened"
            else:
                # Both Pneumonia → use health_score delta as tiebreaker
                health_delta = health_score - prev_health_score
                if health_delta > 4:
                    comp_status = "Improved"
                elif health_delta < -4:
                    comp_status = "Worsened"
                else:
                    comp_status = "Stable"

            comparison = {
                "previous_probability": prev_disease_prob,
                "current_probability": curr_disease_prob,
                "previous_health_score": prev_health_score,
                "current_health_score": health_score,
                "ssim_score": ssim_score,
                "status": comp_status,
            }

        # Persist record
        doc = {
            "patient_id": patient_id,
            "xray_image": xray_b64,
            "disease": prediction,
            "probability": probability,
            "disease_probability": curr_disease_prob if comparison else to_disease_prob(prediction, confidence),
            "confidence": confidence,
            "severity": severity,
            "health_score": health_score,
            "heatmap": prediction_result.get("heatmap"),
            "analysis": {
                "prediction": prediction,
                "confidence": confidence,
                "probabilities": prediction_result["probabilities"],
            },
            "timestamp": datetime.utcnow(),
        }
        await collection.insert_one(doc)

        # Rebuild progress history
        cursor = collection.find(
            {"patient_id": patient_id},
            {"timestamp": 1, "health_score": 1, "disease": 1, "severity": 1, "probability": 1}
        ).sort("timestamp", 1)
        all_records = await cursor.to_list(length=200)
        progress_history = [
            {
                "date": r["timestamp"].isoformat(),
                "health_score": r.get("health_score", 50),
                "disease": r.get("disease", "Unknown"),
                "severity": r.get("severity", "Unknown"),
                "probability": r.get("probability", 0),
            }
            for r in all_records
        ]

        summary_map = {
            "Improved": "Compared to your previous X-ray, there is an improvement in lung condition.",
            "Worsened": "The latest analysis indicates an increase in disease probability. Medical consultation recommended.",
            "Stable": "No significant change detected compared to the previous X-ray.",
        }
        summary = summary_map.get(comparison["status"] if comparison else "Stable",
                                  "Analysis complete.")

        return {
            "success": True,
            "prediction": prediction,
            "confidence": confidence,
            "probabilities": prediction_result["probabilities"],
            "heatmap": prediction_result.get("heatmap"),
            "is_normal": prediction_result["is_normal"],
            "probability": probability,
            "severity": severity,
            "health_score": health_score,
            "comparison": comparison,
            "progress_history": progress_history,
            "summary": summary,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Progress analyze error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

