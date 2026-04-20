"""
Dialogue Manager
Uses LLM (GPT-4o or equivalent) to dynamically decide the next question 
based on current patient context, extracted symptoms, and emotion cues.
"""
from app.core.llm_engine import generate_response
import json

async def generate_next_question(conversation_history: list, symptoms: list, active_emotion: str, patient_name: str = "Guest", language: str = "English", question_count: int = 1) -> str:
    """
    Decide what to ask the patient next. Truncates history to save tokens.
    """
    # Increase history buffer to 20 messages (10 turns) to help AI avoid repeating itself
    truncated_history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history

    prompt = f"""You are a compassionate and EFFICIENT medical assistant conducting an interview with {patient_name}.
    Patients get frustrated with long interviews, so be brief and get to the point.

    CURRENT QUESTION NUMBER: {question_count}
    Goal: Ask 7-8 questions minimum, 10 questions MAXIMUM.

    Recent History:
    {json.dumps(truncated_history, indent=2)}

    Symptoms Extracted So Far: {json.dumps(symptoms)}
    Patient Emotion: {active_emotion}

    Task: Generate ONE concise follow-up question.
    1. Acknowledge emotion briefly if it suggests distress.
    2. Ask a logical follow-up question that HAS NOT BEEN ASKED YET.
    3. DO NOT repeat yourself or ask for information already provided in the history.
    4. If you have enough information for a diagnosis AND you have asked at least 7 questions, respond only with "INTERVIEW_COMPLETE".
    5. If this is question number 10, YOU MUST respond only with "INTERVIEW_COMPLETE".

    CRITICAL: Speak in {language}. 
    Return ONLY the question or the flag.
    """
    response = await generate_response(prompt)
    return response.strip('"').strip("'")
