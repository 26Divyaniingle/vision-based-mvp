"""
Token Authentication Module
This module handles user login using authentication tokens.
Tokens are issued during registration or password reset.
Users can login quickly by providing their token without needing face recognition.
"""

from app.database.crud import get_patient_by_token
from sqlalchemy.orm import Session

def login_token(db: Session, plain_token: str):
    """
    Login a user by providing their authentication token.
    This is a quick login method that doesn't require face recognition.
    
    Args:
        db: Database session
        plain_token: The user's authentication token (plain text)
        
    Returns:
        Dictionary with:
        - success: True if token is valid
        - name: User's name
        - id: User's database ID
        - token: The authentication token
        OR error message if token is invalid
    """
    # Look up the patient by their token
    patient = get_patient_by_token(db, plain_token)
    
    if patient:
        # Token is valid! Return user information
        return {"success": True, "name": patient.name, "id": patient.id, "token": patient.token}
    
    # Token not found or invalid
    return {"success": False, "msg": "Invalid token"}

