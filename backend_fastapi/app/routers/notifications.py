"""Notification Routes for Disease Trend Alerts"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
import logging

from ..config.mongodb import get_mongodb
from ..services.disease_trend_service import disease_trend_service
from ..models.schemas import SuccessResponse

notification_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)

@notification_router.get("/disease-trends")
async def get_disease_trends(mongodb=Depends(get_mongodb)):
    """
    Get current trending diseases based on predictions in last 24 hours
    
    Returns:
        {
            'success': bool,
            'trending_diseases': [...],
            'total_predictions': int,
            'has_trends': bool
        }
    """
    try:
        logger.info("🔔 Fetching disease trend notifications...")
        
        trends = await disease_trend_service.detect_disease_trends(mongodb)
        
        return {
            "success": True,
            "data": trends,
            "message": f"Found {len(trends['trending_diseases'])} trending disease(s)"
        }
        
    except Exception as e:
        logger.error(f"Error fetching disease trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch disease trend notifications"
        )

@notification_router.get("/disease-trends/count")
async def get_trending_count(mongodb=Depends(get_mongodb)):
    """
    Get count of currently trending diseases (for notification badge)
    
    Returns:
        {
            'count': int,
            'has_notifications': bool
        }
    """
    try:
        trends = await disease_trend_service.detect_disease_trends(mongodb)
        
        return {
            "success": True,
            "count": len(trends['trending_diseases']),
            "has_notifications": trends['has_trends']
        }
        
    except Exception as e:
        logger.error(f"Error fetching notification count: {e}")
        return {
            "success": False,
            "count": 0,
            "has_notifications": False
        }

@notification_router.get("/disease-info/{disease_name}")
async def get_disease_information(disease_name: str):
    """
    Get detailed precautions and dietary recommendations for a specific disease
    
    Args:
        disease_name: Name of the disease (Pneumonia, Tuberculosis)
    
    Returns:
        Disease information with precautions and diet recommendations
    """
    try:
        info = await disease_trend_service.get_disease_info(disease_name)
        
        if info["success"]:
            return {
                "success": True,
                "data": info["disease"]
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=info["message"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching disease info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch disease information"
        )
