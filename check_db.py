
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Session as SessionModel, Base
from app.config import settings

# Database URL from config
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    sessions = db.query(SessionModel).order_by(SessionModel.id.desc()).limit(5).all()
    for s in sessions:
        print(f"ID: {s.session_id}")
        print(f"Medication Type: {type(s.medication)}")
        print(f"Medication Content: {s.medication}")
        print("-" * 20)
finally:
    db.close()
