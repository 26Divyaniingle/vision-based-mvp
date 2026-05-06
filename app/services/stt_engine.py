import os
import io
import base64
import httpx
from app.config import settings

# Global async client for connection pooling
ASYNC_CLIENT = httpx.AsyncClient(timeout=30.0)

async def try_groq_stt(audio_bytes: bytes, language: str = "English") -> str:
    """Transcription using Groq Whisper API (whisper-large-v3)."""
    if not settings.GROQ_API_KEY:
        print("Groq API Key missing for STT")
        return None
    
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}"
    }
    
    # Simple ISO-639-1 language mapping for Whisper
    lang_code = "en"
    lang_lower = language.lower()
    if any(l in lang_lower for l in ["hindi", "hinglish", "marathi"]): 
        lang_code = "hi"
    elif "spanish" in lang_lower: 
        lang_code = "es"
    elif "french" in lang_lower: 
        lang_code = "fr"
    
    # Groq expects multipart/form-data.
    files = {
        "file": ("audio.m4a", audio_bytes, "audio/m4a"),
    }
    
    data = {
        "model": "whisper-large-v3",
        "language": lang_code,
        "response_format": "json"
    }
    
    try:
        response = await ASYNC_CLIENT.post(url, headers=headers, files=files, data=data, timeout=20.0)
        if response.status_code == 200:
            return response.json().get("text", "").strip()
        print(f"Groq STT Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Groq STT Request failed: {e}")
    return None

async def process_audio_chunk(audio_bytes: bytes, language: str = "English") -> str:
    """
    Transcribes audio using Groq Whisper.
    """
    print(f"Processing audio chunk with Groq Whisper ({language})...")
    transcription = await try_groq_stt(audio_bytes, language)
    
    if transcription:
        return transcription
        
    return ""

