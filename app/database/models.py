from sqlalchemy import Column, Integer, String, Text, Float, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    age = Column(Integer, default=30)
    phone = Column(String, default="")
    email = Column(String, default="")
    token = Column(String, unique=True, index=True)
    face_embedding = Column(Text) # JSON string of list of floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    patient_id = Column(Integer)
    
    transcript = Column(JSON, default=list) # Full conversation history
    symptoms = Column(JSON, default=list) # Extracted symptoms array
    emotion_metrics = Column(JSON, default=dict) # Aggregated webcam metrics
    
    predicted_condition = Column(String)
    confidence = Column(Float)
    medication = Column(String)
    safety_check_passed = Column(Integer, default=1)
    distress_detected = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

