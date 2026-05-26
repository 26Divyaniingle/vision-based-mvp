"""
Authentication API Routes Module
This module handles all user authentication endpoints:
- Face recognition login/registration
- Token-based login
- Password recovery
Users can register and login using their face, which is more secure and user-friendly.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.auth.face_auth import register_face, login_face
from app.auth.token_auth import login_token
from app.auth.recovery_routes import router as recovery_router

# Create an API router for authentication endpoints
router = APIRouter()

# Request models - define what data clients must send

class FaceLoginRequest(BaseModel):
    """Request body for face-based login"""
    image_base64: str  # Base64 encoded image of the user's face

class FaceRegisterRequest(BaseModel):
    """Request body for face-based registration (creating a new account)"""
    name: str  # User's full name
    age: int = 30  # User's age (default 30)
    phone: str = ""  # User's phone number (optional)
    email: str = ""  # User's email (optional)
    image_base64: str  # Base64 encoded image of face for initial registration

class TokenLoginRequest(BaseModel):
    """Request body for token-based login"""
    token: str  # Authentication token

@router.post("/register/face")
def register_with_face(req: FaceRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user with face recognition.
    Takes a photo and creates a new account with facial recognition enabled.
    
    Args:
        req: Registration request with name, age, contact info, and face image
        db: Database session (automatically provided by FastAPI)
        
    Returns:
        Success response with user information if registration succeeds,
        raises HTTP 400 error if registration fails
    """
    res = register_face(db, req.name, req.image_base64, req.age, req.phone, req.email)
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["msg"])
    return res

@router.post("/login/face")
def login_with_face(req: FaceLoginRequest, db: Session = Depends(get_db)):
    """
    Login using face recognition.
    Compares the provided face image with registered faces in the database.
    
    Args:
        req: Login request with face image
        db: Database session
        
    Returns:
        Success response with authentication token if login succeeds,
        raises HTTP 401 error if login fails
    """
    res = login_face(db, req.image_base64)
    if not res["success"]:
        raise HTTPException(status_code=401, detail=res["msg"])
    return res

@router.post("/login/token")
def login_with_token(req: TokenLoginRequest, db: Session = Depends(get_db)):
    """
    Login using a previously issued authentication token.
    This is used for quick login without face recognition.
    
    Args:
        req: Login request with authentication token
        db: Database session
        
    Returns:
        Success response if token is valid,
        raises HTTP 401 error if token is invalid or expired
    """
    res = login_token(db, req.token)
    if not res["success"]:
        raise HTTPException(status_code=401, detail=res["msg"])
    return res

@router.get("/patient/{patient_id}")
def get_patient_status(patient_id: int, db: Session = Depends(get_db)):
    """
    Get the latest patient status (sessionCount, isLocked)
    """
    from app.database.models import Patient
    from app.database.crud import MAX_FREE_SESSIONS
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Auto-unlock user if the limit has increased and they are below the threshold
    if patient.isLocked and patient.sessionCount < MAX_FREE_SESSIONS:
        patient.isLocked = False
        db.commit()
        db.refresh(patient)
        
    return {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "sessionCount": patient.sessionCount,
        "isLocked": patient.isLocked
    }

# Recovery endpoints - sub-router for password reset and OTP verification
router.include_router(recovery_router, prefix="/recovery", tags=["recovery"])
