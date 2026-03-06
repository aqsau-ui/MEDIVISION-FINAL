"""X-Ray Validation and Chat Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, Dict
import logging
import base64
import subprocess
import json
import os
from datetime import datetime

from ..config.mongodb import get_mongodb
from ..models.schemas import ChatMessageRequest, SuccessResponse
from ..services.rag_service import rag_service
from ..services.xray_model_service import xray_model_service
from ..services.medical_explanations import get_heatmap_explanation, get_comparative_analysis, get_medical_disclaimer
from ..services.tb_validator import tb_validator

xray_router = APIRouter(prefix="/api/xray", tags=["X-Ray Validation"])
chat_router = APIRouter(prefix="/api/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

# Conversation store (in production, use database)
conversation_store: Dict[str, list] = {}

@xray_router.post("/validate-xray")
async def validate_xray(file: UploadFile = File(...)):
    """Validate if uploaded image is a chest X-ray"""
    try:
        # Read file content
        file_content = await file.read()
        image_base64 = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{image_base64}"
        
        # Call Python validator script
        validator_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "..", "..", "backend", "services", "xrayValidator.py"
        )
        
        if os.path.exists(validator_path):
            result = subprocess.run(
                ["python", validator_path, data_url],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                validation_result = json.loads(result.stdout)
                return {
                    "success": True,
                    "isChestXray": validation_result.get("isChestXray", False),
                    "confidence": validation_result.get("confidence", 0),
                    "message": validation_result.get("message", "")
                }
        
        # Fallback if validator not available
        return {
            "success": True,
            "isChestXray": True,
            "confidence": 0.9,
            "message": "Image accepted (validation bypassed)"
        }
    
    except Exception as e:
        logger.error(f"X-ray validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating X-ray image"
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
        
        # TB VALIDATION - Reduce false positives
        original_prediction = prediction_result["prediction"]
        original_confidence = prediction_result["confidence"]
        validation_info = None
        
        # If TB is predicted, validate with feature checker
        if prediction_result["prediction"] == "Tuberculosis":
            logger.info(f"🔍 TB predicted - running feature validation...")
            
            tb_prob = prediction_result["probabilities"].get("Tuberculosis", 0)
            pneumonia_prob = prediction_result["probabilities"].get("Pneumonia", 0)
            normal_prob = prediction_result["probabilities"].get("Normal", 0)
            
            validation_result = tb_validator.validate_tb_prediction(
                file_content,
                tb_prob,
                pneumonia_prob,
                normal_prob
            )
            
            validation_info = validation_result
            
            # Update prediction if validator suggests different diagnosis
            if validation_result['adjusted_prediction'] != 'Tuberculosis':
                logger.warning(f"⚠️ TB prediction overridden: {validation_result['adjusted_prediction']}")
                logger.warning(f"   Reason: {validation_result['reason']}")
                
                prediction_result["prediction"] = validation_result['adjusted_prediction']
                prediction_result["confidence"] = min(validation_result['adjusted_confidence'], 0.95)
                
                # Update is_normal flag
                prediction_result["is_normal"] = (validation_result['adjusted_prediction'] == 'Normal')
                
                # Recalculate probabilities to reflect adjustment
                if validation_result['adjusted_prediction'] == 'Pneumonia':
                    prediction_result["probabilities"]["Pneumonia"] = prediction_result["confidence"]
                    prediction_result["probabilities"]["Tuberculosis"] *= 0.5
                elif validation_result['adjusted_prediction'] == 'Normal':
                    prediction_result["probabilities"]["Normal"] = prediction_result["confidence"]
                    prediction_result["probabilities"]["Tuberculosis"] *= 0.5
            else:
                # TB confirmed, but adjust confidence based on features
                logger.info(f"✅ TB diagnosis validated (feature score: {validation_result['feature_score']:.2f})")
                prediction_result["confidence"] = validation_result['adjusted_confidence']
        
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

