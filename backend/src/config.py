"""
TrueReact Backend - Application Configuration

Loads settings from environment variables with validation using Pydantic.
"""

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Google Cloud Configuration
    GOOGLE_CLOUD_PROJECT: str = "project-2d4bbf33-4fa1-4e7c-8f1"
    GOOGLE_CLOUD_REGION: str = "us-central1"
    
    # Gemini API Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    
    # Vertex AI Search Configuration
    VERTEX_SEARCH_DATASTORE_ID: str = ""
    VERTEX_SEARCH_LOCATION: str = "global"
    
    # Application Settings
    APP_ENV: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    PORT: int = 8080
    
    # WebSocket Configuration
    WS_MAX_CONNECTIONS: int = 100
    WS_HEARTBEAT_INTERVAL: int = 30
    
    # Safety Settings
    DISTRESS_THRESHOLD: float = 0.7
    CRISIS_RESOURCE_ENABLED: bool = True
    
    # Grounding Settings
    GOOGLE_SEARCH_GROUNDING_ENABLED: bool = True
    GROUNDING_DYNAMIC_THRESHOLD: float = 0.3
    
    # Content Filter Settings (AUP Compliance)
    CONTENT_FILTER_ENABLED: bool = True
    CONTENT_FILTER_LOG_BLOCKED: bool = True
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
