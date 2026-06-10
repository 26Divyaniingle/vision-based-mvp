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
    GROQ_API_KEY: str = ""  # Groq API key for alternative LLM provider
    OLLAMA_BASE_URL: str = "http://localhost:11434"  # Local Ollama server URL for offline LLM
    
    @property
    def gemini_keys(self) -> list:
        """
        Returns a list of Gemini API keys from the comma-separated string.
        Strips whitespace and quotes from each key for clean usage.
        """
        if not self.GEMINI_API_KEY:
            return []
        # Strip quotes and whitespace from each key
        return [k.strip().strip('"').strip("'") for k in self.GEMINI_API_KEY.split(",") if k.strip()]
    
    # Database configuration
    _base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL: str = ""  # Supabase PostgreSQL connection (read from .env or environment variable)
    
    # LLM Model selection
    MODEL_NAME: str = "gpt-4o"  # Default model name (used as fallback for medical responses)
    
    # Email configuration for sending medical reports
    SMTP_SERVER: str = "smtp.gmail.com"  # Gmail SMTP server
    SMTP_PORT: int = 587  # SMTP port for TLS connection
    SMTP_USER: str = ""  # Email account for sending reports
    SMTP_PASS: str = ""  # Email account password
    SENDGRID_API_KEY: str = ""  # SendGrid API key for professional email delivery
    
    # Environment file path configuration
    _env_path: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    model_config = SettingsConfigDict(env_file=_env_path, env_file_encoding="utf-8", extra="ignore")

# Create a single global settings instance used throughout the application
settings = Settings()

