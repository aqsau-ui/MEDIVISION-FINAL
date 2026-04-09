"""Doctors Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from ..config.database import get_db

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])
logger = logging.getLogger(__name__)

@router.get("/list")
async def get_doctors_list(conn=Depends(get_db)):
    """Get list of all verified doctors with profile information"""
    cursor = None
    try:
        cursor = conn.cursor(dictionary=True)
        
        # First, check which columns exist
        cursor.execute("SHOW COLUMNS FROM doctors")
        columns = [col['Field'] for col in cursor.fetchall()]
        
        # Build query based on available columns
        select_fields = [
            "id",
            "full_name as fullName",
            "email",
            "pmdc_number as pmdcNumber"
        ]
        
        # Add optional fields if they exist
        if 'hospital_affiliation' in columns:
            select_fields.append("hospital_affiliation")
        if 'phone' in columns:
            select_fields.append("phone")
        if 'specialization' in columns:
            select_fields.append("specialization")
        
        query = f"""
            SELECT {', '.join(select_fields)}
            FROM doctors 
            WHERE is_verified = 1
            ORDER BY full_name ASC
        """
        
        cursor.execute(query)
        doctors = cursor.fetchall()
        
        return {
            "success": True,
            "doctors": doctors
        }
    
    except Exception as e:
        logger.error(f"Error fetching doctors list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching doctors list: {str(e)}"
        )
    finally:
        if cursor:
            cursor.close()
