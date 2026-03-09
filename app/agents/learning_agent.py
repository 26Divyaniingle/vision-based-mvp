from app.core.embedding_engine import generate_text_embedding
from app.core.faiss_store import add_case

def store_session_for_learning(form_data: dict, vision: dict, condition: str, medication: str):
    text_summary = f"Symptoms: {form_data.get('symptoms', '')}. Emotion: {vision.get('emotion', '')}. Condition: {condition}. Meds: {medication}."
    emb = generate_text_embedding(text_summary)
    add_case(emb, {"condition": condition, "medication": medication, "symptoms": form_data.get('symptoms', '')})
