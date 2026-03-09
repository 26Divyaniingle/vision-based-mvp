from sqlalchemy.orm import Session
from .models import Patient, Session as SessionModel
from typing import List

def get_patient_by_token(db: Session, token: str):
    return db.query(Patient).filter(Patient.token == token).first()

def create_patient(db: Session, name: str, token: str, embedding_str: str, age: int = 30, phone: str = "", email: str = ""):
    db_patient = Patient(name=name, age=age, phone=phone, email=email, token=token, face_embedding=embedding_str)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_all_patients(db: Session) -> List[Patient]:
    return db.query(Patient).all()

def create_session(db: Session, session_id: str, patient_id: int, transcript: list, symptoms: list, emotion_metrics: dict, condition: str, confidence: float, medication: str, safety: int, distress: bool):
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
        distress_detected=distress
    )
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return new_sess

