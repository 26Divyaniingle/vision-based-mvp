from app.core.embedding_engine import generate_text_embedding
from app.core.faiss_store import search_similar_cases

def get_similar_cases(form_data: dict, vision_emotion: str):
    summary = f"Symptoms: {form_data.get('symptoms', '')}. Emotion: {vision_emotion}."
    emb = generate_text_embedding(summary)
    return search_similar_cases(emb, top_k=2)
