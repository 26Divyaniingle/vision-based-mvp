"""
Embedding Engine Module
This module converts text into numerical embeddings (vectors).
Embeddings allow us to compare how similar different pieces of text are.
We use these embeddings for the RAG (Retrieval Augmented Generation) system.
All embeddings are 384-dimensional vectors from the all-MiniLM-L6-v2 model.
"""

from sentence_transformers import SentenceTransformer
import numpy as np
import os

# Initialize models globally (cached in memory)
# Having the model loaded globally means we don't reload it for every request
_model = None

def _get_model():
    """
    Get the embedding model, loading it on first use.
    This function returns None if the model fails to load.
    """
    global _model
    if _model is None:
        try:
            # Load the SentenceTransformer model for converting text to embeddings
            # all-MiniLM-L6-v2 is small, fast, and produces 384-dimensional vectors
            _model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception:
            _model = None
    return _model

def generate_text_embedding(text: str) -> list:
    """
    Convert a piece of text into a numerical embedding (list of 384 numbers).
    These embeddings capture the meaning of the text and allow similarity comparison.
    Returns a 384-dimensional vector as a Python list.
    If the model fails, returns a zero vector.
    """
    model = _get_model()
    if not model:
        # Return a zero vector if model isn't available
        return np.zeros(384).tolist()
    # Encode the text to get an embedding
    emb = model.encode([text])
    # Return the first (and only) embedding as a list
    return emb[0].tolist()

