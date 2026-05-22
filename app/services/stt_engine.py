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
    
    # Improved language mapping for Whisper
    lang_code = None 
    lang_lower = language.lower()
    
    if "hinglish" in lang_lower:
        lang_code = "hi" # Force Hindi domain which captures Hinglish well without translating back to English
    elif "hindi" in lang_lower: 
        lang_code = "hi"
    elif "marathi" in lang_lower:
        lang_code = "mr"
    elif "spanish" in lang_lower: 
        lang_code = "es"
    elif "french" in lang_lower: 
        lang_code = "fr"
    elif "english" in lang_lower:
        lang_code = "en"
    
    # Groq expects multipart/form-data.
    files = {
        "file": ("audio.m4a", audio_bytes, "audio/m4a"),
    }
    
    # Enhanced medical context prompt to guide Whisper for Hinglish/English accuracy
    if "hinglish" in lang_lower:
        # We provide a strong mix of Hindi and English to prime the model for code-switching
        medical_prompt = (
            "Hinglish: 'Doctor: Hello, aap kaise feel kar rahe hain? Any headache or pain?' "
            "Patient: 'Mujhe thoda fever hai aur weakness lag rahi hai.' "
            "Important: Transcribe in Latin script (Romanized Hindi/English) only. "
            "Do NOT use Devanagari. Capture medical terms accurately: BP, sugar, infection, diagnosis."
        )
    else:
        medical_prompt = (
            "A clinical consultation. Keywords: symptoms, diagnosis, prescription, medication, "
            "blood pressure, respiratory, cardiac, abdomen, persistent pain, history of illness."
        )
    
    data = {
        "model": "whisper-large-v3",
        "response_format": "json",
        "prompt": medical_prompt
    }
    
    if lang_code:
        data["language"] = lang_code
    
    try:
        response = await ASYNC_CLIENT.post(url, headers=headers, files=files, data=data, timeout=20.0)
        if response.status_code == 200:
            text = response.json().get("text", "").strip()
            # Filter out common Whisper hallucinations for near-silent audio
            hallucinations = ["thank you for watching", "subtitles by", "please subscribe", "transcribed by", "www."]
            low_text = text.lower()
            if any(h in low_text for h in hallucinations) and len(text.split()) < 6:
                return ""
            return text
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

