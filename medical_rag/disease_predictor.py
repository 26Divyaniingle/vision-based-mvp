"""
Disease Predictor Module
This module predicts likely diseases based on patient symptoms.
It uses FAISS (vector similarity search) to find diseases matching the symptom description.
The predictions are based on a pre-built knowledge base of diseases and their associated symptoms.
"""

import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

class DiseasePredictor:
    """
    Predicts medical conditions based on patient symptom descriptions.
    Uses vector similarity search with FAISS for efficient retrieval.
    """
    
    def __init__(self, index_path=None, metadata_path=None):
        """
        Initialize the disease predictor with FAISS index and metadata.
        
        Args:
            index_path: Path to the FAISS index file
            metadata_path: Path to the disease metadata file
        """
        # Set default paths in the faiss directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.index_path = index_path or os.path.join(base_dir, "faiss", "disease_index.faiss")
        self.metadata_path = metadata_path or os.path.join(base_dir, "faiss", "disease_metadata.pkl")
        
        # Load the embedding model (converts text to vectors)
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Load the FAISS index (contains disease embeddings)
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            raise FileNotFoundError(f"Disease index not found at {self.index_path}")
            
        # Load the disease metadata (disease names and information)
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            raise FileNotFoundError(f"Disease metadata not found at {self.metadata_path}")

    def predict_disease(self, symptoms: str, top_k: int = 3):
        """
        Predict likely diseases from a symptom description.
        
        Process:
        1. Convert symptoms to a numerical embedding
        2. Search FAISS index for similar diseases
        3. Return the top_k matching diseases
        
        Args:
            symptoms: Patient's symptom description (e.g., "high fever, cough, headache")
            top_k: Number of top disease matches to return (default 3)
            
        Returns:
            List of disease names predicted from the symptoms
        """
        # Step 1: Convert the symptom text into a numerical embedding
        embedding = self.model.encode([symptoms]).astype('float32')
        
        # Step 2: Search the FAISS index for the k nearest diseases
        # distances: how close each result is (lower = better match)
        # indices: which diseases were matched
        distances, indices = self.index.search(embedding, top_k)
        
        # Step 3: Convert indices to disease names
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                # Add the disease name to results
                results.append(self.metadata[idx]['disease'])
        
        return results

# Global instance for performance (avoid reloading models and indices)
_predictor = None

def predict_disease(symptoms: str):
    """
    Convenient function to predict diseases from symptoms.
    Uses a global predictor instance for speed.
    """
    global _predictor
    if _predictor is None:
        _predictor = DiseasePredictor()
    return _predictor.predict_disease(symptoms)

if __name__ == "__main__":
    # Test the disease predictor
    test_symptoms = "high fever cough headache"
    print(f"Symptoms: {test_symptoms}")
    predictions = predict_disease(test_symptoms)
    print(f"Predicted Diseases: {predictions}")

