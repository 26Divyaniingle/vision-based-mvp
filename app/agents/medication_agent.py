import json
from app.core.llm_engine import generate_response

async def suggest_medication(condition: str, form_data: dict, rag_context: str) -> dict:
    prompt = f"""
You are MedGemma, a clinical medical assistant and ayurvedic wellness expert.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

VERIFIED MEDICINES AND REFERENCE KNOWLEDGE (RAG):
{rag_context}

Based on the verified medicines and reference knowledge provided, provide a care plan in JSON format with exactly this structure:
{{
  "allopathic": [
    {{ "name": "Medicine Name", "dosage": "e.g. 500mg", "instruction": "e.g. Twice daily after meals" }}
  ],
  "ayurvedic": [
    {{ "remedy": "Remedy Name", "benefit": "e.g. Reduces inflammation" }}
  ],
  "prevention": [
    "Precise lifestyle tip 1",
    "Precise lifestyle tip 2"
  ]
}}

Return ONLY the raw JSON. Strictly choose allopathic medicines from the VERIFIED list if available.
"""
    resp = (await generate_response(prompt)).strip()
    try:
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        data = json.loads(resp)
        return {
            "allopathic": data.get("allopathic", []),
            "ayurvedic": data.get("ayurvedic", []),
            "prevention": data.get("prevention", ["Maintain rest and hydration."])
        }
    except Exception:
        return {
            "allopathic": [{"name": "Consult a physician", "dosage": "N/A", "instruction": "For formal prescription"}],
            "ayurvedic": [{"remedy": "Consult an expert", "benefit": "For customized home remedies"}],
            "prevention": ["Maintain standard precautions."]
        }
