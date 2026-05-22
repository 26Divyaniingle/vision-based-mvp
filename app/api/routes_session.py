from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.crud import create_session, get_session_by_id, get_sessions_by_patient_id, check_session_limit, increment_session_count
from app.database.models import Session as SessionModel
from app.vision.emotion_detector import analyze_emotion
from app.vision.eye_lip_tracker import extract_vision_features
from app.agents.supervisor_agent import run_agentic_workflow
import uuid
import json

router = APIRouter()

class SessionRequest(BaseModel):
    patient_id: int
    symptoms: str
    age: int = 30
    weight: float = 70.0
    image_base64: str  # vision cap

@router.post("/process")
async def process_session(req: SessionRequest, db: Session = Depends(get_db)):
    # 1. Check Usage Limit
    limit_status = check_session_limit(db, req.patient_id)
    if not limit_status["allowed"]:
        raise HTTPException(
            status_code=403, 
            detail={
                "error": "ACCESS_LOCKED",
                "message": limit_status["message"],
                "admin_email": "medsense.ai@gmail.co"
            }
        )
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
    result = await run_agentic_workflow(form_data, features)
    
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
        medication=json.dumps(result["medication"]),
        safety=int(result["safety_passed"]),
        distress=False
    )
    
    # 2. Increment Session Count (only after successful initialization/start)
    patient = increment_session_count(db, req.patient_id)
    remaining = 15 - patient.sessionCount if patient else 0
    
    return {
        "session_id": session_id,
        "symptoms": req.symptoms,
        "vision": features,
        "ai_results": result,
        "remaining_sessions": remaining
    }

@router.get("/list")
def list_sessions(patient_id: int = Query(...), db: Session = Depends(get_db)):
    """List all sessions for a specific patient (used by Mobile App)."""
    sessions = db.query(SessionModel).filter(SessionModel.patient_id == patient_id).order_by(SessionModel.created_at.desc()).all()
    
    def safe_parse_medication(med_str):
        if not med_str:
            return {"allopathic": [], "ayurvedic": [], "prevention": []}
        try:
            return json.loads(med_str)
        except Exception:
            # Fallback if it was saved as a Python string representation or is corrupt
            try:
                # Basic attempt to fix single quotes if it's a python dict literal
                return json.loads(med_str.replace("'", '"'))
            except Exception:
                return {"allopathic": [], "ayurvedic": [], "prevention": [], "raw": med_str}

    return [{
        "session_id": s.session_id,
        "condition": s.predicted_condition,
        "confidence": s.confidence,
        "symptoms": s.symptoms,
        "emotion_metrics": s.emotion_metrics,
        "safety_passed": bool(s.safety_check_passed),
        "is_serious": bool(s.is_serious),
        "created_at": s.created_at,
        "medication": safe_parse_medication(s.medication)
    } for s in sessions]

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get detailed session info by ID (used by Mobile App)."""
    s = db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
        
    def safe_parse_medication(med_str):
        if not med_str:
            return {"allopathic": [], "ayurvedic": [], "prevention": []}
        try:
            return json.loads(med_str)
        except Exception:
            try:
                return json.loads(med_str.replace("'", '"'))
            except Exception:
                return {"allopathic": [], "ayurvedic": [], "prevention": [], "raw": med_str}

    return {
        "session_id": s.session_id,
        "patient_id": s.patient_id,
        "condition": s.predicted_condition,
        "confidence": s.confidence,
        "medication": safe_parse_medication(s.medication),
        "symptoms": s.symptoms,
        "vision": s.emotion_metrics,
        "safety_passed": bool(s.safety_check_passed),
        "is_serious": bool(s.is_serious),
        "created_at": s.created_at
    }

