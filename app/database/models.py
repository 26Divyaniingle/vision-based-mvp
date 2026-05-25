"""
Database Models
This file defines the database schema using SQLAlchemy ORM.
It stores data about patients and their medical consultation sessions.
"""

from sqlalchemy import Column, Integer, String, Text, Float, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
import datetime

# Create the base class for all database models
Base = declarative_base()

class Patient(Base):
    """
    Patient model - stores information about each patient who uses the system.
    Each patient can have multiple medical consultation sessions.
    """
    __tablename__ = "patients"
    
    # Primary key - unique identifier for each patient
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic patient information
    name = Column(String, index=True)  # Patient's full name
    age = Column(Integer, default=30)  # Patient's age
    phone = Column(String, default="")  # Patient's phone number
    email = Column(String, default="")  # Patient's email for report delivery
    
    # Authentication and face recognition
    token = Column(String, unique=True, index=True)  # Unique registration token
    face_embedding = Column(Text)  # Face recognition embedding (stored as JSON string)
    
    # OTP (One Time Password) for additional security
    hashed_token = Column(String, nullable=True)  # Hashed verification token
    otp_code = Column(String, nullable=True)  # One-time password for login
    otp_expiry = Column(DateTime, nullable=True)  # When the OTP expires
    otp_attempts = Column(Integer, default=0)  # Number of OTP verification attempts
    
    # Usage Limiting
    sessionCount = Column(Integer, default=0)  # Number of AI consultation sessions used
    isLocked = Column(Boolean, default=False)  # Whether the account is locked due to limit reached

    # Metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Account creation timestamp

class Session(Base):
    """
    Session model - stores information about each medical consultation session.
    A session is one complete medical interview from start to diagnosis and prescription.
    """
    __tablename__ = "sessions"
    
    # Primary key - unique identifier for each session
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys and identifiers
    session_id = Column(String, unique=True, index=True)  # Unique session identifier
    patient_id = Column(Integer)  # Link to the patient who had this session
    
    # Interview data - conversation and symptoms
    transcript = Column(JSON, default=list)  # Full conversation history (list of messages)
    symptoms = Column(JSON, default=list)  # Extracted symptoms from conversation
    emotion_metrics = Column(JSON, default=dict)  # Emotion analysis from webcam during session
    
    # Medical diagnosis and treatment
    predicted_condition = Column(String)  # AI-predicted medical condition/disease
    confidence = Column(Float)  # Confidence score of the diagnosis (0-1)
    medication = Column(String)  # Recommended medications and remedies
    safety_check_passed = Column(Integer, default=1)  # Whether medication passed safety checks
    distress_detected = Column(Boolean, default=False)  # Was patient distress detected during interview
    is_serious = Column(Boolean, default=False)  # Whether the case requires immediate clinical care

    
    # Metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Session start timestamp

# NEW FEATURE MODELS (Imported to register with Base)
try:
    from app.modules.smart_transcriber.models.transcriber_models import SmartConsultation
except ImportError:
    pass


