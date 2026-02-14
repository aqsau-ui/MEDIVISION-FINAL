import mysql.connector
from mysql.connector import pooling
from typing import Optional
from ..config.settings import settings
import logging

logger = logging.getLogger(__name__)

class MySQLDatabase:
    def __init__(self):
        self.pool: Optional[pooling.MySQLConnectionPool] = None
    
    def connect(self):
        """Create MySQL connection pool"""
        try:
            self.pool = pooling.MySQLConnectionPool(
                pool_name="medivision_pool",
                pool_size=10,
                host=settings.DB_HOST,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME,
                port=settings.DB_PORT
            )
            logger.info("✅ MySQL connection pool created successfully")
            
            # Test connection
            conn = self.pool.get_connection()
            conn.close()
            logger.info("✅ MySQL connection test successful")
            
        except Exception as e:
            logger.error(f"❌ MySQL connection error: {e}")
            raise
    
    def get_connection(self):
        """Get connection from pool"""
        if not self.pool:
            self.connect()
        return self.pool.get_connection()
    
    def close(self):
        """Close all connections"""
        if self.pool:
            # Connection pools don't have explicit close
            logger.info("MySQL connection pool closed")

# Global database instance
mysql_db = MySQLDatabase()

def get_db():
    """Dependency for getting database connection"""
    conn = mysql_db.get_connection()
    try:
        yield conn
    finally:
        conn.close()
