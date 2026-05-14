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

    async def transcribe_audio(self, audio_bytes: bytes, language: str = "English") -> str:
        """
        Transcribe audio bytes using Groq Whisper.
        """
        return await try_groq_stt(audio_bytes, language)

    async def identify_speaker_contextually(self, current_segment: str, recent_history: list) -> str:
        """
        Heuristically or via LLM identify if the speaker is Doctor or Patient.
        """
        if not current_segment:
            return "Unknown"
            
        history_str = "\n".join([f"{m.get('speaker', 'Unknown')}: {m.get('text', '')}" for m in recent_history[-5:]])
        
        prompt = f"""
        You are a medical scribe. Your task is to identify the SPEAKER of a new segment in a consultation.
        The speakers are either "Doctor" or "Patient".
        
        CONTEXT RULES:
        - DOCTOR: Asks about symptoms, gives instructions, explains diagnosis, asks "How are you?", "Since when?", etc.
        - PATIENT: Answers questions, describes pain, mentions feelings, says "Yes", "No" to medical questions, describes history.
        - If the segment is extremely short (e.g., "Yes", "Okay"), look at the history to see who was asking a question.
        
        Recent History:
        {history_str}
        
        New Segment to Identify: "{current_segment}"
        
        Identify the speaker. Return ONLY the word: "Doctor" or "Patient".
        """
        
        speaker = await generate_response(prompt)
        # Clean up response
        speaker = speaker.strip().replace('"', '').replace('.', '')
        if "doctor" in speaker.lower(): return "Doctor"
        if "patient" in speaker.lower(): return "Patient"
        return "Unknown"

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
