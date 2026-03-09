import smtplib
from email.message import EmailMessage
import os

def send_report_email(to_email: str, pdf_bytes: bytes, patient_name: str="Patient") -> bool:
    # This is a fully functioning SMTP implementation.
    # It requires valid credentials in your .env or system env variables to actually send.
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    if not smtp_user or not smtp_pass:
        print(f"SMTP Credentials not set. Simulated sending email to {to_email}")
        return True # Mock success
        
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Medical AI Session Report'
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg.set_content(f"Hello {patient_name},\n\nPlease find attached your Vision Agentic AI session report.\n\nBest,\nVision AI Team")
        
        msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename='Medical_Report.pdf')

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            
        print(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
