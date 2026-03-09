from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.crud import create_session
from app.vision.emotion_detector import analyze_emotion
from app.vision.eye_lip_tracker import extract_vision_features
from app.agents.supervisor_agent import run_agentic_workflow

router = APIRouter()

class SessionRequest(BaseModel):
    patient_id: int
    symptoms: str
    weight: float
    age: int
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
    sess = create_session(
        db, req.patient_id, emotion, features,
        result["condition"], result["confidence"], result["medication"], result["safety_passed"]
    )
    
    return {
        "session_id": sess.id,
        "symptoms": req.symptoms,
        "vision": features,
        "ai_results": result
    }
