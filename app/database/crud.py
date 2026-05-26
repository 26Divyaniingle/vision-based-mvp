"""
CRUD Operations Module
This file contains all database query functions (Create, Read, Update, Delete).
It handles patient management, session management, and authentication-related queries.
CRUD = Create, Read, Update, Delete - the basic database operations.
"""

from sqlalchemy.orm import Session
from .models import Patient, Session as SessionModel  # Database models
from typing import List
from app.auth.token_reset import hash_token, verify_token  # Token hashing functions
from datetime import datetime, timezone

# --- Usage Limits Configuration ---
MAX_FREE_SESSIONS = 15
# ----------------------------------

def get_patient_by_token(db: Session, plain_token: str):
    patients = db.query(Patient).all()
    for patient in patients:
        if patient.hashed_token and verify_token(plain_token, patient.hashed_token):
            return patient
    # Legacy fallback if hashed not set
    return db.query(Patient).filter(Patient.token == plain_token).first()

def create_patient(db: Session, name: str, token: str, embedding_str: str, age: int = 30, phone: str = "", email: str = ""):
    hashed = hash_token(token)
    db_patient = Patient(name=name, age=age, phone=phone, email=email, token=token, face_embedding=embedding_str, hashed_token=hashed)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_all_patients(db: Session) -> List[Patient]:
    return db.query(Patient).all()

def create_session(db: Session, session_id: str, patient_id: int, transcript: list, symptoms: list, emotion_metrics: dict, condition: str, confidence: float, medication: str, safety: int, distress: bool, is_serious: bool = False):
    new_sess = SessionModel(
        session_id=session_id,
        patient_id=patient_id, 
        transcript=transcript, 
        symptoms=symptoms, 
        emotion_metrics=emotion_metrics,
        predicted_condition=condition,
        confidence=confidence, 
        medication=medication, 
        safety_check_passed=safety,
        distress_detected=distress,
        is_serious=is_serious
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return new_sess


def get_patient_by_email(db: Session, email: str):
    return db.query(Patient).filter(Patient.email == email).first()

def update_otp(db: Session, patient_id: int, otp: str, expiry):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.otp_code = otp
        patient.otp_expiry = expiry
        patient.otp_attempts = 0
        db.commit()
        db.refresh(patient)
        return True
    return False

def verify_and_clear_otp(db: Session, patient_id: int, otp_input: str) -> bool:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if (patient and 
        patient.otp_code == otp_input and 
        patient.otp_expiry and 
        patient.otp_expiry > datetime.utcnow()):
        patient.otp_code = None
        patient.otp_expiry = None
        patient.otp_attempts = 0
        db.commit()
        return True
    return False

def increment_otp_attempts(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.otp_attempts += 1
        db.commit()

def reset_hashed_token(db: Session, patient_id: int, hashed_token: str, face_embedding_str: str = None):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.hashed_token = hashed_token
        if face_embedding_str:
            patient.face_embedding = face_embedding_str
        db.commit()
        db.refresh(patient)
        return True
    return False
def get_session_by_id(db: Session, session_id: str):
    return db.query(SessionModel).filter(SessionModel.session_id == session_id).first()

def get_sessions_by_patient_id(db: Session, patient_id: int):
    return db.query(SessionModel).filter(SessionModel.patient_id == patient_id).order_by(SessionModel.created_at.desc()).all()

def get_patient_embedding(db: Session, patient_id: int) -> list:
    """Fetch the face embedding for a patient and return as a list."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient and patient.face_embedding:
        import json
        try:
            return json.loads(patient.face_embedding)
        except Exception:
            return []
    return []

def increment_session_count(db: Session, patient_id: int):
    """
    Increments the session count for a patient.
    If the count reaches 2, the account is automatically locked.
    Uses atomic update to avoid race conditions.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.sessionCount += 1
        if patient.sessionCount >= MAX_FREE_SESSIONS:
            patient.isLocked = True
        db.commit()
        db.refresh(patient)
        return patient
    return None

def reset_user_access(db: Session, patient_id: int):
    """
    Resets the session count and unlocks the account.
    Used by administrators to restore access.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        patient.sessionCount = 0
        patient.isLocked = False
        db.commit()
        db.refresh(patient)
        return True
    return False

def check_session_limit(db: Session, patient_id: int) -> dict:
    """
    Checks if a patient is allowed to start a new session.
    Returns a dict with 'allowed' (bool) and 'message' (str).
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"allowed": False, "message": "Patient not found."}
    
    # If the limit has increased but the user was previously locked at a lower limit,
    # dynamically unlock them if they haven't reached the new limit yet!
    if patient.isLocked and patient.sessionCount < MAX_FREE_SESSIONS:
        patient.isLocked = False
        db.commit()
        db.refresh(patient)
    
    if patient.isLocked:
        return {"allowed": False, "message": f"Free consultation limit ({MAX_FREE_SESSIONS}) reached. Please contact administrator."}
    
    if patient.sessionCount >= MAX_FREE_SESSIONS:
        # Safety check: ensure isLocked is sync'd
        patient.isLocked = True
        db.commit()
        return {"allowed": False, "message": f"Free consultation limit ({MAX_FREE_SESSIONS}) reached. Please contact administrator."}
    
    return {"allowed": True, "remaining": MAX_FREE_SESSIONS - patient.sessionCount}
