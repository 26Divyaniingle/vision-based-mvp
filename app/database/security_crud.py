"""
Security Alert CRUD Operations
Isolated module for reading/writing security alert records.
Does NOT touch existing CRUD operations or any other models.
"""

from sqlalchemy.orm import Session as DBSession
from app.database.security_models import SecurityAlert
from typing import List, Optional
import datetime


def create_security_alert(
    db: DBSession,
    session_id: str,
    patient_id: int,
    similarity_score: float = None,
    alert_type: str = "FACE_MISMATCH",
    description: str = "Unauthorized person detected during consultation.",
) -> SecurityAlert:
    """
    Insert a new security alert record when a face mismatch is detected.
    
    Args:
        db: Database session
        session_id: Active consultation session identifier
        patient_id: The authenticated patient's database ID
        similarity_score: Cosine distance score (lower = more similar)
        alert_type: Category of security event
        description: Human-readable description
    
    Returns:
        The newly created SecurityAlert ORM object
    """
    alert = SecurityAlert(
        session_id=session_id,
        patient_id=patient_id,
        similarity_score=similarity_score,
        alert_type=alert_type,
        description=description,
    )
    try:
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert
    except Exception as e:
        db.rollback()
        print(f"Error creating security alert: {e}")
        return alert


def get_alerts_for_session(db: DBSession, session_id: str) -> List[SecurityAlert]:
    """
    Fetch all security alerts for a given session, ordered by time ascending.
    
    Args:
        db: Database session
        session_id: The session ID to look up
    
    Returns:
        List of SecurityAlert objects
    """
    return (
        db.query(SecurityAlert)
        .filter(SecurityAlert.session_id == session_id)
        .order_by(SecurityAlert.created_at.asc())
        .all()
    )


def get_alerts_for_patient(db: DBSession, patient_id: int, limit: int = 20) -> List[SecurityAlert]:
    """
    Fetch recent security alerts for a patient across all their sessions.
    
    Args:
        db: Database session
        patient_id: The patient's database ID
        limit: Maximum number of alerts to return
    
    Returns:
        List of SecurityAlert objects (newest first)
    """
    return (
        db.query(SecurityAlert)
        .filter(SecurityAlert.patient_id == patient_id)
        .order_by(SecurityAlert.created_at.desc())
        .limit(limit)
        .all()
    )


def resolve_security_alert(db: DBSession, session_id: str) -> bool:
    """
    Mark all unresolved alerts for a session as resolved (after successful re-verification).
    
    Args:
        db: Database session
        session_id: The session whose alerts should be resolved
    
    Returns:
        True if any records were updated, False otherwise
    """
    now = datetime.datetime.utcnow()
    updated = (
        db.query(SecurityAlert)
        .filter(
            SecurityAlert.session_id == session_id,
            SecurityAlert.resolved == False,
        )
        .all()
    )
    if not updated:
        return False
    try:
        for alert in updated:
            alert.resolved = True
            alert.re_verified_at = now
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error resolving security alerts: {e}")
    return True


def count_unresolved_alerts(db: DBSession, session_id: str) -> int:
    """
    Count how many unresolved face-mismatch alerts exist for a given session.
    Used by the backend to decide whether to block consultation access.
    
    Args:
        db: Database session
        session_id: Session to check
    
    Returns:
        Integer count of unresolved alerts
    """
    return (
        db.query(SecurityAlert)
        .filter(
            SecurityAlert.session_id == session_id,
            SecurityAlert.resolved == False,
        )
        .count()
    )
