"""
Interview Engine - Manages the state machine for the medical interview chatbot.
Tracks questions, answers, extracted symptoms, and vision analysis across the session.
"""
import time
import uuid
from typing import Optional
from app.interview.question_bank import INTERVIEW_QUESTIONS, get_question_by_index, get_total_questions
from app.interview.symptom_extractor import extract_symptoms_from_response, generate_follow_up_question


# In-memory interview sessions (for MVP; production would use Redis/DB)
_active_interviews = {}


class InterviewSession:
    """Represents an ongoing interview session."""

    def __init__(self, patient_id: int, patient_name: str):
        self.session_id = str(uuid.uuid4())[:8]
        self.patient_id = patient_id
        self.patient_name = patient_name
        self.current_question_index = 0
        self.conversation_history = []  # List of {"role": "ai"/"patient", "text": "..."}
        self.extracted_symptoms = []
        self.all_extractions = []  # Raw extraction results per answer
        self.vision_frames = []  # Accumulated vision analysis results
        self.started_at = time.time()
        self.completed = False
        self.follow_up_count = 0
        self.max_follow_ups = 2  # Max dynamic follow-ups between base questions

    def get_current_question(self) -> Optional[str]:
        """Get the current question to ask."""
        q = get_question_by_index(self.current_question_index)
        if q:
            return q["question"]
        return None

    def process_answer(self, answer_text: str, vision_snapshot: dict = None) -> dict:
        """
        Process a patient's answer:
        1. Record the answer
        2. Extract symptoms via NLP
        3. Add vision data
        4. Determine the next question
        """
        current_q = get_question_by_index(self.current_question_index)
        question_context = current_q["question"] if current_q else "General follow-up"

        # Record conversation
        self.conversation_history.append({
            "role": "ai",
            "text": question_context
        })
        self.conversation_history.append({
            "role": "patient",
            "text": answer_text
        })

        # Extract symptoms from this answer
        extraction = extract_symptoms_from_response(
            answer_text, question_context, self.extracted_symptoms
        )
        self.all_extractions.append(extraction)

        # Accumulate new symptoms
        new_symptoms = extraction.get("new_symptoms", [])
        for s in new_symptoms:
            if s and s not in self.extracted_symptoms:
                self.extracted_symptoms.append(s)

        # Add vision snapshot if provided
        if vision_snapshot:
            self.vision_frames.append(vision_snapshot)

        # Determine next action
        return self._get_next_step(extraction)

    def _get_next_step(self, latest_extraction: dict) -> dict:
        """Determine the next question or signal completion."""
        total_base = get_total_questions()

        # Check if we've asked all base questions
        if self.current_question_index >= total_base - 1:
            self.completed = True
            return {
                "status": "completed",
                "message": "Thank you for answering all the questions. I now have enough information to help you. Let me analyze everything and prepare your assessment.",
                "next_question": None
            }

        # Move to next base question
        self.current_question_index += 1
        self.follow_up_count = 0

        next_q = self.get_current_question()
        return {
            "status": "continue",
            "next_question": next_q,
            "symptoms_so_far": self.extracted_symptoms,
            "question_number": self.current_question_index + 1,
            "total_questions": total_base
        }

    def add_vision_frame(self, vision_data: dict):
        """Add a vision analysis frame to the session."""
        vision_data["timestamp"] = time.time()
        self.vision_frames.append(vision_data)

    def get_vision_summary(self) -> dict:
        """Summarize all vision frames collected during the interview."""
        if not self.vision_frames:
            return {
                "dominant_emotion": "neutral",
                "avg_eye_strain": 0.0,
                "avg_lip_tension": 0.0,
                "emotion_counts": {},
                "total_frames": 0
            }

        emotions = [f.get("emotion", "neutral") for f in self.vision_frames]
        eye_strains = [f.get("eye_strain_score", 0) for f in self.vision_frames]
        lip_tensions = [f.get("lip_tension", 0) for f in self.vision_frames]

        # Count emotions
        emotion_counts = {}
        for e in emotions:
            emotion_counts[e] = emotion_counts.get(e, 0) + 1

        # Dominant emotion
        dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral"

        return {
            "dominant_emotion": dominant,
            "avg_eye_strain": sum(eye_strains) / len(eye_strains) if eye_strains else 0,
            "avg_lip_tension": sum(lip_tensions) / len(lip_tensions) if lip_tensions else 0,
            "emotion_counts": emotion_counts,
            "total_frames": len(self.vision_frames),
            "emotion_timeline": emotions[-10:]  # Last 10 for trend
        }

    def get_full_summary(self) -> dict:
        """Get complete interview summary for diagnosis."""
        return {
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "session_id": self.session_id,
            "duration_seconds": time.time() - self.started_at,
            "conversation_history": self.conversation_history,
            "extracted_symptoms": self.extracted_symptoms,
            "all_extractions": self.all_extractions,
            "vision_summary": self.get_vision_summary(),
            "total_questions_asked": self.current_question_index + 1
        }


def create_interview(patient_id: int, patient_name: str) -> InterviewSession:
    """Create and register a new interview session."""
    session = InterviewSession(patient_id, patient_name)
    _active_interviews[session.session_id] = session
    return session


def get_interview(session_id: str) -> Optional[InterviewSession]:
    """Retrieve an active interview session."""
    return _active_interviews.get(session_id)


def end_interview(session_id: str) -> Optional[dict]:
    """End an interview and return the full summary."""
    session = _active_interviews.get(session_id)
    if session:
        session.completed = True
        summary = session.get_full_summary()
        # Keep in memory for a bit (don't delete immediately)
        return summary
    return None
