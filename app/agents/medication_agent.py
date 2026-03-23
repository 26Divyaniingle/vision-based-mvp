import json
from app.core.llm_engine import generate_response

def suggest_medication(condition: str, form_data: dict, rag_context: str) -> dict:
    prompt = f"""
You are MedGemma, a clinical medical assistant and pharmacologist.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

VERIFIED MEDICINES AND KNOWLEDGE (RAG):
{rag_context}

Based ONLY on the verified medicines and reference knowledge provided above, provide a care plan in JSON format with exactly these two keys:
1. "medication": Suggestions for medicines that directly treat these symptoms, strictly choosing from the VERIFIED MEDICINES list if applicable (2 sentences max).
2. "prevention": 2-3 specific preventive measures or lifestyle precautions for this condition.

Return ONLY the raw JSON. Do not invent medicines not found in the verified list.
"""
    resp = generate_response(prompt).strip()
    try:
        # Simple extraction for MVP incase it returns markdown
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        data = json.loads(resp)
        return {
            "medication": data.get("medication", "Standard symptom relief medication advised."),
            "prevention": data.get("prevention", "Maintain rest and hydration.")
        }
    except Exception:
        return {
            "medication": "Consult a doctor for a formal prescription based on these symptoms.",
            "prevention": "Maintain standard precautions for symptoms."
        }
