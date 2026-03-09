from app.core.llm_engine import generate_response

def suggest_medication(condition: str, form_data: dict):
    prompt = f"""
You are MedGemma, a homeopathic and general wellness expert.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

Suggest 1-2 safe homeopathic or natural remedies.
Limit response to two sentences.
"""
    return generate_response(prompt).strip()
