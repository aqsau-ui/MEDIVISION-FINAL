"""
Medical Report Upload and Analysis Router
Handles image/PDF uploads and OCR extraction
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import Optional
import os
import uuid
import logging
from datetime import datetime

from ..services.ocr_service import ocr_service
from ..config.mongodb import get_mongodb

logger = logging.getLogger(__name__)

router = APIRouter()

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "reports")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

@router.post("/upload")
async def upload_medical_report(
    file: UploadFile = File(...),
    session_id: Optional[str] = None,
    patient_email: Optional[str] = None,
    mongodb = Depends(get_mongodb)
):
    """
    Upload and process medical report image/PDF
    
    Returns:
        - success: bool
        - report_id: str
        - extracted_text: str
        - parsed_data: dict
    """
    try:
        logger.info(f"📤 Received report upload: {file.filename} from session: {session_id}")
        
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {int(MAX_FILE_SIZE / 1024 / 1024)}MB. Please ensure the file is clear and readable."
            )
        
        # Generate unique filename
        report_id = str(uuid.uuid4())
        filename = f"{report_id}{file_ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(filepath, "wb") as f:
            f.write(content)
        
        logger.info(f"💾 Saved report to: {filepath}")
        
        # Extract text using OCR
        if file_ext == ".pdf":
            ocr_result = await ocr_service.extract_text_from_pdf(filepath)
        else:
            ocr_result = await ocr_service.extract_text_from_image(filepath)
        
        if not ocr_result.get("success"):
            # Delete file on failure
            if os.path.exists(filepath):
                os.remove(filepath)
            raise HTTPException(status_code=400, detail=ocr_result.get("error", "OCR extraction failed"))
        
        # Store report in MongoDB
        report_document = {
            "report_id": report_id,
            "session_id": session_id,
            "patient_email": patient_email,
            "filename": file.filename,
            "file_path": filepath,
            "file_type": file_ext,
            "file_size": file_size,
            "raw_text": ocr_result.get("raw_text", ""),
            "parsed_data": ocr_result.get("parsed_data", {}),
            "uploaded_at": datetime.now(),
            "status": "processed"
        }
        
        # Insert into MongoDB
        reports_collection = mongodb["medical_reports"]
        await reports_collection.insert_one(report_document)
        
        logger.info(f"✅ Report {report_id} processed and stored successfully")
        
        parsed = ocr_result.get("parsed_data", {})
        raw_text = ocr_result.get("raw_text", "")

        # Build a structured summary the RAG/avatar can use for specific answers
        summary_parts = []
        if parsed.get("patient_name"):    summary_parts.append(f"Patient: {parsed['patient_name']}")
        if parsed.get("doctor_name"):     summary_parts.append(f"Doctor: {parsed['doctor_name']}")
        if parsed.get("test_type"):       summary_parts.append(f"Report type: {parsed['test_type']}")
        if parsed.get("report_date"):     summary_parts.append(f"Date: {parsed['report_date']}")
        if parsed.get("lab_name"):        summary_parts.append(f"Lab/Hospital: {parsed['lab_name']}")
        if parsed.get("findings"):        summary_parts.append(f"Findings: {parsed['findings'][:300]}")
        if parsed.get("impression"):      summary_parts.append(f"Diagnosis/Impression: {parsed['impression'][:300]}")
        if parsed.get("medications"):     summary_parts.append(f"Medications: {parsed['medications'][:300]}")
        if parsed.get("recommendations"): summary_parts.append(f"Recommendations: {parsed['recommendations'][:300]}")
        structured_summary = " | ".join(summary_parts) if summary_parts else raw_text[:800]

        return {
            "success": True,
            "message": "Report uploaded and processed successfully",
            "report_id": report_id,
            "extracted_text": raw_text[:1000],
            "structured_summary": structured_summary,
            "parsed_data": parsed,
            "test_type": parsed.get("test_type", "Medical Report"),
            "analysis": {
                "patient_name":    parsed.get("patient_name"),
                "doctor_name":     parsed.get("doctor_name"),
                "findings":        parsed.get("findings"),
                "impression":      parsed.get("impression"),
                "medications":     parsed.get("medications"),
                "recommendations": parsed.get("recommendations"),
                "lab_name":        parsed.get("lab_name"),
                "report_date":     parsed.get("report_date"),
            },
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Report upload error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/report/{report_id}")
async def get_report_data(
    report_id: str,
    mongodb = Depends(get_mongodb)
):
    """
    Get extracted report data by report ID
    """
    try:
        reports_collection = mongodb["medical_reports"]
        report = await reports_collection.find_one({"report_id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Remove MongoDB _id field
        if "_id" in report:
            del report["_id"]
        
        return {
            "success": True,
            "report": report
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/reports")
async def get_session_reports(
    session_id: str,
    mongodb = Depends(get_mongodb)
):
    """
    Get all reports for a specific chat session
    """
    try:
        reports_collection = mongodb["medical_reports"]
        cursor = reports_collection.find({"session_id": session_id})
        reports = await cursor.to_list(length=100)
        
        # Remove MongoDB _id fields
        for report in reports:
            if "_id" in report:
                del report["_id"]
        
        return {
            "success": True,
            "count": len(reports),
            "reports": reports
        }
        
    except Exception as e:
        logger.error(f"❌ Get session reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/report/{report_id}")
async def delete_report(
    report_id: str,
    mongodb = Depends(get_mongodb)
):
    """
    Delete a medical report (file and database entry)
    """
    try:
        reports_collection = mongodb["medical_reports"]
        report = await reports_collection.find_one({"report_id": report_id})
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Delete file
        filepath = report.get("file_path")
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"🗑️ Deleted file: {filepath}")
        
        # Delete from database
        await reports_collection.delete_one({"report_id": report_id})
        
        return {
            "success": True,
            "message": "Report deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
