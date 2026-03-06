"""Main FastAPI Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import mysql_db, mongodb, settings
from .routers import auth, doctor_auth, patient_profile, xray_chat, doctors, reports
from .services.rag_service import rag_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🔄 Starting MEDIVISION FastAPI Backend...")
    
    try:
        # Connect to MySQL
        mysql_db.connect()
        logger.info("✅ MySQL connection established")
        
        # Connect to MongoDB
        await mongodb.connect()
        logger.info("✅ MongoDB connection established")
        
        # Initialize RAG service
        await rag_service.initialize()
        logger.info("✅ RAG service initialized")
        
        logger.info(f"🚀 Server is running on http://localhost:{settings.PORT}")
        logger.info("✅ Backend is ready to accept requests")
        
        yield
        
    finally:
        # Shutdown
        logger.info("Shutting down MEDIVISION Backend...")
        mysql_db.close()
        await mongodb.close()
        logger.info("All connections closed")

# Create FastAPI app
app = FastAPI(
    title="MEDIVISION API",
    description="Medical Diagnosis Platform Backend API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(doctor_auth.router)
app.include_router(patient_profile.router)
app.include_router(xray_chat.xray_router)
app.include_router(xray_chat.chat_router)
app.include_router(doctors.router)
app.include_router(reports.router)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "message": "MEDIVISION Backend is running",
        "version": "2.0.0",
        "framework": "FastAPI"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MEDIVISION API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
