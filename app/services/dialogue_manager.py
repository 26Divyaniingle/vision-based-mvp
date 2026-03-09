"""
Dialogue Manager
Uses LLM (GPT-4o or equivalent) to dynamically decide the next question 
based on current patient context, extracted symptoms, and emotion cues.
"""
from app.core.llm_engine import generate_response
import json

def generate_next_question(conversation_history: list, symptoms: list, active_emotion: str, language: str = "English") -> str:
    """
    Decide what to ask the patient next to build the medical context.
    It adjusts tone based on the active emotion and guides the diagnosis dynamically.
    The output question will be naturally formulated in the chosen language.
    """
    prompt = f"""You are a skilled and compassionate medical chatbot.
Your goal is to complete an accurate pre-consultation medical interview.

Conversation so far:
{json.dumps(conversation_history, indent=2)}

Extracted Symptoms so far:
{json.dumps(symptoms)}

Patient's current emotional state (detected from webcam): {active_emotion}

Task: Generate ONE question to ask the patient next.
1. If the patient appears '{active_emotion}' and it indicates pain or stress, acknowledge it politely.
2. Formulate a logical follow-up question.
3. If you have enough information to diagnose, say "INTERVIEW_COMPLETE" (in English exactly as shown).

CRITICAL INSTRUCTION: Your generated question MUST be written natively in {language}. 
If returning the complete flag, ONLY return the exact English string "INTERVIEW_COMPLETE".

Return ONLY the question or the complete flag.
"""
    response = generate_response(prompt).strip()
    return response.strip('"')
