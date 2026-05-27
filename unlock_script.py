from sqlalchemy import create_all, create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys

# Add current dir to path to import app
sys.path.append(os.getcwd())

from app.database.models import Patient

DB_URL = "sqlite:///c:/Users/Divya/vision-based-mvp/data/vision_agent.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False, "timeout": 30})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def unlock_patient(p_id):
    db = SessionLocal()
    try:
        patient = db.query(Patient).filter(Patient.id == p_id).first()
        if patient:
            print(f"Unlocking patient {patient.name} (ID: {p_id}). Current count: {patient.sessionCount}")
            patient.sessionCount = 0
            patient.isLocked = False
            db.commit()
            print("Successfully unlocked.")
        else:
            print(f"Patient ID {p_id} not found.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    unlock_patient(2)
