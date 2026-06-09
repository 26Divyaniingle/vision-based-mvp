import os
import io
import base64
import httpx
from app.config import settings

# Global async client for connection pooling
ASYNC_CLIENT = httpx.AsyncClient(timeout=30.0)

async def try_groq_stt(audio_bytes: bytes, language: str = "English", verbatim: bool = False) -> str:
    """Transcription using Groq Whisper API.
    
    verbatim=True  → Raw mode: whisper-large-v3-turbo, neutral prompt, no cleanup.
                     Returns EXACTLY what was spoken, same as a voice recorder.
    verbatim=False → Medical mode: whisper-large-v3, medical domain prompt.
    """
    if not settings.groq_api_key:
        print("CRITICAL: Groq API Key missing for STT. Ensure GROQ_API_KEY is set in production environment variables.")
        return None
    
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}"
    }
    
    # Language code mapping for Whisper
    lang_code = None 
    lang_lower = language.lower()
    
    if "hinglish" in lang_lower:
        lang_code = "hi"
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
    
    # Groq expects multipart/form-data
    files = {
        "file": ("audio.m4a", audio_bytes, "audio/m4a"),
    }
    
    # Always use the full whisper-large-v3 model for peak accuracy (same as consultation STT)
    model = "whisper-large-v3"
    
    if "hinglish" in lang_lower:
        prompt = (
            "Transcribe every word exactly as spoken. "
            "Write Hindi and mixed English words in Roman/Latin script (Hinglish) exactly as heard. "
            "Do NOT use Devanagari script. Keep clinical terms intact: BP, sugar, pain, fever, headache. "
            "Do not translate, summarize, or alter any word."
        )
    elif "hindi" in lang_lower:
        prompt = (
            "Hindi: Transcribe every word exactly as spoken in Devanagari script. "
            "Do not translate, summarize, or change any words."
        )
    elif "marathi" in lang_lower:
        prompt = (
            "Marathi: Transcribe every word exactly as spoken in Devanagari script. "
            "Do not translate, summarize, or change any words."
        )
    else:
        prompt = (
            "Transcribe every word exactly as spoken. "
            "Do not translate, summarize, correct grammar, or change anything. "
            "Capture exactly what is said word for word, especially clinical terms."
        )
    
    data = {
        "model": model,
        "response_format": "json",
        "prompt": prompt,
    }
    
    if lang_code:
        data["language"] = lang_code
    
    try:
        response = await ASYNC_CLIENT.post(url, headers=headers, files=files, data=data, timeout=20.0)
        if response.status_code == 200:
            text = response.json().get("text", "").strip()
            
            # --- Robust Whisper Hallucination Filter ---
            low_text = text.lower().strip()
            
            # Known static templates & noise gibberish phrases
            hallucination_phrases = [
                "thank you for watching", "please subscribe", "transcribed by",
                "subtitles by", "www.youtube", "maria chan", "sub1000",
                "in theado", "do not translate", "not one of critics",
                "bleibt not one", "гл premiere", "stafford", "lender",
                "까ńsk", "licensi", "premier"
            ]
            
            if any(phrase in low_text for phrase in hallucination_phrases):
                print(f"DEBUG: Filtered out static hallucination phrase: '{text}'")
                return ""
                
            # Foreign script checker (Cyrillic, Chinese, Korean which are common in silent noise hallucinations)
            has_cyrillic = any('\u0400' <= char <= '\u04FF' for char in text)
            has_chinese = any('\u4E00' <= char <= '\u9FFF' for char in text)
            has_korean = any('\uAC00' <= char <= '\uD7AF' for char in text)
            
            if has_cyrillic or has_chinese or has_korean:
                print(f"DEBUG: Filtered out foreign script static hallucination: '{text}'")
                return ""
            # --------------------------------------------
            
            return text
        print(f"Groq STT Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Groq STT Request failed: {e}")
    return None


async def process_audio_chunk(audio_bytes: bytes, language: str = "English", verbatim: bool = False) -> str:
    """
    Transcribes audio using Groq Whisper.
    Set verbatim=True to get exact word-for-word transcription like a recorder.
    """
    print(f"Processing audio chunk — model: {'verbatim/turbo' if verbatim else 'medical/v3'}, language: {language}")
    transcription = await try_groq_stt(audio_bytes, language, verbatim=verbatim)

    if transcription:
        return transcription
        
    return ""
