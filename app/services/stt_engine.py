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

async def process_audio_chunk(audio_bytes: bytes, language: str = "English") -> str:
    """
    Transcribes audio using Google Gemini 1.5 Flash's multimodal capabilities.
    Gemini supports audio input directly and provides excellent contextual accuracy.
    """
    if not settings.GEMINI_API_KEY:
        return "Audio received but GEMINI_API_KEY is not set."

    model = genai.GenerativeModel("models/gemini-flash-latest")
    
    try:
        # Create temporary file to store audio for Gemini consumption
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            tmp_name = f.name
            
        # Upload file to Gemini (using the modern GenAI File API approach)
        # For small chunks, we can pass them as a list of parts [text, {'mime_type': '...', 'data': ...}]
        # but temporary file is safer for varied webm containers.
        
        # Determine prompt based on language
        prompt = f"Transcribe the following audio precisely. The patient is speaking in {language}."
        if language == "Hinglish":
            prompt = "Transcribe the following audio. The patient is speaking a mix of Hindi and English (Hinglish). Provide the output in Roman script."

        # Process the audio directly with the model
        # Note: We use a simple part-based approach for the flash model
        response = model.generate_content([
            prompt,
            {
                "mime_type": "audio/webm",
                "data": audio_bytes
            }
        ])
        
        # Cleanup
        if os.path.exists(tmp_name):
            os.remove(tmp_name)
            
        return response.text.strip()
        
    except Exception as e:
        if 'tmp_name' in locals() and os.path.exists(tmp_name):
            os.remove(tmp_name)
        print(f"Gemini STT Error: {e}")
        # Basic fallback to empty string so the conversation doesn't break
        return ""
