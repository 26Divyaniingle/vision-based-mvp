import json
from app.core.llm_engine import generate_response

def suggest_medication(condition: str, form_data: dict) -> dict:
    prompt = f"""
You are MedGemma, a general medical and ayurvedic wellness expert.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

Provide a care plan in JSON format with exactly these three keys:
1. "medication": 1-2 standard medical/allopathic or suitable remedies (2 sentences max).
2. "ayurvedic": 1-2 home ayurvedic remedies (2 sentences max).
3. "prevention": 2-3 specific preventive measures or lifestyle precautions for this condition.

Return ONLY the raw JSON.
"""
    resp = generate_response(prompt).strip()
    try:
        # Simple extraction for MVP incase it returns markdown
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        data = json.loads(resp)
        return {
            "medication": data.get("medication", "Standard homeopathic care advised."),
            "ayurvedic": data.get("ayurvedic", "Standard ayurvedic care advised."),
            "prevention": data.get("prevention", "Maintain rest and hydration.")
        }
    except Exception:
        return {
            "medication": "Consult a specialist for prescribed homeopathic care.",
            "ayurvedic": "Consult an ayurvedic expert for home remedies.",
            "prevention": "Maintain standard precautions for symptoms."
        }
