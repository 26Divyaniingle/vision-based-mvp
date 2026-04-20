from .base_agent import BaseAgent
import json

class ConditionAgent(BaseAgent):
    def __init__(self):
        super().__init__(persona="medical diagnostic assistant matching the 'MedGemma' persona")

    async def predict_condition(self, form_data: dict, vision_features: dict, similar_cases: list, rag_context: str):
        prompt = f"""
You are a {self.persona}.
Analyze the following patient data:
Form: {json.dumps(form_data)}
Vision Insights: {json.dumps(vision_features)}
Similar Historical Cases: {json.dumps(similar_cases)}

REFERENCE MEDICAL KNOWLEDGE (RAG):
{rag_context}

Based ON the patient data and the provided reference medical knowledge, output ONLY a JSON with two keys:
"condition": <the predicted medical condition, concise>
"confidence": <float between 0 and 1>
"""
        resp = await self.get_response(prompt)
        data = self.parse_json(resp)
        
        condition = data.get("condition", "Possible viral infection or stress")
        confidence = float(data.get("confidence", 0.6))
        return condition, confidence
