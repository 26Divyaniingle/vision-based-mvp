import os
import httpx
from app.config import settings
from app.services.stt_engine import try_groq_stt
from app.core.llm_engine import generate_response
import json

class TranscriptionService:
    """
    Service for handling audio transcription and speaker identification.
    
    Two modes:
      verbatim=True  → Pure STT output, no LLM rewriting. Exactly what was spoken.
      verbatim=False → LLM post-processing: speaker ID + Hinglish standardization.
    """
    
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)

    async def process_transcription_segment(
        self,
        audio_bytes: bytes,
        recent_history: list,
        language: str = "Hinglish",
        verbatim: bool = False
    ) -> dict:
        """
        Processes one audio chunk.

        verbatim=True:
            - Calls Groq Whisper (whisper-large-v3-turbo) with a neutral prompt.
            - Returns the raw text exactly as spoken. No LLM involved.
            - Speaker is always 'Speaker' (no identification in this mode).

        verbatim=False:
            - Calls Groq Whisper (whisper-large-v3) with a medical prompt.
            - Then sends through LLM for speaker attribution + Hinglish standardization.
        """
        # Step 1: Run STT
        raw_text = await try_groq_stt(audio_bytes, language, verbatim=verbatim)
        if not raw_text or len(raw_text.strip()) < 2:
            return None

        # ── VERBATIM MODE: Keep raw text 100% exact, but run LLM solely to identify the speaker ──
        if verbatim:
            history_str = "\n".join([
                f"{m.get('speaker', 'Unknown')}: {m.get('text', '')}"
                for m in recent_history[-8:]
            ])
            
            prompt = f"""
            Role: Expert Medical Scribe.
            Task: Classify the speaker of the new segment based on the conversation history.
            
            Rules:
            - Analyze the new segment and decide if the speaker is "Doctor" or "Patient".
            - Output MUST be JSON: {{"speaker": "Doctor"|"Patient"}}
            - Do NOT transcribe, rewrite, or change anything in the text. Only identify the speaker.
            
            Recent History:
            {history_str}
            
            NEW SEGMENT: "{raw_text}"
            
            JSON Result:
            """
            
            speaker = "Doctor"
            try:
                response = await generate_response(prompt)
                start_idx = response.find('{')
                end_idx = response.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    data = json.loads(response[start_idx:end_idx])
                    speaker = data.get("speaker", "Doctor")
            except Exception as e:
                print(f"Verbatim speaker identification error: {e}")
                
            return {
                "speaker": speaker,
                "text": raw_text,
                "raw": True
            }

        # ── MEDICAL MODE: Run LLM for speaker ID + Hinglish standardization ───
        history_str = "\n".join([
            f"{m.get('speaker', 'Unknown')}: {m.get('text', '')}"
            for m in recent_history[-8:]
        ])
        
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
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                data = json.loads(response[start_idx:end_idx])
                return {
                    "speaker": data.get("speaker", "Doctor"),
                    "text": data.get("text", raw_text),
                    "raw": False
                }
        except Exception:
            pass
            
        # Fallback if LLM fails
        return {"speaker": "Doctor", "text": raw_text, "raw": False}

    async def diarize_full_transcript(self, raw_transcript: list) -> list:
        """
        Take a list of raw text segments and attribute speakers to all of them in one go.
        Used only in medical (non-verbatim) mode during finalization.
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
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            if start_idx != -1 and end_idx != -1:
                speakers = json.loads(response[start_idx:end_idx])
                return speakers
        except Exception:
            pass
        return ["Unknown"] * len(raw_transcript)
