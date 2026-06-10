"""
Database Connection Module
This file sets up the database connection and session management.
It handles creating and closing database sessions for each request.
It also exports data to CSV files whenever new data is added.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event  # Used for database event listeners
from .models import Base, Patient, Session as SessionModel  # Import database models
from .security_models import SecurityAlert  
from app.modules.smart_transcriber.models.transcriber_models import SmartConsultation
from app.config import settings
from app.utils.export_csv import export_table_to_csv  

import threading  # Used to run CSV export in background

# Create the database engine using PostgreSQL (Supabase)
# pool_pre_ping=True ensures the connection is healthy before using it
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False)

# Create a session factory that produces database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all database tables defined in models.py
Base.metadata.create_all(bind=engine)

def get_db():
    """
    Database session dependency for FastAPI.
    This function provides a database session for each request.
    FastAPI automatically closes the session when the request is done.
    """
    db = SessionLocal()  # Create a new database session
    try:
        yield db  # Give the session to the request handler
    finally:
        db.close()  # Always close the session after the request

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

@event.listens_for(SmartConsultation, 'after_insert')
def smart_consultation_after_insert(mapper, connection, target):
    def run_export():
        db = SessionLocal()
        try:
            export_table_to_csv(SmartConsultation, db)
        finally:
            db.close()
            
    threading.Thread(target=run_export, daemon=True).start()

# Initial Export (Backgrounded at startup)
def initial_export_bg():
    db = SessionLocal()
    try:
        export_table_to_csv(Patient, db)
        export_table_to_csv(SessionModel, db)
        export_table_to_csv(SmartConsultation, db)
    finally:
        db.close()

# Trigger initial export in background once on import
threading.Thread(target=initial_export_bg, daemon=True).start()
