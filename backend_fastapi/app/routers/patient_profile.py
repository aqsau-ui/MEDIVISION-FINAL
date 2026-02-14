"""Patient Profile Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Optional
import logging
import base64
from datetime import datetime

from ..config.mongodb import get_mongodb
from ..config.database import get_db

router = APIRouter(prefix="/api/patient", tags=["Patient Profile"])
logger = logging.getLogger(__name__)

@router.post("/submit-profile")
async def submit_profile(
    email: str = Form(...),
    fullName: str = Form(..., alias="fullName"),
    age: int = Form(...),
    gender: str = Form(...),
    symptoms: str = Form(...),
    duration: str = Form(...),
    diseaseType: str = Form(..., alias="diseaseType"),
    severity: str = Form(...),
    diagnosis: Optional[str] = Form(None),
    recommendations: Optional[str] = Form(None),
    xrayFile: Optional[UploadFile] = File(None),
    mongodb=Depends(get_mongodb)
):
    """Submit patient profile with X-ray"""
    try:
        # Prepare profile data
        profile_data = {
            "email": email,
            "fullName": fullName,
            "personalInfo": {
                "age": age,
                "gender": gender
            },
            "symptoms": symptoms,
            "duration": duration,
            "diseaseType": diseaseType,
            "severity": severity,
            "diagnosis": diagnosis,
            "recommendations": recommendations,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        # Handle X-ray file if provided
        if xrayFile:
            file_content = await xrayFile.read()
            image_base64 = base64.b64encode(file_content).decode('utf-8')
            
            profile_data["xrayData"] = {
                "image": f"data:{xrayFile.content_type};base64,{image_base64}",
                "mimeType": xrayFile.content_type,
                "size": len(file_content),
                "filename": xrayFile.filename,
                "uploadDate": datetime.utcnow()
            }
        
        # Save to MongoDB
        collection = mongodb.get_collection("patient_profiles")
        result = await collection.insert_one(profile_data)
        
        return {
            "success": True,
            "message": "Profile submitted successfully!",
            "profileId": str(result.inserted_id),
            "addedAt": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error submitting profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting patient profile"
        )

@router.get("/profile/{email}")
async def get_profile(email: str, mongodb=Depends(get_mongodb)):
    """Get patient profile by email"""
    try:
        collection = mongodb.get_collection("patient_profiles")
        profile = await collection.find_one(
            {"email": email},
            sort=[("createdAt", -1)]
        )
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        # Convert ObjectId to string
        profile["_id"] = str(profile["_id"])
        
        return {
            "success": True,
            "profile": profile
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching patient profile"
        )

@router.get("/profiles/{email}")
async def get_all_profiles(email: str, mongodb=Depends(get_mongodb)):
    """Get all patient profiles by email"""
    try:
        collection = mongodb.get_collection("patient_profiles")
        profiles = await collection.find({"email": email}).sort("createdAt", -1).to_list(length=100)
        
        # Convert ObjectIds to strings
        for profile in profiles:
            profile["_id"] = str(profile["_id"])
        
        return {
            "success": True,
            "profiles": profiles,
            "count": len(profiles)
        }
    
    except Exception as e:
        logger.error(f"Error fetching profiles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching patient profiles"
        )

@router.get("/all-profiles")
async def get_all_patients(mongodb=Depends(get_mongodb)):
    """Get all patient profiles"""
    try:
        collection = mongodb.get_collection("patient_profiles")
        profiles = await collection.find().sort("createdAt", -1).to_list(length=1000)
        
        # Convert ObjectIds to strings
        for profile in profiles:
            profile["_id"] = str(profile["_id"])
        
        return {
            "success": True,
            "profiles": profiles,
            "count": len(profiles)
        }
    
    except Exception as e:
        logger.error(f"Error fetching all profiles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching patient profiles"
        )
