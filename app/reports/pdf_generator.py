from fpdf import FPDF
import io

def generate_session_pdf_bytes(session_data: dict) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(0, 10, "Medical Vision Agentic AI - Session Report", ln=True, align="C")
    pdf.ln(10)
    
    # Patient Info (if any)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Patient Consultation Details", ln=True)
    pdf.set_font("helvetica", "", 12)
    
    v = session_data.get("vision", {})
    ai = session_data.get("ai_results", {})
    symptoms = session_data.get("symptoms", "No symptoms described.")
    
    pdf.cell(0, 10, f"Symptoms Reported:", ln=True)
    pdf.set_font("helvetica", "I", 11)
    pdf.multi_cell(0, 7, symptoms)
    pdf.ln(2)
    
    pdf.set_font("helvetica", "", 12)
    pdf.cell(0, 10, f"Dominant Emotion Detected: {v.get('emotion', 'Neutral').title()}", ln=True)
    pdf.cell(0, 10, f"Eye Strain Score: {v.get('eye_strain_score', 0):.2f}", ln=True)
    pdf.cell(0, 10, f"Lip Tension Score: {v.get('lip_tension', 0):.2f}", ln=True)
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "MedGemma AI Diagnosis", ln=True)
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, f"Predicted Condition: {ai.get('condition', 'Unknown')}")
    pdf.cell(0, 10, f"Confidence: {ai.get('confidence', 0)*100:.1f}%", ln=True)
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Recommended Remedy", ln=True)
    pdf.set_font("helvetica", "", 12)
    pdf.multi_cell(0, 10, f"{ai.get('medication', 'No medication provided.')}")
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(0, 10, "Safety Status: ", ln=False)
    
    if ai.get('safety_passed'):
        pdf.set_text_color(0, 128, 0)
        pdf.cell(0, 10, "PASSED", ln=True)
    else:
        pdf.set_text_color(255, 0, 0)
        pdf.cell(0, 10, "FAILED - CONSULT DOCTOR", ln=True)
        
    pdf.set_text_color(0, 0, 0) # reset
    
    # FPDF2 output() gives a bytearray when dest='S'
    return bytearray(pdf.output())
