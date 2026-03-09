"""
Speech-to-Text Engine
Uses OpenAI Whisper via API for audio transcription.
"""
import os
import io
import tempfile
import openai
from app.config import settings

WHISPER_LANG_MAP = {
    "English": "en",
    "Spanish": "es",
    "Hindi": "hi",
    "French": "fr",
    "Arabic": "ar",
    "Portuguese": "pt",
    "German": "de",
    "Italian": "it",
    "Russian": "ru",
    "Japanese": "ja",
    "Korean": "ko",
    "Chinese": "zh",
    "Marathi": "mr",
    "Hinglish": "hi"
}

async def process_audio_chunk(audio_bytes: bytes, language: str = "English") -> str:
    """
    Simulates real-time STT for a chunk of audio using OpenAI Whisper.
    If no API key is provided, returns a mock transcription to prevent crashing.
    """
    if not settings.OPENAI_API_KEY:
        return "Audio received but OPENAI_API_KEY is not set."

    iso_lang = WHISPER_LANG_MAP.get(language, "en")
    
    try:
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_name = f.name
            
        with open(tmp_name, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language=iso_lang,
                response_format="text"
            )
        os.remove(tmp_name)
        return transcript
    except Exception as e:
        if 'tmp_name' in locals() and os.path.exists(tmp_name):
            os.remove(tmp_name)
        print(f"Whisper STT Error: {e}")
        return ""
