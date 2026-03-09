from app.core.llm_engine import generate_response
import json

def predict_condition(form_data: dict, vision_features: dict, similar_cases: list):
    prompt = f"""
You are a medical diagnostic assistant matching the 'MedGemma' persona.
Analyze the following patient data:
Form: {json.dumps(form_data)}
Vision Insights: {json.dumps(vision_features)}
Similar Historical Cases: {json.dumps(similar_cases)}

Output ONLY a JSON with two keys:
"condition": <the predicted medical condition, concise>
"confidence": <float between 0 and 1>
"""
    resp = generate_response(prompt)
    try:
        # Simple extraction for MVP incase it returns markdown
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        data = json.loads(resp)
        return data.get("condition", "Unknown"), float(data.get("confidence", 0.5))
    except Exception as e:
        return "Possible viral infection or stress", 0.6
