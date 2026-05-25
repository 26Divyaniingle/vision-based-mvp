import os
import httpx
from app.config import settings
from app.services.stt_engine import try_groq_stt
from app.core.llm_engine import generate_response
import json

class TranscriptionService:
    """
    Service for handling audio transcription and speaker identification.
    Uses Groq Whisper-v3 for fast STT and LLM for speaker attribution.
    """
    
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)

    async def process_transcription_segment(self, audio_bytes: bytes, recent_history: list, language: str = "Hinglish") -> dict:
        """
        Processes audio in a single optimized pass: STT + (Hinglish/Speaker LLM).
        Returns a dict with 'speaker' and 'text'.
        """
        # 1. Primary STT (Fast)
        raw_text = await try_groq_stt(audio_bytes, language)
        if not raw_text or len(raw_text.strip()) < 2:
            return None
            
        # 2. Combined Analysis (One API call instead of two)
        history_str = "\n".join([f"{m.get('speaker', 'Unknown')}: {m.get('text', '')}" for m in recent_history[-8:]])
        
        prompt = f"""
        Role: Expert Medical Scribe.
        Task: Standardize the input and identify the speaker.
        
        Rules:
        - Output MUST be JSON: {{"speaker": "Doctor"|"Patient", "text": "Hinglish text"}}
        - 'text' must be in Latin-script Hinglish (Romanized). 
        - Remove any 'Doctor:' or 'Patient:' labels from 'text'.
        - If input is Marathi/Hindi/English, convert to Hinglish.
        
        Recent History:
        {history_str}
        
        NEW SEGMENT: "{raw_text}"
        
        JSON Result:
        """
        
        response = await generate_response(prompt)
        try:
            # Parse JSON from LLM
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                data = json.loads(response[start_idx:end_idx])
                return {
                    "speaker": data.get("speaker", "Doctor"),
                    "text": data.get("text", raw_text)
                }
        except:
            pass
            
        # Very simple fallback if LLM fails
        return {"speaker": "Doctor", "text": raw_text}

    async def diarize_full_transcript(self, raw_transcript: list) -> list:
        """
        Take a list of raw text segments and attribute speakers to all of them in one go.
        """
        if not raw_transcript:
            return []
            
        combined_text = "\n".join([f"Segment {i}: {txt}" for i, txt in enumerate(raw_transcript)])
        
        prompt = f"""
        Attribute speakers (Doctor or Patient) to each segment in this medical consultation transcript.
        
        Transcript:
        {combined_text}
        
        Return a JSON list of speaker names in order. Example: ["Doctor", "Patient", "Doctor"]
        """
        
        response = await generate_response(prompt)
        try:
            # Try to find JSON in response
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            if start_idx != -1 and end_idx != -1:
                speakers = json.loads(response[start_idx:end_idx])
                return speakers
        except:
            pass
        return ["Unknown"] * len(raw_transcript)
