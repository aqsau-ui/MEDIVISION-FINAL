"""Disease Trend Detection Service - Tracks recurring diseases and generates alerts"""
from datetime import datetime, timedelta
from typing import Dict, List
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class DiseaseTrendService:
    """Service to detect and track disease trends based on AI predictions"""
    
    # Disease information with precautions and diet recommendations
    DISEASE_INFO = {
        "Pneumonia": {
            "name": "Pneumonia",
            "precautions": [
                "Get Vaccinated: Keep up to date with your Pneumococcal, Flu, COVID-19, and RSV vaccines, as these illnesses often lead to pneumonia. (Consult your doctor on which are right for you).",
                "Practice Strict Hygiene: Wash your hands frequently with soap and water (or use a 60%+ alcohol hand sanitizer) and avoid close contact with sick individuals.",
                "Protect Your Lungs: Quit smoking and avoid secondhand smoke, as smoking severely damages your lungs' natural defenses.",
                "Boost Your Immunity: Maintain a healthy diet, exercise regularly, get 7-9 hours of sleep, and carefully manage any chronic health conditions like diabetes or asthma."
            ],
            "dietary_recommendations": [
                "Drink warm fluids (herbal teas, warm water with honey)",
                "Consume fruits rich in Vitamin C (oranges, lemons, kiwi, guava)",
                "Eat immune-supporting foods such as garlic and ginger",
                "Maintain proper hydration (8-10 glasses of water daily)",
                "Include protein-rich foods to support recovery (chicken, fish, eggs, lentils)",
                "Consume foods rich in zinc (nuts, seeds, chickpeas, yogurt)",
                "Include anti-inflammatory foods like turmeric and leafy greens"
            ],
            "severity": "high"
        },
    }
    
    # Threshold and time window configuration
    TREND_THRESHOLD = 5  # Number of cases to trigger alert
    TIME_WINDOW_HOURS = 24  # Look back 24 hours
    
    def __init__(self):
        self.cached_trends = {}
        self.cache_timestamp = None
        self.cache_ttl_minutes = 5  # Cache for 5 minutes
    
    async def detect_disease_trends(self, mongodb: AsyncIOMotorDatabase) -> Dict:
        """
        Detect trending diseases based on recent predictions
        
        Returns:
            {
                'trending_diseases': [
                    {
                        'disease': str,
                        'count': int,
                        'time_window': str,
                        'precautions': List[str],
                        'dietary_recommendations': List[str],
                        'severity': str
                    }
                ],
                'total_predictions': int,
                'time_window_start': str,
                'time_window_end': str
            }
        """
        try:
            # Check cache first
            if self._is_cache_valid():
                logger.info("📊 Returning cached disease trends")
                return self.cached_trends
            
            # Calculate time window
            now = datetime.utcnow()
            time_window_start = now - timedelta(hours=self.TIME_WINDOW_HOURS)
            
            # Get xray_analyses collection
            collection = mongodb.get_collection("xray_analyses")
            
            # Query predictions in the last 24 hours, excluding Normal
            query = {
                "timestamp": {"$gte": time_window_start},
                "prediction": {"$in": ["Pneumonia"]}
            }
            
            # Count predictions by disease
            pipeline = [
                {"$match": query},
                {
                    "$group": {
                        "_id": "$prediction",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            disease_counts = await collection.aggregate(pipeline).to_list(length=None)
            
            # Also count from patient_reports collection (for comprehensive tracking)
            reports_collection = mongodb.get_collection("patient_reports")
            reports_query = {
                "createdAt": {"$gte": time_window_start},
                "analysis.prediction": {"$in": ["Pneumonia"]}
            }
            
            reports_pipeline = [
                {"$match": reports_query},
                {
                    "$group": {
                        "_id": "$analysis.prediction",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            report_counts = await reports_collection.aggregate(reports_pipeline).to_list(length=None)
            
            # Merge counts from both collections
            combined_counts = {}
            for item in disease_counts:
                disease = item["_id"]
                combined_counts[disease] = combined_counts.get(disease, 0) + item["count"]
            
            for item in report_counts:
                disease = item["_id"]
                combined_counts[disease] = combined_counts.get(disease, 0) + item["count"]
            
            # Identify trending diseases (count >= threshold)
            trending_diseases = []
            total_predictions = 0
            
            for disease, count in combined_counts.items():
                total_predictions += count
                
                if count >= self.TREND_THRESHOLD and disease in self.DISEASE_INFO:
                    disease_data = self.DISEASE_INFO[disease]
                    trending_diseases.append({
                        "disease": disease,
                        "count": count,
                        "time_window": f"Last {self.TIME_WINDOW_HOURS} hours",
                        "precautions": disease_data["precautions"],
                        "dietary_recommendations": disease_data["dietary_recommendations"],
                        "severity": disease_data["severity"],
                        "threshold": self.TREND_THRESHOLD
                    })
            
            result = {
                "trending_diseases": trending_diseases,
                "total_predictions": total_predictions,
                "time_window_start": time_window_start.isoformat(),
                "time_window_end": now.isoformat(),
                "time_window_hours": self.TIME_WINDOW_HOURS,
                "has_trends": len(trending_diseases) > 0
            }
            
            # Update cache
            self.cached_trends = result
            self.cache_timestamp = now
            
            logger.info(f"✅ Disease trend detection complete: {len(trending_diseases)} trending disease(s)")
            for trend in trending_diseases:
                logger.warning(f"⚠️ TRENDING: {trend['disease']} - {trend['count']} cases in last {self.TIME_WINDOW_HOURS}h")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error detecting disease trends: {e}", exc_info=True)
            return {
                "trending_diseases": [],
                "total_predictions": 0,
                "time_window_start": None,
                "time_window_end": None,
                "time_window_hours": self.TIME_WINDOW_HOURS,
                "has_trends": False,
                "error": str(e)
            }
    
    def _is_cache_valid(self) -> bool:
        """Check if cached trends are still valid"""
        if not self.cache_timestamp or not self.cached_trends:
            return False
        
        age_minutes = (datetime.utcnow() - self.cache_timestamp).total_seconds() / 60
        return age_minutes < self.cache_ttl_minutes
    
    async def get_disease_info(self, disease_name: str) -> Dict:
        """Get detailed information about a specific disease"""
        if disease_name in self.DISEASE_INFO:
            return {
                "success": True,
                "disease": self.DISEASE_INFO[disease_name]
            }
        else:
            return {
                "success": False,
                "message": f"No information available for {disease_name}"
            }

# Singleton instance
disease_trend_service = DiseaseTrendService()
