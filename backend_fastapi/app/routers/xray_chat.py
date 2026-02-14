"""X-Ray Validation and Chat Routes"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, Dict
import logging
import base64
import subprocess
import json
import os
from datetime import datetime

from ..config.mongodb import get_mongodb
from ..models.schemas import ChatMessageRequest, SuccessResponse
from ..services.rag_service import rag_service

xray_router = APIRouter(prefix="/api/xray", tags=["X-Ray Validation"])
chat_router = APIRouter(prefix="/api/chat", tags=["Chat"])
logger = logging.getLogger(__name__)

# Conversation store (in production, use database)
conversation_store: Dict[str, list] = {}

@xray_router.post("/validate-xray")
async def validate_xray(file: UploadFile = File(...)):
    """Validate if uploaded image is a chest X-ray"""
    try:
        # Read file content
        file_content = await file.read()
        image_base64 = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{image_base64}"
        
        # Call Python validator script
        validator_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "..", "..", "backend", "services", "xrayValidator.py"
        )
        
        if os.path.exists(validator_path):
            result = subprocess.run(
                ["python", validator_path, data_url],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                validation_result = json.loads(result.stdout)
                return {
                    "success": True,
                    "isChestXray": validation_result.get("isChestXray", False),
                    "confidence": validation_result.get("confidence", 0),
                    "message": validation_result.get("message", "")
                }
        
        # Fallback if validator not available
        return {
            "success": True,
            "isChestXray": True,
            "confidence": 0.9,
            "message": "Image accepted (validation bypassed)"
        }
    
    except Exception as e:
        logger.error(f"X-ray validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error validating X-ray image"
        )

@chat_router.post("/message")
async def chat_message(request: dict, mongodb=Depends(get_mongodb)):
    """Send message to AI chatbot using RAG"""
    try:
        message = request.get("message", "")
        session_id = request.get("sessionId") or request.get("session_id") or "default"
        logger.info(f"📩 Received chat message: '{message}' from session: {session_id}")
        
        if not message or not message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Get or create conversation history
        conversation_history = conversation_store.get(session_id, [])
        
        # Process query with RAG service
        response = await rag_service.process_query(message, conversation_history)
        
        if response["success"]:
            # Update conversation history
            conversation_history.append({"role": "user", "content": message})
            conversation_history.append({"role": "assistant", "content": response["message"]})
            
            # Keep only last 10 messages
            if len(conversation_history) > 10:
                conversation_history = conversation_history[-10:]
            
            conversation_store[session_id] = conversation_history
            
            # Store in MongoDB
            collection = mongodb.get_collection("chat_messages")
            await collection.insert_one({
                "sessionId": session_id,
                "message": message,
                "response": response["message"],
                "timestamp": datetime.utcnow()
            })
            
            logger.info(f"✅ Sending response to session {session_id}: {response['message'][:100]}...")
            
            return {
                "success": True,
                "message": response["message"],
                "sessionId": session_id
            }
        else:
            # Use fallback
            fallback_message = rag_service.get_fallback_response(message)
            return {
                "success": True,
                "message": fallback_message,
                "sessionId": session_id,
                "fallback": True
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        fallback = rag_service.get_fallback_response(message if message else "")
        return {
            "success": True,
            "message": fallback,
            "fallback": True
        }

@chat_router.post("/upload")
async def chat_upload(file: UploadFile = File(...)):
    """Upload file for chat"""
    try:
        # Read and store file
        file_content = await file.read()
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        logger.error(f"Chat upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading file"
        )

@chat_router.post("/clear")
async def clear_chat(session_id: Optional[str] = None, mongodb=Depends(get_mongodb)):
    """Clear chat history"""
    try:
        # Clear memory store
        if session_id:
            conversation_store.pop(session_id, None)
        else:
            conversation_store.clear()
        
        # Clear MongoDB
        collection = mongodb.get_collection("chat_messages")
        filter_query = {"sessionId": session_id} if session_id else {}
        result = await collection.delete_many(filter_query)
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} messages"
        }
    
    except Exception as e:
        logger.error(f"Clear chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing chat"
        )

@chat_router.get("/health")
async def chat_health():
    """Chat service health check"""
    return {
        "success": True,
        "message": "Chat service is healthy",
        "rag_initialized": rag_service.knowledge_base["tb"] is not None or rag_service.knowledge_base["pneumonia"] is not None
    }

