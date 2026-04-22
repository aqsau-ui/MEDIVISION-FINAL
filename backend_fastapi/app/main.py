"""Main FastAPI Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from .config import mysql_db, mongodb, settings
from .routers import auth, doctor_auth, patient_profile, xray_chat, doctors, reports, notifications, doctor_prescription, medical_reports, doctor_profile, chat_ws
from .services.rag_service import rag_service

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.date import DateTrigger
    _scheduler_available = True
except ImportError:
    _scheduler_available = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def auto_open_session(session_id: int):
    """APScheduler job: open a chat session at scheduled time."""
    try:
        conn = mysql_db.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE chat_sessions SET status='open' WHERE id=%s", (session_id,))
        conn.commit()
        cursor.close()
        conn.close()
        from .services.websocket_manager import ws_manager
        await ws_manager.broadcast(str(session_id), {
            "type": "chat_unlocked", "session_id": session_id, "status": "open"
        })
        logger.info(f"✅ Auto-opened chat session {session_id}")
    except Exception as e:
        logger.error(f"auto_open_session error: {e}")


async def auto_close_session(session_id: int):
    """APScheduler job: close a chat session at scheduled time."""
    try:
        conn = mysql_db.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE chat_sessions SET status='closed' WHERE id=%s", (session_id,))
        conn.commit()
        cursor.close()
        conn.close()
        from .services.websocket_manager import ws_manager
        await ws_manager.broadcast(str(session_id), {
            "type": "chat_locked", "session_id": session_id, "status": "closed"
        })
        logger.info(f"✅ Auto-closed chat session {session_id}")
    except Exception as e:
        logger.error(f"auto_close_session error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🔄 Starting MEDIVISION FastAPI Backend...")

    try:
        # Connect to MySQL
        mysql_db.connect()
        logger.info("✅ MySQL connection established")

        # Create chat tables
        try:
            chat_ws.create_chat_tables()
        except Exception as e:
            logger.warning(f"Chat table creation skipped: {e}")

        # Connect to MongoDB
        await mongodb.connect()
        logger.info("✅ MongoDB connection established")

        # Initialize RAG service
        await rag_service.initialize()
        logger.info("✅ RAG service initialized")

        # Start APScheduler for auto open/close sessions
        if _scheduler_available:
            scheduler = AsyncIOScheduler()
            scheduler.start()
            app.state.scheduler = scheduler
            logger.info("✅ APScheduler started")
        else:
            app.state.scheduler = None
            logger.warning("APScheduler not installed — scheduled open/close unavailable")

        logger.info(f"🚀 Server is running on http://localhost:{settings.PORT}")
        logger.info("✅ Backend is ready to accept requests")

        yield

    finally:
        # Shutdown
        logger.info("Shutting down MEDIVISION Backend...")
        if getattr(app.state, "scheduler", None) and _scheduler_available:
            app.state.scheduler.shutdown(wait=False)
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
app.include_router(notifications.notification_router)
app.include_router(doctor_prescription.router)
app.include_router(medical_reports.router, prefix="/api/medical-reports", tags=["Medical Reports"])
app.include_router(doctor_profile.router)
app.include_router(chat_ws.router)

# Static files for uploaded signatures
os.makedirs("uploads/signatures", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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
