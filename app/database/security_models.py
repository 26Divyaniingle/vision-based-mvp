"""
Security Alert Database Model
Stores facial identity mismatch events and security flags for consultation sessions.
This is an isolated, additive model that does not modify existing tables.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from app.database.models import Base  # Reuse same base to share DB engine
import datetime


class SecurityAlert(Base):
    """
    Stores each identity mismatch event that occurs during a consultation session.
    One session may have multiple alerts if the mismatch is detected repeatedly.
    """
    __tablename__ = "security_alerts"

    id = Column(Integer, primary_key=True, index=True)

    # Session & patient identifiers
    session_id = Column(String, index=True, nullable=False)   # Links to the active consultation session
    patient_id = Column(Integer, index=True, nullable=False)  # Patient who owns the session

    # Mismatch details
    similarity_score = Column(Float, nullable=True)           # Cosine distance at moment of alert (lower = more alike)
    alert_type = Column(String, default="FACE_MISMATCH")      # Type of security event
    description = Column(Text, default="Unauthorized person detected during consultation.")

    # Control & resolution
    resolved = Column(Boolean, default=False)                 # Did the patient successfully re-verify?
    re_verified_at = Column(DateTime, nullable=True)          # Timestamp of successful re-verification

    # Timestamp
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "patient_id": self.patient_id,
            "similarity_score": self.similarity_score,
            "alert_type": self.alert_type,
            "description": self.description,
            "resolved": self.resolved,
            "re_verified_at": self.re_verified_at.isoformat() if self.re_verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
