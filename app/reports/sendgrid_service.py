import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import settings

def send_otp_email(to_email: str, otp: str, patient_name: str = "Patient") -> bool:
    """Send OTP via SendGrid."""
    api_key = settings.SENDGRID_API_KEY or os.environ.get("SENDGRID_API_KEY")
    if not api_key:
        print(f"SendGrid mock: OTP {otp} for {patient_name} to {to_email}")
        return True
    
    try:
        message = Mail(
            from_email='noreply@yourapp.com',  # Verified sender in SendGrid
            to_emails=to_email,
            subject='Healthcare Chatbot - Recovery OTP',
            plain_text_content=f'''
Hi {patient_name},

Your recovery OTP is: {otp}

Valid for 5 minutes only.
Never share this code.

Thank you,
Vision AI Team
            '''
        )
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        print(f"SendGrid OTP sent to {to_email} (status: {response.status_code})")
        return response.status_code in (200, 202)
    except Exception as e:
        print(f"SendGrid OTP failed: {e}")
        return False

def send_report_email(to_email: str, pdf_bytes: bytes, patient_name: str="Patient") -> bool:
    """Send report PDF via SendGrid."""
    api_key = settings.SENDGRID_API_KEY or os.environ.get("SENDGRID_API_KEY")
    if not api_key:
        print(f"SendGrid credentials not set. Simulated sending to {to_email}")
        return True
    
    try:
        message = Mail(
            from_email='noreply@yourapp.com',
            to_emails=to_email,
            subject='Your Medical AI Session Report',
            plain_text_content=f'Hello {patient_name},\n\nPlease find attached your Vision Agentic AI session report.\n\nBest,\nVision AI Team',
            attachments=[{
                "content": pdf_bytes.encode('base64'),
                "filename": "Medical_Report.pdf",
                "type": "application/pdf",
                "disposition": "attachment"
            }]
        )
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        print(f"SendGrid report sent to {to_email} (status: {response.status_code})")
        return response.status_code in (200, 202)
    except Exception as e:
        print(f"SendGrid report failed: {e}")
        return False

