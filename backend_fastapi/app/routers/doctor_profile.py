from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Optional
import os
import logging
from datetime import datetime
from app.config.database import get_db
from PIL import Image
import io

logger = logging.getLogger(__name__)
router = APIRouter()

# Configuration
UPLOAD_DIR = "uploads/signatures"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}


@router.post("/api/doctors/upload-signature")
async def upload_doctor_signature(
    doctor_id: int,
    file: UploadFile = File(...),
    conn=Depends(get_db)
):
    """
    Upload doctor's digital signature image
    
    Args:
        doctor_id: ID of the doctor
        file: Signature image file (PNG/JPG, max 2MB)
    
    Returns:
        Success response with signature URL
    """
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validate file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Validate it's actually an image
        try:
            img = Image.open(io.BytesIO(file_content))
            img.verify()  # Verify it's a valid image
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail="Invalid image file"
            )
        
        # Verify doctor exists
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name FROM doctors WHERE id = %s",
            (doctor_id,)
        )
        doctor = cursor.fetchone()
        
        if not doctor:
            cursor.close()
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"doctor_{doctor_id}_{timestamp}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Update database with signature path
        signature_url = f"/uploads/signatures/{filename}"
        cursor.execute(
            "UPDATE doctors SET doctor_signature_path = %s WHERE id = %s",
            (signature_url, doctor_id)
        )
        conn.commit()
        cursor.close()
        
        logger.info(f"✅ Signature uploaded for Doctor ID {doctor_id}: {filename}")
        
        return {
            "success": True,
            "message": "Signature uploaded successfully",
            "signature_url": signature_url,
            "doctor_id": doctor_id,
            "doctor_name": doctor["full_name"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading signature: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/api/doctors/profile/{doctor_id}")
async def get_doctor_profile(
    doctor_id: int,
    conn=Depends(get_db)
):
    """
    Get doctor profile including signature
    
    Args:
        doctor_id: ID of the doctor
    
    Returns:
        Doctor profile data
    """
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                id, 
                full_name, 
                email, 
                pmdc_number, 
                hospital_affiliation, 
                phone,
                doctor_signature_path,
                created_at
            FROM doctors 
            WHERE id = %s
        """, (doctor_id,))
        
        doctor = cursor.fetchone()
        cursor.close()
        
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Convert datetime to string for JSON serialization
        if doctor.get('created_at'):
            doctor['created_at'] = doctor['created_at'].isoformat()
        
        return {
            "success": True,
            "doctor": doctor
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching doctor profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api/doctors/signature/{doctor_id}")
async def delete_doctor_signature(
    doctor_id: int,
    conn=Depends(get_db)
):
    """
    Delete doctor's signature
    
    Args:
        doctor_id: ID of the doctor
    
    Returns:
        Success response
    """
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Get current signature path
        cursor.execute(
            "SELECT doctor_signature_path FROM doctors WHERE id = %s",
            (doctor_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        signature_path = result.get('doctor_signature_path')
        
        # Delete file if exists
        if signature_path:
            file_path = os.path.join(".", signature_path.lstrip('/'))
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"🗑️ Deleted signature file: {file_path}")
        
        # Update database
        cursor.execute(
            "UPDATE doctors SET doctor_signature_path = NULL WHERE id = %s",
            (doctor_id,)
        )
        conn.commit()
        cursor.close()
        
        return {
            "success": True,
            "message": "Signature deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting signature: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
