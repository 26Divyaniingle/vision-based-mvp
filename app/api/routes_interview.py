"""
API Routes for the Real-Time Interview Chatbot.
Handles interview lifecycle: start, answer, vision frames, and completion.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session as DBSession

from app.database.db import get_db
from app.database.crud import create_session
from app.interview.interview_engine import create_interview, get_interview, end_interview
from app.vision.emotion_detector import analyze_emotion
from app.vision.eye_lip_tracker import extract_vision_features
from app.agents.supervisor_agent import run_agentic_workflow

router = APIRouter()


class StartInterviewRequest(BaseModel):
    patient_id: int
    patient_name: str
    age: int = 30
    weight: float = 70.0


class AnswerRequest(BaseModel):
    session_id: str
    answer_text: str
    image_base64: Optional[str] = None  # Optional webcam frame with the answer


class VisionFrameRequest(BaseModel):
    session_id: str
    image_base64: str


class CompleteInterviewRequest(BaseModel):
    session_id: str
    age: int = 30
    weight: float = 70.0


@router.post("/start")
def start_interview(req: StartInterviewRequest):
    """Start a new interview session. Returns the first question."""
    session = create_interview(req.patient_id, req.patient_name)

    first_question = session.get_current_question()

    return {
        "session_id": session.session_id,
        "question": first_question,
        "question_number": 1,
        "total_questions": 9,
        "message": "Interview started successfully. Ask the patient the first question."
    }


@router.post("/answer")
def submit_answer(req: AnswerRequest):
    """
    Submit patient's answer to the current question.
    Optionally include a webcam frame for vision analysis.
    Returns the next question or completion signal.
    """
    session = get_interview(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.completed:
        raise HTTPException(status_code=400, detail="Interview already completed")

    # Process vision frame if provided
    vision_snapshot = None
    if req.image_base64:
        try:
            emotion = analyze_emotion(req.image_base64)
            features = extract_vision_features(req.image_base64)
            features["emotion"] = emotion
            vision_snapshot = features
        except Exception as e:
            print(f"Vision analysis error during answer: {e}")
            vision_snapshot = {"emotion": "neutral", "eye_strain_score": 0.0, "lip_tension": 0.0}

    # Process the answer
    result = session.process_answer(req.answer_text, vision_snapshot)

    # Include vision summary in response
    vision_summary = session.get_vision_summary()

    return {
        "status": result["status"],
        "next_question": result.get("next_question"),
        "question_number": result.get("question_number", session.current_question_index + 1),
        "total_questions": result.get("total_questions", 9),
        "symptoms_detected": session.extracted_symptoms,
        "vision_summary": vision_summary,
        "message": result.get("message", "")
    }


@router.post("/vision_frame")
def submit_vision_frame(req: VisionFrameRequest):
    """
    Submit a webcam frame for continuous vision analysis during the interview.
    This runs asynchronously alongside the Q&A flow.
    """
    session = get_interview(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    try:
        emotion = analyze_emotion(req.image_base64)
        features = extract_vision_features(req.image_base64)
        features["emotion"] = emotion
        session.add_vision_frame(features)
    except Exception as e:
        print(f"Vision frame analysis error: {e}")
        session.add_vision_frame({
            "emotion": "neutral", "eye_strain_score": 0.0, "lip_tension": 0.0
        })

    return {
        "status": "ok",
        "vision_summary": session.get_vision_summary()
    }


@router.post("/complete")
def complete_interview(req: CompleteInterviewRequest, db: DBSession = Depends(get_db)):
    """
    Complete the interview and run the full agentic diagnosis workflow.
    Returns the final diagnosis, medication, and comprehensive analysis.
    """
    session = get_interview(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    # Get full interview summary
    summary = end_interview(req.session_id)
    if not summary:
        raise HTTPException(status_code=500, detail="Failed to generate interview summary")

    vision_summary = summary["vision_summary"]

    # Build form_data from extracted symptoms
    all_symptoms = ", ".join(summary["extracted_symptoms"])

    # Gather medication and allergy info from extractions
    all_medications = []
    all_allergies = []
    lifestyle_factors = []
    for extraction in summary.get("all_extractions", []):
        all_medications.extend(extraction.get("medications_mentioned", []))
        all_allergies.extend(extraction.get("allergies_mentioned", []))
        lifestyle_factors.extend(extraction.get("lifestyle_factors", []))

    form_data = {
        "symptoms": all_symptoms,
        "weight": req.weight,
        "age": req.age,
        "medications": list(set(all_medications)),
        "allergies": list(set(all_allergies)),
        "lifestyle": list(set(lifestyle_factors)),
        "conversation_summary": summary["conversation_history"][-6:]  # Last few exchanges
    }

    # Vision features for the agentic workflow
    vision_features = {
        "emotion": vision_summary.get("dominant_emotion", "neutral"),
        "eye_strain_score": vision_summary.get("avg_eye_strain", 0.0),
        "lip_tension": vision_summary.get("avg_lip_tension", 0.0),
        "emotion_counts": vision_summary.get("emotion_counts", {}),
        "total_frames_analyzed": vision_summary.get("total_frames", 0)
    }

    # Run the existing agentic workflow
    ai_result = run_agentic_workflow(form_data, vision_features)

    # Save session to database
    try:
        db_session = create_session(
            db,
            session.patient_id,
            vision_features["emotion"],
            vision_features,
            ai_result["condition"],
            ai_result["confidence"],
            ai_result["medication"],
            ai_result["safety_passed"]
        )
        session_db_id = db_session.id
    except Exception as e:
        print(f"DB save error: {e}")
        session_db_id = None

    return {
        "session_id": req.session_id,
        "db_session_id": session_db_id,
        "symptoms": all_symptoms,
        "symptoms_list": summary["extracted_symptoms"],
        "vision": vision_features,
        "vision_timeline": vision_summary.get("emotion_timeline", []),
        "ai_results": ai_result,
        "interview_summary": {
            "total_questions": summary["total_questions_asked"],
            "duration_seconds": summary["duration_seconds"],
            "patient_name": summary["patient_name"],
            "allergies": list(set(all_allergies)),
            "current_medications": list(set(all_medications)),
            "lifestyle_factors": list(set(lifestyle_factors))
        }
    }


@router.get("/status/{session_id}")
def get_interview_status(session_id: str):
    """Get the current status of an interview session."""
    session = get_interview(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return {
        "session_id": session.session_id,
        "completed": session.completed,
        "current_question": session.current_question_index + 1,
        "total_questions": 9,
        "symptoms_detected": session.extracted_symptoms,
        "vision_frames_captured": len(session.vision_frames),
        "vision_summary": session.get_vision_summary()
    }
