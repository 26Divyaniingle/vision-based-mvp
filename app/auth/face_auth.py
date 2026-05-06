"""
Face Authentication Module
This module handles user registration and login using facial recognition.
New users register by providing their face image, which is stored and used for future logins.
Existing users can login by providing a face image that matches their registration photo.
"""

from app.vision.face_recognition import get_face_embedding
from app.auth.face_embedding_store import find_best_match
from app.database.crud import create_patient
from sqlalchemy.orm import Session
import json
import random

def register_face(db: Session, name: str, image_base64: str, age: int, phone: str, email: str):
    """
    Register a new user with face recognition.
    
    Process:
    1. Extract facial features (embedding) from the provided image
    2. Generate a unique token for the user
    3. Store the user in the database with their face embedding
    
    Args:
        db: Database session
        name: User's full name
        image_base64: Base64-encoded face image
        age: User's age
        phone: User's phone number
        email: User's email
        
    Returns:
        Dictionary with:
        - success: True if registration succeeded
        - token: Unique token for this user
        - name: The registered name
        - id: Database ID
        OR error message if registration fails
    """
    # Extract the face embedding (numerical face features) from the image
    emb = get_face_embedding(image_base64)
    if not emb:
        # No face detected in the image
        return {"success": False, "msg": "No face detected in the image for registration."}
    
    # Generate a random 6-digit token for the user
    token = str(random.randint(100000, 999999))
    
    # Create the patient record in the database with the face embedding
    patient = create_patient(db, name, token, json.dumps(emb), age, phone, email)
    
    # Return success with user information
    return {"success": True, "token": token, "name": patient.name, "id": patient.id}

def login_face(db: Session, image_base64: str):
    """
    Login an existing user using facial recognition.
    
    Process:
    1. Extract facial features from the provided image
    2. Compare against all registered faces in database
    3. Find the best matching face
    4. Return success if match score is high enough
    
    Args:
        db: Database session
        image_base64: Base64-encoded face image to match
        
    Returns:
        Dictionary with:
        - success: True if a match was found with good score
        - token: User's authentication token
        - name: User's name
        - id: User's database ID
        - score: Face matching score (0-1, higher = better match)
        OR error message if no match
    """
    # Extract face embedding from the login image
    emb = get_face_embedding(image_base64)
    if not emb:
        # No face detected
        return {"success": False, "msg": "No face detected"}
    
    # Find the registered face that best matches this embedding
    patient, score = find_best_match(db, emb)
    
    if patient:
        # Found a matching face! Return user information
        return {"success": True, "token": patient.token, "name": patient.name, "id": patient.id, "score": score}
    
    # No matching face found
    return {"success": False, "msg": "No matching face found or score too low", "score": score}

