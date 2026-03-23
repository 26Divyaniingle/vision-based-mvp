import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

class MedicineRetriever:
    def __init__(self, index_path=None, metadata_path=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.index_path = index_path or os.path.join(base_dir, "faiss", "medicine_index.faiss")
        self.metadata_path = metadata_path or os.path.join(base_dir, "faiss", "medicine_metadata.pkl")
        
        # Load model
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Load FAISS index
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            print(f"Warning: Medicine index not found at {self.index_path}")
            self.index = None
            
        # Load metadata
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            print(f"Warning: Medicine metadata not found at {self.metadata_path}")
            self.metadata = None

    def retrieve_medicines(self, disease: str, top_k: int = 3):
        """
        Searches medicine index for medicines related to the disease.
        """
        if self.index is None or self.metadata is None:
            return []

        # 1. Convert disease to embedding
        # We can also search by just the name of the disease
        query = f"Disease: {disease}"
        embedding = self.model.encode([query]).astype('float32')
        
        # 2. Search medicine FAISS index
        distances, indices = self.index.search(embedding, top_k)
        
        # 3. Return top medicines
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                results.append(self.metadata[idx])
        
        return results

def retrieve_medicines(disease: str):
    retriever = MedicineRetriever()
    return retriever.retrieve_medicines(disease)

if __name__ == "__main__":
    # Test
    test_disease = "Flu"
    print(f"Searching medicines for: {test_disease}")
    results = retrieve_medicines(test_disease)
    for med in results:
        print(f"Name: {med['name']}, Uses: {med['uses']}")
