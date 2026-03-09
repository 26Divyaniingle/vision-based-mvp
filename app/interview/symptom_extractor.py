"""
Symptom Extractor - Uses Gemini LLM to extract structured medical symptoms
from patient's natural language responses during the interview.
"""
import json
from app.core.llm_engine import generate_response


def extract_symptoms_from_response(patient_answer: str, question_context: str, previous_symptoms: list) -> dict:
    """
    Extract symptoms and medical info from the patient's spoken/typed answer.
    Returns structured data about what was mentioned.
    """
    prompt = f"""You are a medical NLP processor. Extract structured medical information from this patient's response.

Previous symptoms already identified: {json.dumps(previous_symptoms)}

Question asked: {question_context}
Patient's response: "{patient_answer}"

Extract and return ONLY a valid JSON object with these keys:
{{
    "new_symptoms": ["list of any new symptoms mentioned"],
    "severity": "mild/moderate/severe or null if not mentioned",
    "duration": "duration mentioned or null",
    "medications_mentioned": ["any medications mentioned"],
    "allergies_mentioned": ["any allergies mentioned"],
    "lifestyle_factors": ["sleep issues, stress, diet, etc."],
    "key_phrases": ["important medical phrases from the response"],
    "emotional_state_from_words": "patient's apparent emotional state based on word choice"
}}

Be precise and only extract what the patient actually said. Do not invent information."""

    resp = generate_response(prompt)
    try:
        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0].strip()
        elif "```" in resp:
            resp = resp.split("```")[1].split("```")[0].strip()
        return json.loads(resp)
    except Exception:
        return {
            "new_symptoms": [],
            "severity": None,
            "duration": None,
            "medications_mentioned": [],
            "allergies_mentioned": [],
            "lifestyle_factors": [],
            "key_phrases": [patient_answer[:100]],
            "emotional_state_from_words": "unknown"
        }


def generate_follow_up_question(conversation_history: list, extracted_symptoms: list, vision_summary: dict) -> str:
    """
    Generate a contextual follow-up question based on the conversation so far
    and the vision analysis observations.
    """
    prompt = f"""You are a compassionate medical AI interviewer conducting a patient consultation.

Conversation so far:
{json.dumps(conversation_history, indent=2)}

Symptoms identified: {json.dumps(extracted_symptoms)}

Vision analysis observations (from webcam during interview):
- Dominant emotion detected: {vision_summary.get('dominant_emotion', 'neutral')}
- Average eye strain: {vision_summary.get('avg_eye_strain', 0):.2f}
- Average lip tension: {vision_summary.get('avg_lip_tension', 0):.2f}
- Emotion trends: {json.dumps(vision_summary.get('emotion_counts', {}))}

Based on what has been discussed so far and what you observe from the vision analysis,
generate ONE empathetic follow-up question to gather more diagnostic information.

If the vision analysis shows signs of distress or strain that haven't been mentioned,
gently ask about those observations.

Return ONLY the question text, nothing else. Keep it conversational and caring."""

    resp = generate_response(prompt)
    return resp.strip().strip('"')
