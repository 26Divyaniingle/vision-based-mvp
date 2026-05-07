from app.reports.pdf_generator import generate_session_pdf_bytes
import os

test_data = {
    "condition": "Fever",
    "confidence": 0.85,
    "medication": {
        "allopathic": [{"name": "Paracetamol", "dosage": "500mg", "instruction": "After meals", "purpose": "Fever"}],
        "ayurvedic": []
    },
    "symptoms": ["headache", "fever"],
    "transcript": [{"role": "patient", "text": "I have a fever"}],
    "emotion_metrics": {"dominant_emotion": "neutral", "avg_eye_strain": 0.1, "avg_lip_tension": 0.1, "distress_flags": {"stress": False, "pain": False}},
    "safety_passed": True
}

try:
    pdf_bytes = generate_session_pdf_bytes(test_data, "Test Patient")
    with open("test_report.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("PDF generated successfully: test_report.pdf")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILED: {e}")
