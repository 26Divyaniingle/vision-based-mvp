from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.models import Base
import datetime

class SmartConsultation(Base):
    """
    Model for Smart AI Medical Transcriber consultations.
    Stores metadata, speaker-separated transcripts, and medical summaries.
    """
    __tablename__ = "smart_consultations"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, index=True) # Link to patients.id
    session_id = Column(String, unique=True, index=True, nullable=True) # Optional link to existing Session
    
    # Transcription settings
    language = Column(String, default="English")
    transcript = Column(JSON, default=list) # List of dicts: {"speaker": "Doctor/Patient", "text": "...", "timestamp": "..."}
    
    # AI Generated Analysis
    summary = Column(Text, nullable=True)
    symptoms = Column(JSON, default=list)
    medical_keywords = Column(JSON, default=list)
    duration = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "session_id": self.session_id,
            "language": self.language,
            "transcript": self.transcript,
            "summary": self.summary,
            "symptoms": self.symptoms,
            "medical_keywords": self.medical_keywords,
            "duration": self.duration,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
