"""
Medical Question Bank for the Interview Chatbot.
Questions are organized by category and asked sequentially.
The AI will generate follow-up questions dynamically based on patient responses.
"""

# Initial greeting and core screening questions
INTERVIEW_QUESTIONS = [
    {
        "id": "greeting",
        "category": "introduction",
        "question": "Hello! I'm your AI medical assistant. I'll be asking you some questions to understand your health concerns better. Let's begin. What brings you here today? Please describe your main concern.",
        "follow_up_hint": "chief_complaint"
    },
    {
        "id": "symptom_duration",
        "category": "symptoms",
        "question": "How long have you been experiencing these symptoms? When did they first start?",
        "follow_up_hint": "duration"
    },
    {
        "id": "symptom_severity",
        "category": "symptoms",
        "question": "On a scale of 1 to 10, how severe would you rate your discomfort right now?",
        "follow_up_hint": "severity"
    },
    {
        "id": "symptom_pattern",
        "category": "symptoms",
        "question": "Do your symptoms come and go, or are they constant? Is there any time of day when they feel worse?",
        "follow_up_hint": "pattern"
    },
    {
        "id": "associated_symptoms",
        "category": "symptoms",
        "question": "Are you experiencing any other symptoms along with this? For example, headache, fever, fatigue, nausea, or any pain elsewhere?",
        "follow_up_hint": "associated"
    },
    {
        "id": "medical_history",
        "category": "history",
        "question": "Do you have any pre-existing medical conditions or are you currently taking any medications?",
        "follow_up_hint": "history"
    },
    {
        "id": "lifestyle",
        "category": "lifestyle",
        "question": "How has your sleep been lately? And how would you describe your stress levels?",
        "follow_up_hint": "lifestyle"
    },
    {
        "id": "allergies",
        "category": "safety",
        "question": "Do you have any known allergies, especially to any medications?",
        "follow_up_hint": "allergies"
    },
    {
        "id": "final",
        "category": "closing",
        "question": "Is there anything else you'd like me to know about your health that we haven't covered?",
        "follow_up_hint": "additional"
    }
]

def get_question_by_index(index: int) -> dict:
    """Get a question by its index in the sequence."""
    if 0 <= index < len(INTERVIEW_QUESTIONS):
        return INTERVIEW_QUESTIONS[index]
    return None

def get_total_questions() -> int:
    """Total number of base interview questions."""
    return len(INTERVIEW_QUESTIONS)
