"""Doctors Routes"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging

from ..config.database import get_db

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])
logger = logging.getLogger(__name__)

@router.get("/list")
async def get_doctors_list(conn=Depends(get_db)):
    """Get list of all verified doctors"""
    try:
        cursor = conn.cursor(dictionary=True)
        
        # Get all verified doctors
        cursor.execute("""
            SELECT id, full_name as fullName, email, pmdc_number as pmdcNumber
            FROM doctors 
            WHERE is_verified = 1
            ORDER BY full_name ASC
        """)
        
        doctors = cursor.fetchall()
        
        return {
            "success": True,
            "doctors": doctors
        }
    
    except Exception as e:
        logger.error(f"Error fetching doctors list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching doctors list"
        )
    finally:
        cursor.close()
