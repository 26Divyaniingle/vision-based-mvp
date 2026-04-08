"""
Dialogue Manager
Uses LLM (GPT-4o or equivalent) to dynamically decide the next question 
based on current patient context, extracted symptoms, and emotion cues.
"""
from app.core.llm_engine import generate_response
import json

def generate_next_question(conversation_history: list, symptoms: list, active_emotion: str, patient_name: str = "Guest", language: str = "English") -> str:
    """
    Decide what to ask the patient next. Truncates history to save tokens.
    """
    # Truncate history to last 5 turns (10 messages if [user, bot] pairs)
    truncated_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history

    prompt = f"""You are a compassionate medical assistant conducting an interview with {patient_name}.

Recent History:
{json.dumps(truncated_history, indent=2)}

Symptoms: {json.dumps(symptoms)}
Patient Emotion: {active_emotion}

Task: ONE concise follow-up question.
1. Acknowledge emotion if it suggests distress.
2. Ask a logical follow-up question.
3. If diagnosis-ready, respond only with "INTERVIEW_COMPLETE".

CRITICAL: Speak in {language}. 
Return ONLY the question or the flag.
"""
    response = generate_response(prompt).strip()
    return response.strip('"').strip("'")
