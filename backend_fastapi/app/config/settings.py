from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Server
    PORT: int = 5000
    ENVIRONMENT: str = "development"
    
    # Database
    DB_HOST: str = "localhost"
    DB_USER: str = "root"
    DB_PASSWORD: str
    DB_NAME: str = "medivision_db"
    DB_PORT: int = 3306
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/medivision"
    
    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File Upload
    MAX_FILE_SIZE: int = 10485760
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Email
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "MEDIVISION <noreply@medivision.com>"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # Groq AI
    GROQ_API_KEY: Optional[str] = "gsk_your_key_here"

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None

    # Model Selection
    USE_PYTORCH_MODEL: bool = False  # Set to True to use new PyTorch model, False for old Keras model
    
    class Config:
        # Use absolute path to .env file
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        case_sensitive = True

settings = Settings()


