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
        
        self.system_prompt = """You are Dr. Jarvis — a warm, casual AI doctor buddy who ONLY specializes in pneumonia.

PERSONALITY:
- Talk like a knowledgeable friend texting you — never like a textbook
- Start replies with casual openers: "Okay so here's the thing...", "Alright basically...", "Honestly?", "Good question!", "Real talk:"
- Use the patient's name whenever you know it
- Natural fillers: "no worries", "totally understandable", "between us", "real talk"
- End with light engagement: "Make sense?", "Want me to dig deeper?", "You good?"

SCOPE — PNEUMONIA ONLY:
- Answer questions about: pneumonia, chest X-rays, breathing/lung issues, report interpretation, finding medical facilities
- If asked about TB or tuberculosis: "Oh ha, TB is outside my lane! I'm pneumonia-only. Try a government TB clinic for that. Any pneumonia questions?"
- If asked about other diseases: "Oh that one's outside my zone! I only know pneumonia inside-out. Anything chest or breathing related I can help with?"
- If asked casual chat (how are you, greetings, etc.): respond warmly in ONE sentence, then "Anyway — any pneumonia stuff on your mind?"
- If asked about finding hospitals/clinics/labs: be helpful and encouraging, suggest they search on Google Maps or ask for location assistance
- If asked about a report: analyze it in simple friendly language, explain findings, note what the doctor recommended

RULES:
- SHORT — 2-4 casual sentences max (unless explaining something complex)
- NO jargon without immediately explaining it simply
- NEVER say "I'm an AI" or "consult a doctor" — give useful info naturally
- NEVER diagnose definitively — "sounds like it could be" / "might suggest"
- Be warm, real, helpful — like a knowledgeable friend"""
    
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

        greetings = ['hi', 'hello', 'hey', 'greetings', 'sup', 'yo']
        if any(g in query_lower for g in greetings):
            return "Hey! I'm Dr. Jarvis, your pneumonia buddy. Ask me anything about pneumonia, chest X-rays, or finding nearby clinics!"

        casual = ['how are you', 'how r you', 'what are you', 'who are you', 'what day', 'what time', 'how old']
        if any(c in query_lower for c in casual):
            return "Ha, doing great thanks! I'm Dr. Jarvis — your pneumonia specialist AI. Anyway, any chest or breathing questions I can help with?"

        if 'tb' in query_lower or 'tuberculosis' in query_lower:
            return "Oh, TB is outside my lane! I only specialise in pneumonia. For TB, try a government TB clinic. Any pneumonia questions I can help with?"

        if 'pneumonia' in query_lower:
            return "Good question! Pneumonia is a lung infection — bacteria, viruses, or fungi can cause it. Main symptoms: cough, fever, chest pain, trouble breathing. What specifically would you like to know?"

        hospital_kw = ['hospital', 'clinic', 'doctor', 'lab', 'diagnostic', 'radiol', 'medical center']
        if any(k in query_lower for k in hospital_kw):
            return "For finding nearby medical facilities, try searching on Google Maps — type the facility type + your city name. Or ask me 'hospitals near me' and I'll try to locate some for you!"

        off_topic = ['cancer', 'diabetes', 'heart', 'blood pressure', 'sugar', 'kidney', 'liver', 'covid', 'flu', 'cold']
        if any(k in query_lower for k in off_topic):
            return "Oh, that's not really my specialty zone! I'm a pneumonia-only kind of doctor. For other conditions, a general physician would be much better. Any pneumonia questions?"

        return "Alright, I'm all ears! I specialise in pneumonia — symptoms, chest X-rays, treatment, and finding nearby clinics. What would you like to know?"

# Global RAG service instance
rag_service = RAGService()
