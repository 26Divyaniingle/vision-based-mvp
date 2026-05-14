from sqlalchemy.orm import Session
from app.database.models import Session as ChatSession, Patient
from app.modules.smart_transcriber.models.transcriber_models import SmartConsultation
import json

class HistoryService:
    """
    Service for retrieving and formatting historical medical data for AI context.
    """

    @staticmethod
    def get_patient_history_summary(db: Session, patient_id: int, limit: int = 5) -> str:
        """
        Retrieves a combined summary of past chatbot sessions and transcriber consultations.
        """
        # 1. Get Chatbot sessions
        chat_sessions = db.query(ChatSession).filter(ChatSession.patient_id == patient_id).order_by(ChatSession.created_at.desc()).limit(limit).all()
        
        # 2. Get Smart Transcriber consultations
        smart_consults = db.query(SmartConsultation).filter(SmartConsultation.patient_id == patient_id).order_by(SmartConsultation.created_at.desc()).limit(limit).all()
        
        history_parts = []
        
        if chat_sessions:
            history_parts.append("### PAST CHATBOT INTERVIEWS:")
            for s in chat_sessions:
                date = s.created_at.strftime("%Y-%m-%d") if s.created_at else "Unknown Date"
                history_parts.append(f"- {date}: Condition: {s.predicted_condition}, Symptoms: {', '.join(s.symptoms if s.symptoms else [])}")
        
        if smart_consults:
            history_parts.append("### PAST DOCTOR CONSULTATIONS (Transcripts):")
            for c in smart_consults:
                date = c.created_at.strftime("%Y-%m-%d") if c.created_at else "Unknown Date"
                history_parts.append(f"- {date}: Summary: {c.summary}")
                history_parts.append(f"  Keywords: {', '.join(c.medical_keywords if c.medical_keywords else [])}")
        
        if not history_parts:
            return "No previous medical history found for this patient."
            
        return "\n".join(history_parts)
