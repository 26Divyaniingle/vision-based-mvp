from .base_agent import BaseAgent
import json

class MedicationAgent(BaseAgent):
    def __init__(self):
        super().__init__(persona="MedGemma, a clinical medical assistant and ayurvedic wellness expert")

    async def suggest_medication(self, condition: str, form_data: dict, rag_context: str) -> dict:
        prompt = f"""
You are {self.persona}.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

VERIFIED MEDICINES AND REFERENCE KNOWLEDGE (RAG):
{rag_context}

CRITICAL: Return ONLY valid JSON with ALL three fields: allopathic, ayurvedic, AND prevention.
Do NOT add any text before or after the JSON.

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
    "Precise lifestyle tip 2",
    "Precise lifestyle tip 3"
  ]
}}

Return ONLY the raw JSON. Strictly choose allopathic medicines from the VERIFIED list if available.
Include at least 3 prevention tips for the patient.
"""
        resp = await self.get_response(prompt)
        data = self.parse_json(resp)
        
        # Debug: Log if any field is missing
        if not data.get("prevention"):
            print(f"⚠️  WARNING: Prevention missing in response. Raw response: {resp[:300]}")
        
        return {
            "allopathic": data.get("allopathic", [{"name": "Consult a physician", "dosage": "N/A", "instruction": "For formal prescription"}]),
            "ayurvedic": data.get("ayurvedic", [{"remedy": "Consult an expert", "benefit": "For customized home remedies"}]),
            "prevention": data.get("prevention", ["Maintain standard precautions.", "Rest adequately", "Stay hydrated"])
        }
