import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    
    @property
    def gemini_keys(self) -> list:
        if not self.GEMINI_API_KEY:
            return []
        # Strip quotes and whitespace from each key
        return [k.strip().strip('"').strip("'") for k in self.GEMINI_API_KEY.split(",") if k.strip()]
    _base_dir: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATABASE_URL: str = f"sqlite:///{os.path.join(_base_dir, 'data', 'vision_agent.db')}"
    MODEL_NAME: str = "gpt-4o"  # As a stand-in for MedGemma
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SENDGRID_API_KEY: str = ""
    
    _env_path: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    model_config = SettingsConfigDict(env_file=_env_path, env_file_encoding="utf-8", extra="ignore")

settings = Settings()

