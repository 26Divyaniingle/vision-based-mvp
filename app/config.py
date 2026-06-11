"""
Configuration Module
This file loads and manages all environment variables for the application.
It handles API keys, database connection, email settings, and LLM configurations.
All settings are loaded from the .env file in the root directory.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    Main settings class that loads environment variables.
    This class automatically reads from the .env file and provides type-safe access to all configuration values.
    """
    
    # API Keys for different LLM providers (Large Language Models)
    GEMINI_API_KEY: str = ""  # Google Gemini API key (can be multiple comma-separated keys)
    OPENAI_API_KEY: str = ""  # OpenAI API key for GPT models
    GROQ_API_KEY: str = ""  # Groq API key for alternative LLM provider (read from .env)
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Local Ollama server URL for offline LLM
    
    def _clean_key(self, key: str) -> str:
        """Helper to strip spaces and quotes from keys."""
        if not key:
            return ""
        return key.strip().strip('"').strip("'")

    @property
    def gemini_keys(self) -> list:
        """
        Returns a list of Gemini API keys from the comma-separated string.
        Strips whitespace and quotes from each key for clean usage.
        """
        if not self.GEMINI_API_KEY:
            return []
        # Strip quotes and whitespace from each key
        return [self._clean_key(k) for k in self.GEMINI_API_KEY.split(",") if k.strip()]
    
    @property
    def groq_api_key(self) -> str:
        """Returns cleaned Groq API key, checking environment explicitly as fallback."""
        val = os.getenv("GROQ_API_KEY") or os.getenv("groq_api_key") or self.GROQ_API_KEY
        return self._clean_key(val)
    
    @property
    def openai_api_key(self) -> str:
        """Returns cleaned OpenAI API key, checking environment explicitly as fallback."""
        val = os.getenv("OPENAI_API_KEY") or os.getenv("openai_api_key") or self.OPENAI_API_KEY
        return self._clean_key(val)
    
    # Database configuration
    @property
    def DATABASE_URL(self) -> str:
        """Returns the database connection URL, prioritizing environment variables and fixing 'postgres://' if needed."""
        from urllib.parse import quote_plus
        
        # Try to get from environment variable first
        url = os.getenv("DATABASE_URL")
        
        # If no environment variable is found, allow individual overrides or use medsense defaults
        if not url:
            user = os.getenv("DB_USER") or os.getenv("USER") or "medsense"
            raw_password = os.getenv("DB_PASSWORD") or os.getenv("PASSWORD") or "udjsncnfkdj#343@"
            password = quote_plus(raw_password)
            host = os.getenv("DB_HOST") or "89.233.105.252"
            port = os.getenv("DB_PORT") or "5432"
            db = os.getenv("DB_NAME") or os.getenv("DB") or "medsense"
            url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
            
        # SQLAlchemy requires 'postgresql://' instead of 'postgres://'
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
            
        return url
    
    # LLM Model selection
    MODEL_NAME: str = "gpt-4o"  # Default model name (used as fallback for medical responses)
    
    # Email configuration for sending medical reports
    SMTP_SERVER: str = "smtp.gmail.com"  # Gmail SMTP server
    SMTP_PORT: int = 587  # SMTP port for TLS connection
    SMTP_USER: str = ""  # Email account for sending reports
    SMTP_PASS: str = ""  # Email account password
    SENDGRID_API_KEY: str = ""  # SendGrid API key for professional email delivery
    
    # Environment file path configuration
    # Load from .env if it exists, but allow OS environment variables to override
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local", ".env.prod"),
        env_file_encoding="utf-8", 
        extra="ignore"
    )

# Create a single global settings instance used throughout the application
settings = Settings()

# Post-load validation for production visibility
if not settings.groq_api_key:
    print("CRITICAL WARNING: GROQ_API_KEY is not configured. Live consultation transcription will fail.")

