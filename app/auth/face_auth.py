from app.vision.face_recognition import get_face_embedding
from app.auth.face_embedding_store import find_best_match
from app.database.crud import create_patient
from sqlalchemy.orm import Session
import json
import secrets

def register_face(db: Session, name: str, image_base64: str, age: int, phone: str, email: str):
    emb = get_face_embedding(image_base64)
    if not emb:
        return {"success": False, "msg": "No face detected in the image for registration."}
    token = secrets.token_hex(8)
    patient = create_patient(db, name, token, json.dumps(emb), age, phone, email)
    return {"success": True, "token": token, "name": patient.name, "id": patient.id}

def login_face(db: Session, image_base64: str):
    emb = get_face_embedding(image_base64)
    if not emb:
        return {"success": False, "msg": "No face detected"}
    
    patient, score = find_best_match(db, emb)
    if patient:
        return {"success": True, "token": patient.token, "name": patient.name, "id": patient.id, "score": score}
    return {"success": False, "msg": "No matching face found or score too low", "score": score}
