from app.database.crud import get_patient_by_token
from sqlalchemy.orm import Session

def login_token(db: Session, token: str):
    patient = get_patient_by_token(db, token)
    if patient:
        return {"success": True, "name": patient.name, "id": patient.id, "token": patient.token}
    return {"success": False, "msg": "Invalid token"}
