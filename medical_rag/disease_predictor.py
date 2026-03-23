import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

class DiseasePredictor:
    def __init__(self, index_path=None, metadata_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.index_path = index_path or os.path.join(base_dir, "faiss", "disease_index.faiss")
        self.metadata_path = metadata_path or os.path.join(base_dir, "faiss", "disease_metadata.pkl")
        
        # Load model
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Load FAISS index
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            raise FileNotFoundError(f"Disease index not found at {self.index_path}")
            
        # Load metadata
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            raise FileNotFoundError(f"Disease metadata not found at {self.metadata_path}")

    def predict_disease(self, symptoms: str, top_k: int = 3):
        """
        Converts symptoms to embedding, searches FAISS index, and returns top_k diseases.
        """
        # 1. Convert symptoms to embedding
        embedding = self.model.encode([symptoms]).astype('float32')
        
        # 2. Search disease_index.faiss
        distances, indices = self.index.search(embedding, top_k)
        
        # 3. Return top diseases
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                results.append(self.metadata[idx]['disease'])
        
        return results

def predict_disease(symptoms: str):
    predictor = DiseasePredictor()
    return predictor.predict_disease(symptoms)

if __name__ == "__main__":
    # Test
    test_symptoms = "high fever cough headache"
    print(f"Symptoms: {test_symptoms}")
    predictions = predict_disease(test_symptoms)
    print(f"Predicted Diseases: {predictions}")
