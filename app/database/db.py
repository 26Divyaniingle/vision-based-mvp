from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event # Import event
from .models import Base, Patient, Session as SessionModel # Added Patient and SessionModel
from app.config import settings
from app.utils.export_csv import export_table_to_csv # Import export utility

import threading # Import threading

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Real-time CSV Export Hooks (Asynchronous)
@event.listens_for(Patient, 'after_insert')
def patient_after_insert(mapper, connection, target):
    def run_export():
        db = SessionLocal()
        try:
            export_table_to_csv(Patient, db)
        finally:
            db.close()
    
    # Run in background thread to avoid blocking the main server/transaction
    threading.Thread(target=run_export, daemon=True).start()

@event.listens_for(SessionModel, 'after_insert')
def session_after_insert(mapper, connection, target):
    def run_export():
        db = SessionLocal()
        try:
            export_table_to_csv(SessionModel, db)
        finally:
            db.close()
            
    threading.Thread(target=run_export, daemon=True).start()

# Initial Export (Backgrounded at startup)
def initial_export_bg():
    db = SessionLocal()
    try:
        export_table_to_csv(Patient, db)
        export_table_to_csv(SessionModel, db)
    finally:
        db.close()

# Trigger initial export in background once on import
threading.Thread(target=initial_export_bg, daemon=True).start()
