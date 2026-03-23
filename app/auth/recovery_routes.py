from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.auth.otp_service import send_recovery_otp, verify_otp
from app.auth.token_reset import hash_token
from app.database.crud import get_patient_by_email, reset_hashed_token
from datetime import datetime, timezone

router = APIRouter()

from typing import Optional
from app.vision.face_recognition import get_face_embedding
import json

class ForgotTokenRequest(BaseModel):
    email: EmailStr

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetTokenRequest(BaseModel):
    email: EmailStr
    new_token: str
    image_base64: Optional[str] = None

@router.post("/forgot-token")
def forgot_token(req: ForgotTokenRequest, db: Session = Depends(get_db)):
    patient = get_patient_by_email(db, req.email)
    if not patient:
        raise HTTPException(404, "Account with this email does not exist.")
    if send_recovery_otp(db, req.email):
        return {"success": True, "msg": "Recovery OTP sent to your email. Expires in 5 min."}
    raise HTTPException(500, "Failed to send email. Check SMTP credentials.")

@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    if verify_otp(db, req.email, req.otp):
        return {"success": True, "msg": "OTP verified. You can now reset token."}
    raise HTTPException(400, "Invalid or expired OTP. Max attempts exceeded?")

@router.post("/reset-token")
def reset_token(req: ResetTokenRequest, db: Session = Depends(get_db)):
    patient = get_patient_by_email(db, req.email)
    if not patient:
        raise HTTPException(404, "Patient not found.")
    
    # Verify OTP still valid? Assume called after verify, but check expiry
    if patient.otp_expiry and patient.otp_expiry < datetime.utcnow():
        raise HTTPException(400, "OTP expired.")
    
    hashed = hash_token(req.new_token)
    
    face_embedding_str = None
    if req.image_base64:
        emb = get_face_embedding(req.image_base64)
        if not emb:
            raise HTTPException(400, "No face detected in the retaken image.")
        face_embedding_str = json.dumps(emb)
        
    reset_hashed_token(db, patient.id, hashed, face_embedding_str)
    return {"success": True, "msg": "Token and/or Face reset successfully. Use your new token/face to login."}

