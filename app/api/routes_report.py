from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import Response
from app.reports.pdf_generator import generate_session_pdf_bytes
from app.reports.email_service import send_report_email

router = APIRouter()

class ReportRequest(BaseModel):
    session_data: dict
    email: str = ""
    patient_name: str = "Patient"

@router.post("/generate_pdf")
def generate_pdf(req: ReportRequest):
    try:
        pdf_bytes = generate_session_pdf_bytes(req.session_data)
        import base64
        # Return base64 encoded PDF
        return {"success": True, "pdf_base64": base64.b64encode(pdf_bytes).decode('utf-8')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email_pdf")
def email_pdf(req: ReportRequest):
    if not req.email:
        raise HTTPException(status_code=400, detail="Missing email address.")
    
    try:
        pdf_bytes = generate_session_pdf_bytes(req.session_data)
        res = send_report_email(req.email, pdf_bytes, req.patient_name)
        return {"success": res, "msg": "Email sent" if res else "Email failed to send"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
