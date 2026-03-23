import json
from app.core.llm_engine import generate_response

def suggest_medication(condition: str, form_data: dict, rag_context: str) -> dict:
    prompt = f"""
You are MedGemma, a clinical medical assistant, pharmacologist, and ayurvedic wellness expert.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

VERIFIED MEDICINES AND REFERENCE KNOWLEDGE (RAG):
{rag_context}

Based on the verified medicines and reference knowledge provided above where applicable, provide a care plan in JSON format with exactly these three keys:
1. "medication": Suggestions for medicines that directly treat these symptoms, strictly choosing from the VERIFIED MEDICINES list if applicable (2 sentences max).
2. "ayurvedic": 1-2 home ayurvedic or wellness remedies based on these symptoms (2 sentences max).
3. "prevention": 2-3 specific preventive measures or lifestyle precautions for this condition.

Return ONLY the raw JSON. Do not invent medicines not found in any provided verified list.
"""
    resp = generate_response(prompt).strip()
    try:
        # Simple extraction for MVP incase it returns markdown
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        data = json.loads(resp)
        return {
            "medication": data.get("medication", "Standard symptom relief medication advised."),
            "ayurvedic": data.get("ayurvedic", "Standard ayurvedic care advised."),
            "prevention": data.get("prevention", "Maintain rest and hydration.")
        }
    except Exception:
        return {
            "medication": "Consult a doctor for a formal prescription based on these symptoms.",
            "ayurvedic": "Consult an ayurvedic expert for home remedies.",
            "prevention": "Maintain standard precautions for symptoms."
        }
