from app.core.embedding_engine import generate_text_embedding
from app.core.faiss_store import add_case

class LearningAgent:
    def store_session(self, form_data: dict, vision: dict, condition: str, medication: str):
        """Store the session summary in the vector database for future reference."""
        text_summary = f"Symptoms: {form_data.get('symptoms', '')}. Emotion: {vision.get('emotion', '')}. Condition: {condition}. Meds: {medication}."
        emb = generate_text_embedding(text_summary)
        add_case(emb, {"condition": condition, "medication": medication, "symptoms": form_data.get('symptoms', '')})

# Backward compatibility
def store_session_for_learning(form_data: dict, vision: dict, condition: str, medication: str):
    agent = LearningAgent()
    agent.store_session(form_data, vision, condition, medication)
