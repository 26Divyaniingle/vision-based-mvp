import secrets
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database.crud import get_patient_by_email, increment_otp_attempts, verify_and_clear_otp, update_otp
from app.reports.email_service import send_otp_email

OTP_EXPIRY_MINUTES = 5
MAX_OTP_ATTEMPTS = 5

def generate_otp() -> str:
    """Generate secure 6-digit OTP."""
    return str(random.randint(100000, 999999))

def send_recovery_otp(db: Session, email: str) -> bool:
    """Send OTP to patient email. Returns True if sent."""
    patient = get_patient_by_email(db, email)
    if not patient:
        return False
    
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    # Update DB
    if update_otp(db, patient.id, otp, expiry):
        # Send email
        return send_otp_email(email, otp, patient.name)
    return False

def verify_otp(db: Session, email: str, otp_input: str) -> bool:
    """Verify OTP, increment attempts, clear on success. Returns True if valid."""
    patient = get_patient_by_email(db, email)
    if not patient:
        return False
    
    if patient.otp_attempts >= MAX_OTP_ATTEMPTS:
        return False
    
    if verify_and_clear_otp(db, patient.id, otp_input):
        return True
    
    # Failed
    increment_otp_attempts(db, patient.id)
    return False

