import smtplib
from email.message import EmailMessage
from app.config import settings

FROM_EMAIL = settings.SMTP_USER  # For Gmail SMTP, this should match your authenticated email address

def send_otp_email(to_email: str, otp: str, patient_name: str = "Patient") -> bool:
    """Send OTP recovery email."""
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASS
    
    print(f"SMTP Debug - User: {smtp_user}, Server: {smtp_server}:{smtp_port}")
    
    if not smtp_user or not smtp_pass:
        print(f"SMTP mock: OTP {otp} for {patient_name} to {to_email}")
        return True
        
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Healthcare Chatbot - Recovery OTP'
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg.set_content(
            f"Hi {patient_name},\\n\\n"
            f"Your recovery OTP is: {otp}\\n\\n"
            f"Valid for 5 minutes only.\\n"
            f"Never share this code.\\n\\n"
            f"Thank you,\\nVision AI Team"
        )
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        print(f"OTP sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"OTP email failed: {e}")
        return False

def send_report_email(to_email: str, pdf_bytes: bytes, patient_name: str="Patient") -> bool:
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASS

    if not smtp_user or not smtp_pass:
        print(f"SMTP Credentials not set. Simulated sending email to {to_email}")
        return True
        
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Medical AI Session Report'
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg.set_content(f"Hello {patient_name},\\n\\nPlease find attached your Vision Agentic AI session report.\\n\\nBest,\\nVision AI Team")
        
        msg.add_attachment(pdf_bytes, maintype='application', subtype='pdf', filename='Medical_Report.pdf')

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            # server.set_debuglevel(1) 
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            
        print(f"Report sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

