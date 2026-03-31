from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.crud import create_session, get_session_by_id, get_sessions_by_patient_id
from app.database.models import Session as SessionModel
from app.vision.emotion_detector import analyze_emotion
from app.vision.eye_lip_tracker import extract_vision_features
from app.agents.supervisor_agent import run_agentic_workflow
import uuid

router = APIRouter()

class SessionRequest(BaseModel):
    patient_id: int
    symptoms: str
    age: int = 30
    weight: float = 70.0
    image_base64: str  # vision cap

@router.post("/process")
def process_session(req: SessionRequest, db: Session = Depends(get_db)):
    # Vision Module
    emotion = analyze_emotion(req.image_base64)
    features = extract_vision_features(req.image_base64)
    features["emotion"] = emotion
    
    # Agents Workflow
    form_data = {
        "symptoms": req.symptoms,
        "weight": req.weight,
        "age": req.age
    }
    result = run_agentic_workflow(form_data, features)
    
    # Save Session
    session_id = f"sess_{uuid.uuid4().hex[:8]}"
    sess = create_session(
        db=db,
        session_id=session_id,
        patient_id=req.patient_id,
        transcript=[{"role": "bot", "text": "Initial scan completed."}, {"role": "patient", "text": req.symptoms}],
        symptoms=[req.symptoms],
        emotion_metrics=features,
        condition=result["condition"],
        confidence=result["confidence"],
        medication=result["medication"],
        safety=int(result["safety_passed"]),
        distress=False
    )
    
    return {
        "session_id": session_id,
        "symptoms": req.symptoms,
        "vision": features,
        "ai_results": result
    }

@router.get("/list")
def list_sessions(patient_id: int = Query(...), db: Session = Depends(get_db)):
    """List all sessions for a specific patient (used by Mobile App)."""
    sessions = db.query(SessionModel).filter(SessionModel.patient_id == patient_id).order_by(SessionModel.created_at.desc()).all()
    # Format for the app
    return [{
        "session_id": s.session_id,
        "condition": s.predicted_condition,
        "confidence": s.confidence,
        "symptoms": s.symptoms,
        "emotion_metrics": s.emotion_metrics,
        "safety": bool(s.safety_check_passed),
        "created_at": s.created_at,
        "medication": s.medication
    } for s in sessions]

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get detailed session info by ID (used by Mobile App)."""
    s = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    return {
        "session_id": s.session_id,
        "patient_id": s.patient_id,
        "condition": s.predicted_condition,
        "confidence": s.confidence,
        "medication": s.medication,
        "symptoms": s.symptoms,
        "vision": s.emotion_metrics,
        "safety_passed": bool(s.safety_check_passed),
        "created_at": s.created_at
    }
