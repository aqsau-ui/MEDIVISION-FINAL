from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from ..config.settings import settings
import logging

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
    
    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URI)
            self.db = self.client.get_default_database()
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully")
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection error: {e}")
            raise
    
    async def close(self):
        """Close MongoDB connection"""
        if self.client is not None:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def get_collection(self, name: str):
        """Get a collection from MongoDB"""
        if self.db is None:
            raise Exception("MongoDB not connected")
        return self.db[name]

# Global MongoDB instance
mongodb = MongoDB()

async def get_mongodb():
    """Dependency for getting MongoDB instance"""
    return mongodb
