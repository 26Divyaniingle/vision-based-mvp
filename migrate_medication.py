
import sys
import os
import json
import ast

# Add the project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Session as SessionModel
from app.config import settings

# Database URL from config
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    sessions = db.query(SessionModel).all()
    count = 0
    for s in sessions:
        if isinstance(s.medication, str):
            try:
                # Try to parse it
                data = None
                try:
                    data = json.loads(s.medication)
                except:
                    try:
                        data = ast.literal_eval(s.medication)
                    except:
                        pass
                
                if data and isinstance(data, dict):
                    # Convert to proper JSON string
                    s.medication = data
                    count += 1
            except Exception as e:
                print(f"Error migrating session {s.session_id}: {e}")
    
    db.commit()
    print(f"Successfully migrated {count} sessions.")
finally:
    db.close()
