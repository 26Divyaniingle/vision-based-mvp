from fpdf import FPDF
import io
import os

# Logo path — works both locally and on server
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "medsense_logo.png")

def generate_session_pdf_bytes(session_data: dict, patient_name: str = "Patient") -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    
    # ── Header Branding ──────────────────────────────────────────
    HEADER_H = 48
    pdf.set_fill_color(15, 12, 41)  # Deep navy
    pdf.rect(0, 0, 210, HEADER_H, 'F')

    # Logo (left side) — rendered only if file exists
    if os.path.exists(LOGO_PATH):
        pdf.image(LOGO_PATH, x=8, y=6, h=36)   # auto-width from height

    # App name & subtitle (centred in remaining space)
    pdf.set_y(10)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 22)
    pdf.cell(0, 12, "MedSense", ln=1, align="C")
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(100, 220, 210)   # teal accent
    pdf.cell(0, 7, "MEDICAL CONSULTATION REPORT", ln=1, align="C")
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(200, 200, 200)
    pdf.cell(0, 6, "Powered by Vision Agentic AI & MedGemma", ln=1, align="C")
    pdf.ln(5)

    # Body Text Color
    pdf.set_text_color(0, 0, 0)
    pdf.set_y(HEADER_H + 5)  # Move below header
    
    # Patient Info Header
    pdf.set_font("helvetica", "B", 12)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(0, 10, f" Patient: {patient_name}", ln=1, fill=True)
    
    import datetime
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pdf.set_font("helvetica", "I", 9)
    pdf.cell(0, 8, f"Report Generated: {now}", ln=1)
    pdf.ln(3)
    
    v = session_data.get("vision") or session_data.get("emotion_metrics") or {}
    
    # Standardize data access for flatter structures
    condition = session_data.get("condition", "Unknown")
    confidence = session_data.get("confidence", 0)
    symptoms = session_data.get("symptoms", ["No specific symptoms noted"])
    if isinstance(symptoms, list): symptoms = ", ".join([str(s) for s in symptoms])
    
    med_data = session_data.get("medication", {})
    if isinstance(med_data, str):
        import json
        try:
            med_data = json.loads(med_data.replace("'", '"'))
        except:
            med_data = {}

    if not isinstance(v, dict):
        v = {}

    emotion = v.get('dominant_emotion', v.get('emotion', 'Neutral'))
    eye_strain = v.get('avg_eye_strain', v.get('eye_strain_score', 0))
    lip_tension = v.get('avg_lip_tension', v.get('lip_tension', 0))

    try:
        eye_strain = float(eye_strain)
    except (ValueError, TypeError):
        eye_strain = 0.0
    try:
        lip_tension = float(lip_tension)
    except (ValueError, TypeError):
        lip_tension = 0.0

    def clean_text(text):
        """Strip non-latin-1 characters to prevent FPDF crash."""
        if not text: return ""
        # Handle cases where text might be objects
        text_str = str(text)
        return text_str.encode('latin-1', 'replace').decode('latin-1')

    # Symptoms section
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Reported Symptoms:", ln=1)
    pdf.set_font("helvetica", "", 11)
    pdf.multi_cell(pdf.epw, 7, clean_text(symptoms))
    pdf.ln(3)
    
    # Bio-Visual
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Bio-Visual Analysis", ln=1)
    pdf.set_font("helvetica", "", 11)
    # Using specific widths for label/value helps alignment
    col_w = 45
    pdf.cell(col_w, 8, "Dominant Emotion:", ln=0)
    pdf.cell(0, 8, clean_text(str(emotion).title()), ln=1)
    
    pdf.cell(col_w, 8, "Eye Strain Score:", ln=0)
    pdf.cell(0, 8, f"{eye_strain:.2f}", ln=1)
    
    pdf.cell(col_w, 8, "Lip Tension Score:", ln=0)
    pdf.cell(0, 8, f"{lip_tension:.2f}", ln=1)
    
    pdf.ln(3)
    # Diagnosis
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "MedGemma AI Diagnosis & Care Plan", ln=1)
    
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(40, 8, "Condition:", ln=0)
    pdf.set_font("helvetica", "", 11)
    pdf.multi_cell(0, 8, clean_text(condition))
    
    try:
        conf_val = float(confidence) * 100
    except (ValueError, TypeError):
        conf_val = 0.0
    
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(40, 8, "Confidence:", ln=0)
    pdf.set_font("helvetica", "", 11)
    pdf.cell(0, 8, f"{conf_val:.1f}%", ln=1)
    
    # Medication
    allopathic = med_data.get("allopathic", []) if isinstance(med_data, dict) else []
    ayurvedic = med_data.get("ayurvedic", []) if isinstance(med_data, dict) else []
    prevention = session_data.get("prevention", [])

    pdf.ln(3)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 8, "Allopathic Recommendations (Modern Medicine):", ln=1)
    pdf.set_font("helvetica", "", 10)
    if allopathic:
        for m in allopathic:
            name = m.get('name', 'N/A')
            dosage = m.get('dosage', 'N/A')
            instr = m.get('instruction', 'N/A')
            pdf.multi_cell(pdf.epw, 6, clean_text(f"  - {name}: {dosage} ({instr})"))
    else:
        pdf.cell(0, 7, "  - None provided.", ln=1)
    
    pdf.ln(2)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 8, "Ayurvedic & Wellness Advice:", ln=1)
    pdf.set_font("helvetica", "", 10)
    if ayurvedic:
        for a in ayurvedic:
            remedy = a.get('remedy', 'N/A')
            benefit = a.get('benefit', 'N/A')
            pdf.multi_cell(pdf.epw, 6, clean_text(f"  - {remedy}: {benefit}"))
    else:
        pdf.cell(0, 7, "  - None provided.", ln=1)

    pdf.ln(2)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 8, "Preventive Measures:", ln=1)
    pdf.set_font("helvetica", "", 10)
    if prevention:
        if isinstance(prevention, list):
            for line in prevention:
                pdf.multi_cell(pdf.epw, 6, clean_text(f"  - {line}"))
        else:
            pdf.multi_cell(pdf.epw, 6, clean_text(prevention))
    else:
        pdf.cell(0, 7, "  - Maintain standard health precautions, stay hydrated, and rest adequately.", ln=1)
    
    # Safety Check
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(60, 10, "Safety & Compliance Status: ", ln=0)
    
    safety_val = session_data.get('safety_check_passed', session_data.get('safety_passed', True))
    if safety_val:
        pdf.set_text_color(0, 100, 0)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 10, "PASSED - Safe for Home Care", ln=1)
    else:
        pdf.set_text_color(200, 0, 0)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 10, "STRICT WARNING - CONSULT DOCTOR IMMEDIATELY", ln=1)
        
    pdf.set_text_color(0, 0, 0) # reset
    pdf.ln(5)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(pdf.epw, 4, "Disclaimer: This report is generated by an AI assistant for pre-consultation information only. It does not replace professional medical advice. If your symptoms worsen, seek immediate medical attention.")
    
    return bytes(pdf.output())
