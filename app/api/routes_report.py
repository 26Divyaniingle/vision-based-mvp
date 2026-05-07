from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.crud import get_session_by_id, get_all_patients
from app.reports.pdf_generator import generate_session_pdf_bytes
from app.reports.email_service import send_report_email

router = APIRouter()

@router.get("/generate_pdf")
def generate_pdf(session_id: str, db: Session = Depends(get_db)):
    db_session = get_session_by_id(db, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Try to find patient name
    patient_name = "Patient"
    all_patients = get_all_patients(db)
    for p in all_patients:
        if p.id == db_session.patient_id:
            patient_name = p.name
            break

    try:
        import json
        medication_raw = db_session.medication
        med_parsed = {"allopathic": [], "ayurvedic": [], "prevention": []}
        
        if medication_raw:
            if isinstance(medication_raw, str):
                try:
                    # Try standard JSON first
                    med_parsed_temp = json.loads(medication_raw)
                    if isinstance(med_parsed_temp, dict):
                        med_parsed.update(med_parsed_temp)
                except:
                    # Fallback for single-quoted strings from DB
                    try:
                        med_parsed_temp = json.loads(medication_raw.replace("'", '"'))
                        if isinstance(med_parsed_temp, dict):
                            med_parsed.update(med_parsed_temp)
                    except:
                        pass
            elif isinstance(medication_raw, dict):
                med_parsed.update(medication_raw)

        # Convert DB object to dict for the generator
        session_data = {
            "condition": db_session.predicted_condition or "Unknown",
            "confidence": db_session.confidence if db_session.confidence is not None else 0.0,
            "medication": med_parsed,
            "prevention": med_parsed.get("prevention", []),
            "symptoms": db_session.symptoms or [],
            "transcript": db_session.transcript or [],
            "emotion_metrics": db_session.emotion_metrics or {},
            "safety_passed": bool(db_session.safety_check_passed)
        }
        
        pdf_bytes = generate_session_pdf_bytes(session_data, patient_name=patient_name)
        
        # Return as a proper PDF response so browser/mobile can handle it
        from fastapi.responses import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=report_{session_id}.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        raise HTTPException(status_code=500, detail=f"PDF Generation failed: {str(e)}")

@router.post("/email_pdf")
def email_pdf(session_id: str, email: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_session = get_session_by_id(db, session_id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    patient_name = "Patient"
    all_patients = get_all_patients(db)
    for p in all_patients:
        if p.id == db_session.patient_id:
            patient_name = p.name
            break

    try:
        import json
        medication_raw = db_session.medication
        med_parsed = {"allopathic": [], "ayurvedic": [], "prevention": []}
        
        if medication_raw:
            if isinstance(medication_raw, str):
                try:
                    med_parsed_temp = json.loads(medication_raw)
                    if isinstance(med_parsed_temp, dict):
                        med_parsed.update(med_parsed_temp)
                except:
                    try:
                        med_parsed_temp = json.loads(medication_raw.replace("'", '"'))
                        if isinstance(med_parsed_temp, dict):
                            med_parsed.update(med_parsed_temp)
                    except:
                        pass
            elif isinstance(medication_raw, dict):
                med_parsed.update(medication_raw)

        session_data = {
            "condition": db_session.predicted_condition or "Unknown",
            "confidence": db_session.confidence if db_session.confidence is not None else 0.0,
            "medication": med_parsed,
            "prevention": med_parsed.get("prevention", []),
            "symptoms": db_session.symptoms or [],
            "transcript": db_session.transcript or [],
            "emotion_metrics": db_session.emotion_metrics or {},
            "safety_passed": bool(db_session.safety_check_passed)
        }
        pdf_bytes = generate_session_pdf_bytes(session_data, patient_name=patient_name)
        
        # Use BackgroundTasks to avoid client timeout
        background_tasks.add_task(send_report_email, email, pdf_bytes, patient_name)
        
        return {"success": True, "msg": "Medical report is being sent to your email."}
    except Exception as e:
        print(f"Email PDF Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
