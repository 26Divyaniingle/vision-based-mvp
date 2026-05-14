from app.core.llm_engine import generate_response
import json
import datetime

class SummaryService:
    """
    Service for generating structured medical summaries from consultation transcripts.
    """

    async def generate_consultation_summary(self, transcript_data: list) -> dict:
        """
        Generates a structured summary including symptoms, keywords, and a narrative summary.
        transcript_data: list of dicts with 'speaker' and 'text'
        """
        if not transcript_data:
            return {
                "summary": "No transcript available.",
                "symptoms": [],
                "medical_keywords": [],
                "duration": "0:00"
            }

        formatted_transcript = "\n".join([f"{m['speaker']}: {m['text']}" for m in transcript_data])
        
        prompt = f"""
        Act as a professional medical scribe. Summarize the following doctor-patient consultation transcript.
        
        Transcript:
        {formatted_transcript}
        
        Provide the output in JSON format with the following keys:
        - "summary": A concise paragraph summarizing the session.
        - "symptoms": A list of specific symptoms mentioned by the patient.
        - "medical_keywords": A list of relevant medical terms or suspected conditions.
        - "duration_estimate": Estimate of conversation length based on text.
        
        Only return the JSON.
        """
        
        response = await generate_response(prompt)
        try:
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx != -1 and end_idx != -1:
                analysis = json.loads(response[start_idx:end_idx])
                return {
                    "summary": analysis.get("summary", ""),
                    "symptoms": analysis.get("symptoms", []),
                    "medical_keywords": analysis.get("medical_keywords", []),
                    "duration": analysis.get("duration_estimate", "Unknown")
                }
        except Exception as e:
            print(f"Error parsing summary JSON: {e}")
            
        return {
            "summary": "Failed to generate summary.",
            "symptoms": [],
            "medical_keywords": [],
            "duration": "Unknown"
        }

    def format_for_rag(self, consultation_id: int, summary_data: dict) -> str:
        """
        Formats the summary for indexing into the RAG system.
        """
        return f"Consultation Report #{consultation_id}\n" \
               f"Summary: {summary_data['summary']}\n" \
               f"Symptoms: {', '.join(summary_data['symptoms'])}\n" \
               f"Keywords: {', '.join(summary_data['medical_keywords'])}"
