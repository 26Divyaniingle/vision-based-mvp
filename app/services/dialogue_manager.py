"""
Dialogue Manager Module
This module uses an LLM to dynamically generate follow-up questions during a medical interview.
Instead of pre-written questions, it intelligently creates questions based on symptoms already mentioned
and the patient's emotional state.
This makes interviews more natural and efficient - we don't ask unnecessary questions.
"""

from app.core.llm_engine import generate_response
import json

async def generate_next_question(conversation_history: list, symptoms: list, active_emotion: str, patient_name: str = "Guest", language: str = "English", question_count: int = 1, historical_context: str = "") -> str:
    """
    Generate the next interview question dynamically based on context.
    The AI decides what to ask based on:
    - Conversation history (what's already been discussed)
    - Extracted symptoms so far
    - Patient's current emotion (to show empathy)
    - Patient's medical history (to avoid repeating known issues or identify patterns)
    
    Args:
        conversation_history: List of previous bot and patient messages
        symptoms: List of symptoms extracted from patient's responses
        active_emotion: Current emotion detected from the patient (e.g., "sad", "anxious")
        patient_name: Patient's name for personalization (default "Guest")
        language: Language to use for questions (default "English")
        question_count: How many questions have been asked so far
        historical_context: Summary of previous patient consultations (optional)
        
    Returns:
        A string containing either:
        - The next question to ask the patient
        - The string "INTERVIEW_COMPLETE" if enough questions have been asked
    """
    
    # Truncate conversation history to save LLM tokens
    # We keep the last 20 messages (10 back-and-forth turns) to provide context
    # without using too many tokens that would slow down the LLM call
    truncated_history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history

    # Create the prompt that tells the LLM how to generate the next question
    prompt = f"""You are a compassionate and EFFICIENT medical assistant conducting an interview with {patient_name}.
    Patients get frustrated with long interviews, so be brief and get to the point.

    CURRENT QUESTION NUMBER: {question_count}
    Goal: Ask 7 questions minimum, 8 questions MAXIMUM.

    Recent History:
    {json.dumps(truncated_history, indent=2)}

    Symptoms Extracted So Far: {json.dumps(symptoms)}
    Patient Emotion: {active_emotion}

    Patient Medical History (Summary of past sessions):
    {historical_context if historical_context else "No history available."}

    Task: Generate ONE concise follow-up question.
    1. Acknowledge emotion briefly ONLY if it's the FIRST time you are noticing a major emotional shift. 
    2. ABSOLUTELY FORBIDDEN: Do not repeat emotional acknowledgments, empathy statements, or observations about the user's expression (like "I see you are surprised", "I noticed you look upset", etc.) if you or the user have already addressed them earlier in the conversation history.
    3. Ask a logical follow-up question that HAS NOT BEEN ASKED YET.
    4. DO NOT repeat yourself or ask for information already provided in the history or historical context.
    5. Each response must be unique and move the consultation forward.
    6. If you have enough information for a diagnosis AND you have asked at least 7 questions, respond only with "INTERVIEW_COMPLETE".
    7. If this is question number 8, YOU MUST respond only with "INTERVIEW_COMPLETE".
    8. Use the historical context to provide more intelligent and relevant questions (e.g. if the patient previously had chest pain, and current symptoms are breathing discomfort, ask if the pain returned).

    CRITICAL: Speak in {language}. 
    Return ONLY the question or the flag.
    """
    
    # Call the LLM to generate the next question
    response = await generate_response(prompt)
    
    # Clean up the response (remove any extra quotes)
    return response.strip('"').strip("'")

