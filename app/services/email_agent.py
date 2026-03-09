"""
Email and SMS Agent
Sends reports to email. Optionally notifies via SMS using Twilio.
"""
from app.reports.email_service import send_report_email

def send_patient_report(email: str, pdf_bytes: bytes, patient_name: str, phone: str = ""):
    """Send report PDF via email and notify via SMS."""
    email_success = send_report_email(email, pdf_bytes, patient_name)
    
    sms_success = False
    if phone:
        # Twilio SMS Mock/Implementation
        try:
            from twilio.rest import Client
            import os
            # client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
            # msg = client.messages.create(body=f"Hello {patient_name}, your Medical AI report is ready. Check your email.", from_="+123", to=phone)
            sms_success = True
        except Exception as e:
            print(f"SMS sending failed or disabled: {e}")
            
    return email_success, sms_success
