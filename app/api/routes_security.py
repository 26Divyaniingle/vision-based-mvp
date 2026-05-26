"""
Security Alert API Routes
Provides REST endpoints for:
  - Fetching security alerts per session / patient (dashboard integration)
  - Re-verification endpoint (face re-auth during consultation)
  - Resolving alerts after successful re-verification

This module is completely isolated from all other existing routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.database.db import get_db
from app.database.security_crud import (
    get_alerts_for_session,
    get_alerts_for_patient,
    resolve_security_alert,
    count_unresolved_alerts,
    create_security_alert,
)
from app.database.crud import get_patient_embedding
from app.vision.face_recognition import verify_face

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class ReVerifyRequest(BaseModel):
    """Body sent when the patient attempts re-verification during a consultation."""
    patient_id: int           # Which patient is re-verifying
    session_id: str           # Active session ID
    image_base64: str         # Current selfie captured by the app


class ManualAlertRequest(BaseModel):
    """Allows the WebSocket layer to create an alert record via HTTP (fallback)."""
    session_id: str
    patient_id: int
    similarity_score: float = None
    description: str = "Unauthorized person detected during consultation."


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/alerts/session/{session_id}")
def get_session_alerts(session_id: str, db: DBSession = Depends(get_db)):
    """
    Return all security alerts for a specific consultation session.
    Used by the mobile app to display the security timeline in the dashboard.
    """
    alerts = get_alerts_for_session(db, session_id)
    return {"session_id": session_id, "alerts": [a.to_dict() for a in alerts], "total": len(alerts)}


@router.get("/alerts/patient/{patient_id}")
def get_patient_alerts(
    patient_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    db: DBSession = Depends(get_db),
):
    """
    Return recent security alerts across all sessions for a patient.
    The Dashboard security panel calls this endpoint.
    """
    alerts = get_alerts_for_patient(db, patient_id, limit=limit)
    unresolved_count = sum(1 for a in alerts if not a.resolved)
    return {
        "patient_id": patient_id,
        "alerts": [a.to_dict() for a in alerts],
        "total": len(alerts),
        "unresolved": unresolved_count,
    }


@router.get("/alerts/session/{session_id}/count")
def get_unresolved_count(session_id: str, db: DBSession = Depends(get_db)):
    """
    Return the count of unresolved (active) alerts for a session.
    The WebSocket layer polls this to decide whether to restrict access.
    """
    count = count_unresolved_alerts(db, session_id)
    return {"session_id": session_id, "unresolved_count": count, "restricted": count >= 3}


@router.post("/re-verify")
def re_verify_identity(req: ReVerifyRequest, db: DBSession = Depends(get_db)):
    """
    Re-verification endpoint called when the patient taps "Verify Now" in the alert popup.

    Process:
    1. Fetch the patient's stored face embedding from the DB
    2. Compare it with the image sent from the app
    3. If verified → resolve pending alerts for this session
    4. Return result to the app so it can unlock the consultation

    Returns:
        - verified: True if face matches
        - score: Cosine distance (lower = better match)
        - message: Human-readable result
    """
    print(f"DEBUG: Re-verify request for Patient {req.patient_id}, Session {req.session_id}")
    
    # Step 1: Get reference embedding
    reference_embedding = get_patient_embedding(db, req.patient_id)
    if not reference_embedding:
        print(f"ERROR: Re-verify failed - No reference embedding found for Patient {req.patient_id}")
        raise HTTPException(status_code=404, detail="No face embedding found for this patient.")

    print(f"DEBUG: Loaded reference embedding (length: {len(reference_embedding)})")

    try:
        # Use balanced, highly reliable threshold of 0.48 for manual re-verification
        is_verified, score = verify_face(
            req.image_base64, 
            reference_embedding, 
            enforce_detection=True, 
            threshold=0.48
        )
        print(f"DEBUG: Re-verify result - Verified: {is_verified}, Score: {score:.4f}")
    except Exception as e:
        print(f"ERROR: Re-verify verification logic crashed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")

    if is_verified == True:
        # Step 3: Resolve pending alerts for this session
        resolve_security_alert(db, req.session_id)
        return {
            "verified": True,
            "score": round(float(score), 4),
            "message": "Identity verified. Consultation access restored.",
        }
    elif is_verified is None:
        return {
            "verified": False,
            "score": 0.0,
            "message": "No face detected in the frame. Please look directly at the camera.",
        }
    else:
        # Log the failed re-verification attempt as a new alert
        create_security_alert(
            db=db,
            session_id=req.session_id,
            patient_id=req.patient_id,
            similarity_score=round(float(score), 4),
            alert_type="RE_VERIFY_FAILED",
            description=f"Re-verification failed. Distance score: {score:.4f}",
        )
        return {
            "verified": False,
            "score": round(float(score), 4),
            "message": "Re-verification failed. Face does not match registered account.",
        }


@router.post("/alerts/create")
def create_alert_manually(req: ManualAlertRequest, db: DBSession = Depends(get_db)):
    """
    Manual alert creation endpoint.
    The WebSocket layer calls this to persist alerts to the DB.
    """
    alert = create_security_alert(
        db=db,
        session_id=req.session_id,
        patient_id=req.patient_id,
        similarity_score=req.similarity_score,
        description=req.description,
    )
    return {"success": True, "alert_id": alert.id, "created_at": alert.created_at.isoformat()}


@router.post("/alerts/resolve/{session_id}")
def resolve_alerts(session_id: str, db: DBSession = Depends(get_db)):
    """
    Resolve all pending alerts for a session after manual verification.
    Called by the WebSocket handler when the patient passes re-verification.
    """
    resolved = resolve_security_alert(db, session_id)
    return {"success": resolved, "session_id": session_id, "message": "Alerts resolved." if resolved else "No pending alerts found."}
