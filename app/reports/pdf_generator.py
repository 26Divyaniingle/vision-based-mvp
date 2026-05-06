from fpdf import FPDF
import io
import os
import datetime

# Logo path — works both locally and on server
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "medsense_logo.png")

# ── Colour palette ────────────────────────────────────────────────
BRAND_DARK   = (15,  12,  41)   # header/footer background
BRAND_ACCENT = (99,  102, 241)  # indigo accent line
SECTION_BG   = (245, 246, 250)  # light grey section banner
TEXT_DARK    = (30,  30,  40)
TEXT_MUTED   = (100, 100, 115)
GREEN        = (22,  163, 74)
RED          = (200, 30,  30)

def generate_session_pdf_bytes(session_data: dict, patient_name: str = "Patient") -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(18, 18, 18)
    pdf.add_page()

    # ── Helpers ────────────────────────────────────────────────────
    def clean(text):
        """Strip non-latin-1 chars to avoid FPDF crash."""
        return str(text).encode("latin-1", "replace").decode("latin-1") if text else ""

    def section_header(title: str):
        """Draws a shaded banner as a section title."""
        pdf.ln(4)
        pdf.set_fill_color(*SECTION_BG)
        pdf.set_text_color(*BRAND_ACCENT)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(0, 9, f"  {title}", ln=1, fill=True)
        # underline accent
        pdf.set_draw_color(*BRAND_ACCENT)
        pdf.line(18, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
        pdf.set_text_color(*TEXT_DARK)
        pdf.ln(3)

    def kv_row(label: str, value: str, label_w: int = 52):
        """Bold label + normal value on the same line."""
        pdf.set_x(18)  # Always start at the left margin
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(*TEXT_MUTED)
        pdf.cell(label_w, 7, clean(label), ln=0)
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*TEXT_DARK)
        # Use explicit width to the right margin to avoid fpdf2 wrap errors
        avail_w = pdf.w - pdf.r_margin - pdf.get_x()
        pdf.multi_cell(avail_w, 7, clean(value))
        # Ensure we move to the next line at the left margin
        pdf.ln(0)

    def bullet(text: str):
        """Indented bullet point."""
        pdf.set_x(18)  # Start at margin
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(*TEXT_DARK)
        pdf.set_x(22)  # Then indent
        avail_w = pdf.w - pdf.r_margin - 22
        pdf.multi_cell(avail_w, 6, clean(f"*  {text}"))
        pdf.ln(0)

    # ── HEADER BANNER ──────────────────────────────────────────────
    HEADER_H = 42
    pdf.set_fill_color(*BRAND_DARK)
    pdf.rect(0, 0, 210, HEADER_H, 'F')

    # Logo (left side) — rendered only if file exists
    if os.path.exists(LOGO_PATH):
        pdf.image(LOGO_PATH, x=8, y=6, h=30)   # auto-width from height

    pdf.set_y(9)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 20)
    pdf.cell(0, 12, "MedSense", ln=1, align="C")

    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(100, 220, 210)   # teal accent
    pdf.cell(0, 7, "MEDICAL CONSULTATION REPORT", ln=1, align="C")
    
    pdf.set_font("helvetica", "", 9)
    pdf.set_text_color(190, 190, 220)
    pdf.cell(0, 6, "Powered by Vision Agentic AI & Groq Llama", ln=1, align="C")

    # accent line below header
    pdf.set_y(HEADER_H)
    pdf.set_draw_color(*BRAND_ACCENT)
    pdf.set_line_width(0.8)
    pdf.line(0, HEADER_H, 210, HEADER_H)
    pdf.set_line_width(0.2)

    pdf.set_y(50)
    pdf.set_text_color(*TEXT_DARK)

    # ── PATIENT INFO ───────────────────────────────────────────────
    now = datetime.datetime.now().strftime("%d %B %Y  |  %H:%M")

    pdf.set_fill_color(*SECTION_BG)
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(*BRAND_DARK)
    pdf.cell(0, 11, f"  {patient_name}", ln=1, fill=True)
    pdf.set_font("helvetica", "I", 9)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(0, 6, f"  Report generated: {now}", ln=1, fill=False)

    # ── Parse session data ─────────────────────────────────────────
    condition  = session_data.get("condition", "Unknown")
    confidence = session_data.get("confidence", 0)
    try:
        conf_pct = float(confidence) * 100
    except (ValueError, TypeError):
        try:
            conf_pct = float(confidence)
        except Exception:
            conf_pct = 0.0

    # Normalise: if already ≤1 it was a fraction, else already %
    if conf_pct <= 1.0:
        conf_pct *= 100

    med_data = session_data.get("medication", {})
    if isinstance(med_data, str):
        import json
        try:
            med_data = json.loads(med_data.replace("'", '"'))
        except Exception:
            med_data = {}

    v = session_data.get("vision") or session_data.get("emotion_metrics") or {}
    if not isinstance(v, dict):
        v = {}

    emotion     = v.get("dominant_emotion", v.get("emotion", "Neutral"))
    eye_strain  = v.get("avg_eye_strain",  v.get("eye_strain_score", 0))
    lip_tension = v.get("avg_lip_tension", v.get("lip_tension", 0))
    try: eye_strain  = float(eye_strain)
    except Exception: eye_strain = 0.0
    try: lip_tension = float(lip_tension)
    except Exception: lip_tension = 0.0

    distress = v.get("distress_flags", {})
    stress_flag = distress.get("stress", False)
    pain_flag   = distress.get("pain",   False)

    allopathic = []
    ayurvedic  = []
    if isinstance(med_data, dict):
        allopathic = med_data.get("allopathic", [])
        ayurvedic  = med_data.get("ayurvedic",  [])

    prevention = session_data.get("prevention", [])
    safety_val = session_data.get("safety_check_passed",
                 session_data.get("safety_passed", True))

    # ── SECTION 1 — DIAGNOSIS ──────────────────────────────────────
    section_header("AI Diagnosis")
    kv_row("Condition:",  condition)
    kv_row("Confidence:", f"{conf_pct:.1f}%")
    pdf.ln(1)

    # Safety status inline
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(52, 7, "Clinical Safety:", ln=0)
    if safety_val:
        pdf.set_text_color(*GREEN)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 7, "PASSED - Safe for Home Care", ln=1)
    else:
        pdf.set_text_color(*RED)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 7, "WARNING - Consult a Doctor Immediately", ln=1)
    pdf.set_text_color(*TEXT_DARK)

    # ── SECTION 2 — BIO-VISUAL ANALYSIS ───────────────────────────
    section_header("Bio-Visual Analysis")
    kv_row("Dominant Emotion:", str(emotion).title())
    kv_row("Eye Strain Score:", f"{eye_strain:.2f}")
    kv_row("Lip Tension Score:", f"{lip_tension:.2f}")
    kv_row("Stress Detected:", "Yes" if stress_flag else "No")
    kv_row("Pain Signals:",    "Detected" if pain_flag else "None observed")

    # ── SECTION 3 — ALLOPATHIC ────────────────────────────────────
    section_header("Allopathic Recommendations (Modern Medicine)")
    if allopathic:
        for m in allopathic:
            name    = m.get("name",        "N/A")
            dosage  = m.get("dosage",      "N/A")
            instr   = m.get("instruction", "N/A")
            purpose = m.get("purpose",     "N/A")
            bullet(f"{name}  -  {dosage}  ({instr})  -  For: {purpose}")
    else:
        bullet("No allopathic medications provided.")

    # ── SECTION 4 — AYURVEDIC ─────────────────────────────────────
    section_header("Ayurvedic & Wellness Advice")
    if ayurvedic:
        for a in ayurvedic:
            remedy  = a.get("remedy",  "N/A")
            benefit = a.get("benefit", "N/A")
            usage   = a.get("usage",   "N/A")
            timing  = a.get("timing",  "N/A")
            
            bullet(f"{remedy}: {benefit}")
            # Add detail explanation for how and when to use
            pdf.set_x(26)
            pdf.set_font("helvetica", "I", 9)
            pdf.set_text_color(*TEXT_MUTED)
            pdf.multi_cell(0, 5, clean(f"Recipe & Usage: {usage}"))
            pdf.set_x(26)
            pdf.multi_cell(0, 5, clean(f"When to use: {timing}"))
            pdf.ln(2)
    else:
        bullet("No ayurvedic remedies provided.")

    # ── SECTION 5 — PREVENTIVE MEASURES ───────────────────────────
    section_header("Preventive Measures")
    if isinstance(prevention, list) and prevention:
        for line in prevention:
            bullet(str(line))
    elif prevention:
        bullet(str(prevention))
    else:
        bullet("Maintain regular health check-ups and a balanced lifestyle.")

    # ── FOOTER ────────────────────────────────────────────────────
    pdf.ln(8)
    pdf.set_draw_color(*BRAND_ACCENT)
    pdf.line(18, pdf.get_y(), 192, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.multi_cell(
        pdf.epw, 5,
        "Disclaimer: This report is generated by an AI assistant for pre-consultation "
        "information only. It does not replace professional medical advice, diagnosis, "
        "or treatment. If symptoms worsen or you experience an emergency, seek "
        "immediate medical attention."
    )

    return bytes(pdf.output())
