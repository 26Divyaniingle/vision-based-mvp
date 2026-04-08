"""
Speech-to-Text Engine
Uses Google Gemini 1.5 Flash for high-accuracy multimodal audio transcription.
This replaces OpenAI Whisper as a more cost-effective and integrated alternative.
"""
import os
import io
import tempfile
import google.generativeai as genai
from app.config import settings

# Configure Google AI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

async def try_groq_stt(audio_bytes: bytes, language: str = "English") -> str:
    """Fallback STT using Groq Whisper API (whisper-large-v3)."""
    if not settings.GROQ_API_KEY:
        return None
    
    import requests
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}"
    }
    
    # Groq expects multipart/form-data. We wrap bytes in a file-like object.
    files = {
        "file": ("audio.mp4", audio_bytes, "audio/mp4"),
    }
    
    # Simple ISO-639-1 language mapping for Whisper
    lang_code = "en"
    if language in ["Hindi", "Hinglish", "Marathi"]: lang_code = "hi"
    elif language == "Spanish": lang_code = "es"
    elif language == "French": lang_code = "fr"
    
    data = {
        "model": "whisper-large-v3",
        "language": lang_code,
        "response_format": "json"
    }
    
    try:
        import asyncio
        response = await asyncio.to_thread(requests.post, url, headers=headers, files=files, data=data, timeout=20)
        if response.status_code == 200:
            return response.json().get("text", "").strip()
        print(f"Groq STT Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Groq STT Request failed: {e}")
    return None

# Initialize Gemini Model once at module level for speed
from app.utils.key_manager import gemini_manager

async def process_audio_chunk(audio_bytes: bytes, language: str = "English") -> str:
    """
    Transcribes audio using Google Gemini 1.5 Flash's multimodal capabilities.
    Gemini supports audio input directly and provides excellent contextual accuracy.
    """
    # 1. Try Gemini with Rotation
    max_retries = len(settings.gemini_keys) if settings.gemini_keys else 1
    
    for attempt in range(max_retries):
        model = gemini_manager.get_model()
        if not model:
            return "Audio received but Gemini model is not initialized."

        try:
            # Determine prompt based on language
            prompt = f"Transcribe the following audio precisely. The patient is speaking in {language}."
            if language == "Hinglish":
                prompt = "Transcribe the following audio. The patient is speaking a mix of Hindi and English (Hinglish). Provide the output in Roman script."

            # Process the audio directly with the model (Offload to thread)
            import asyncio
            response = await asyncio.to_thread(
                model.generate_content,
                [
                    prompt,
                    {
                        "mime_type": "audio/mp4",
                        "data": audio_bytes
                    }
                ]
            )
            return response.text.strip()
            
        except Exception as e:
            print(f"Gemini STT Attempt {attempt + 1} failed: {e}")
            if "429" in str(e) or "quota" in str(e).lower():
                if not gemini_manager.rotate_key():
                    break # No more keys
            else:
                break # Not a quota error, probably something else
    
    # 2. Fallback to Groq Whisper
    print("Falling back to Groq STT (Whisper)...")
    groq_text = await try_groq_stt(audio_bytes, language)
    if groq_text:
        return groq_text

    return ""
