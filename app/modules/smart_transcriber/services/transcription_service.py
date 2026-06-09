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
        self.api_key = settings.groq_api_key
        self.client = httpx.AsyncClient(timeout=30.0)

    async def process_transcription_segment(
        self,
        audio_bytes: bytes,
        recent_history: list,
        language: str = "Hinglish",
        verbatim: bool = False
    ) -> dict:
        """
        Processes one audio chunk from the Smart AI Transcriber.
        Ensures exact transcription (word-for-word) like the consultation STT,
        while using context-aware LLM analysis to identify the speaker (Doctor vs Patient).
        """
        # Step 1: Run STT using our highly accurate whisper-large-v3 model
        raw_text = await try_groq_stt(audio_bytes, language, verbatim=True)
        if not raw_text or len(raw_text.strip()) < 2:
            return None

        # Step 2: Build conversation history context
        history_str = "\n".join([
            f"{m.get('speaker', 'Unknown')}: {m.get('text', '')}"
            for m in recent_history[-8:]
        ])
        
        # Step 3: Call LLM strictly for context-based speaker diarization
        prompt = f"""
        You are an expert clinical scribe. Analyze the NEW SEGMENT of a medical consultation and classify whether the speaker is the "Doctor" or the "Patient".

        Context-Based Classification Rules:
        1. DOCTOR: Typically greets the patient, asks questions about symptoms, inquires about history, explains diagnosis, gives instructions, or explains prescriptions.
           Examples: "Aapko kya takleef hai?", "Headache kab se hai?", "Ye medicine din me do baar leni hai."
        2. PATIENT: Typically answers questions, describes symptoms, pain, feelings, or daily habits.
           Examples: "Mujhe kal se bukhar hai", "Nahi, checkup nahi kiya", "Headache bahut zyada hai."
        3. CONVERSATIONAL FLOW: Use the Recent History to trace the dialogue turn-taking (e.g., a question from the Doctor is usually followed by a response from the Patient).

        Guidelines:
        - You MUST NOT change, edit, summarize, or transcribe the text.
        - Output MUST be a clean JSON object with exactly one key: "speaker".
        - The value of "speaker" must be either "Doctor" or "Patient".

        Recent History:
        {history_str}

        NEW SEGMENT TO CLASSIFY: "{raw_text}"

        JSON Output:
        """
        
        speaker = "Doctor" # Default fallback
        try:
            response = await generate_response(prompt)
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                data = json.loads(response[start_idx:end_idx])
                speaker = data.get("speaker", "Doctor")
        except Exception as e:
            print(f"Speaker identification error: {e}")
            
        # Return exact words and sentences exactly as spoken
        return {
            "speaker": speaker,
            "text": raw_text,
            "raw": verbatim
        }

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
