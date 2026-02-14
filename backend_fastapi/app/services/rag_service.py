"""RAG Service using Groq AI for medical chatbot"""
import json
import os
from typing import Dict, List, Optional
import logging
from groq import Groq
from dotenv import load_dotenv

from ..config.settings import settings

# Explicitly load .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(env_path)

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        # Get API key from environment or settings
        api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
        logger.info(f"🔑 Initializing Groq client with API key: {api_key[:15]}... (length: {len(api_key)})")
        
        # Initialize Groq client
        self.groq = Groq(api_key=api_key)
        
        # Knowledge base storage
        self.knowledge_base = {
            "tb": None,
            "pneumonia": None
        }
        
        self.system_prompt = """You are Dr. Jarvis, a friendly AI medical assistant specializing in tuberculosis (TB) and pneumonia.

COMMUNICATION STYLE:
- Use simple, everyday language (talk like explaining to a friend)
- Keep answers SHORT and natural (3-5 sentences)
- NO medical jargon - use common words
- NO emojis or special characters
- Answer directly, then stop

KNOWLEDGE SOURCE:
You have access to comprehensive medical knowledge about TB and Pneumonia from the knowledge base below. Use this information to answer questions accurately.

CRITICAL RULES:
- ONLY answer questions about TB, pneumonia, and lung/breathing issues
- If asked about other topics, say: "I specialize in TB and pneumonia. For other health concerns, please consult your doctor."
- NEVER say someone definitely has a disease - use "might suggest" or "could be"
- NEVER add disclaimers like "I'm an AI" or "consult a doctor" at the end
- Be direct and helpful
- Focus on the specific question asked

Keep responses under 100 words unless asked for more detail."""
    
    async def initialize(self):
        """Load knowledge base files"""
        try:
            # Path to knowledge base
            kb_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "..", "backend", "data", "knowledge_base"
            )
            
            # Load TB knowledge
            tb_path = os.path.join(kb_path, "tb_knowledge.json")
            if os.path.exists(tb_path):
                with open(tb_path, 'r', encoding='utf-8') as f:
                    self.knowledge_base["tb"] = json.load(f)
            
            # Load Pneumonia knowledge
            pneumonia_path = os.path.join(kb_path, "pneumonia_knowledge.json")
            if os.path.exists(pneumonia_path):
                with open(pneumonia_path, 'r', encoding='utf-8') as f:
                    self.knowledge_base["pneumonia"] = json.load(f)
            
            logger.info("✅ RAG Service initialized with medical knowledge base")
            logger.info(f"   - TB Knowledge: {'Loaded' if self.knowledge_base['tb'] else 'Not found'}")
            logger.info(f"   - Pneumonia Knowledge: {'Loaded' if self.knowledge_base['pneumonia'] else 'Not found'}")
            
        except Exception as e:
            logger.error(f"❌ Error loading knowledge base: {e}")
            logger.info("⚠️  Will use fallback responses")
    
    def get_relevant_context(self, query: str) -> str:
        """Get relevant medical knowledge from knowledge base"""
        query_lower = query.lower()
        context = ""
        
        try:
            # Determine which disease the query is about
            is_tb = 'tb' in query_lower or 'tuberculosis' in query_lower
            is_pneumonia = 'pneumonia' in query_lower
            
            # Build context from knowledge base
            if is_tb and self.knowledge_base["tb"]:
                context += "\n=== TUBERCULOSIS (TB) INFORMATION ===\n"
                context += json.dumps(self.knowledge_base["tb"], indent=2)
            
            if is_pneumonia and self.knowledge_base["pneumonia"]:
                context += "\n\n=== PNEUMONIA INFORMATION ===\n"
                context += json.dumps(self.knowledge_base["pneumonia"], indent=2)
            
            # If no specific disease mentioned, include both
            if not is_tb and not is_pneumonia:
                if self.knowledge_base["tb"]:
                    context += "\n=== TUBERCULOSIS (TB) INFORMATION ===\n"
                    context += json.dumps(self.knowledge_base["tb"], indent=2)
                if self.knowledge_base["pneumonia"]:
                    context += "\n\n=== PNEUMONIA INFORMATION ===\n"
                    context += json.dumps(self.knowledge_base["pneumonia"], indent=2)
            
            if context:
                logger.info(f"✅ Retrieved {len(context)} characters from knowledge base")
        
        except Exception as e:
            logger.error(f"❌ Error fetching knowledge base content: {e}")
        
        return context
    
    async def process_query(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """Process user query with RAG"""
        try:
            logger.info(f"🤔 Processing query: '{query}'")
            logger.info(f"API Key configured: {bool(settings.GROQ_API_KEY)}")
            logger.info(f"API Key length: {len(settings.GROQ_API_KEY) if settings.GROQ_API_KEY else 0}")
            logger.info(f"API Key value (first 15 chars): {settings.GROQ_API_KEY[:15] if settings.GROQ_API_KEY else 'None'}...")
            
            # Get relevant context from knowledge base
            context = self.get_relevant_context(query)
            logger.info(f"📚 Context retrieved: {len(context) if context else 0} characters")
            
            # Build messages for Groq
            messages = [{"role": "system", "content": self.system_prompt}]
            
            # Add context if available
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Use this medical knowledge to answer:\n{context[:8000]}"  # Limit context size
                })
            
            # Add conversation history
            if conversation_history:
                messages.extend(conversation_history[-6:])  # Last 6 messages
            
            # Add current query
            messages.append({"role": "user", "content": query})
            
            # Call Groq API
            response = self.groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=300
            )
            
            answer = response.choices[0].message.content.strip()
            
            logger.info("✅ Query processed successfully with Groq AI")
            
            return {
                "success": True,
                "message": answer
            }
        
        except Exception as e:
            logger.error(f"❌ Groq API error: {type(e).__name__}: {str(e)}")
            logger.error(f"Full error details: {repr(e)}")
            # Return success with fallback message
            return {
                "success": True,
                "message": self.get_fallback_response(query)
            }
    
    def get_fallback_response(self, query: str) -> str:
        """Get fallback response when AI is unavailable"""
        query_lower = query.lower()
        
        # Greeting responses
        greetings = ['hi', 'hello', 'hey', 'greetings']
        if any(g in query_lower for g in greetings):
            return "Hello! I'm Dr. Jarvis, your AI health assistant. I can help you with questions about TB and pneumonia. What would you like to know?"
        
        # TB related
        if 'tb' in query_lower or 'tuberculosis' in query_lower:
            return "Tuberculosis (TB) is a bacterial infection that mainly affects the lungs. Common symptoms include persistent cough, fever, night sweats, and weight loss. It's treatable with antibiotics. Would you like to know more about specific symptoms or treatment?"
        
        # Pneumonia related
        if 'pneumonia' in query_lower:
            return "Pneumonia is a lung infection that can be caused by bacteria, viruses, or fungi. Symptoms include cough, fever, chest pain, and difficulty breathing. Treatment depends on the cause. What specific aspect would you like to know about?"
        
        # Cancer question
        if 'cancer' in query_lower:
            return "I specialize in TB and pneumonia. For other health concerns like cancer, please consult your doctor."
        
        # Default
        return "I can help with questions about TB and pneumonia. Could you please ask about these conditions or their symptoms, diagnosis, or treatment?"

# Global RAG service instance
rag_service = RAGService()
