from sentence_transformers import SentenceTransformer
import numpy as np
import os

# Initialize models globally (cached)
_model = None

def _get_model():
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception:
            _model = None
    return _model

def generate_text_embedding(text: str) -> list:
    model = _get_model()
    if not model:
        return np.zeros(384).tolist()
    emb = model.encode([text])
    return emb[0].tolist()
