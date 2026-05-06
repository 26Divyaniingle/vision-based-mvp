"""
Medicine Retriever Module
This module retrieves relevant medicines for a given disease.
It uses FAISS to search through a database of medicines and match them to diseases.
This is part of the RAG (Retrieval Augmented Generation) system.
"""

import faiss
import pickle
import numpy as np
import os
from sentence_transformers import SentenceTransformer

class MedicineRetriever:
    """
    Retrieves medicines for a given disease from the knowledge base.
    Uses vector similarity search with FAISS for efficient retrieval.
    """
    
    def __init__(self, index_path=None, metadata_path=None):
        """
        Initialize the medicine retriever with FAISS index and metadata.
        
        Args:
            index_path: Path to the FAISS index file containing medicine embeddings
            metadata_path: Path to the medicine metadata file
        """
        # Set default paths in the faiss directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.index_path = index_path or os.path.join(base_dir, "faiss", "medicine_index.faiss")
        self.metadata_path = metadata_path or os.path.join(base_dir, "faiss", "medicine_metadata.pkl")
        
        # Load the embedding model (converts text to vectors)
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        
        # Load the FAISS index (contains medicine embeddings)
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            print(f"Warning: Medicine index not found at {self.index_path}")
            self.index = None
            
        # Load the medicine metadata (medicine names, uses, side effects, etc.)
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            print(f"Warning: Medicine metadata not found at {self.metadata_path}")
            self.metadata = None

    def retrieve_medicines(self, disease: str, top_k: int = 3):
        """
        Retrieve medicines recommended for a specific disease.
        
        Process:
        1. Convert the disease name to an embedding
        2. Search FAISS index for similar medicines
        3. Return the top_k most relevant medicines
        
        Args:
            disease: The disease name to find medicines for (e.g., "Flu")
            top_k: Number of top medicine matches to return (default 3)
            
        Returns:
            List of medicine records with details (name, uses, dosage, side effects, etc.)
            Returns empty list if index/metadata not available
        """
        # Safety check: return empty if index not loaded
        if self.index is None or self.metadata is None:
            return []

        # Step 1: Convert disease to a search query and embed it
        # We create a descriptive query to help find relevant medicines
        query = f"Disease: {disease}"
        embedding = self.model.encode([query]).astype('float32')
        
        # Step 2: Search the FAISS medicine index for top_k matches
        # distances: how close each result is (lower = better match)
        # indices: which medicines were matched
        distances, indices = self.index.search(embedding, top_k)
        
        # Step 3: Convert indices to medicine data
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                # Add the medicine record (includes name, uses, side effects, etc.)
                results.append(self.metadata[idx])
        
        return results

# Global instance for performance (avoid reloading model and index)
_retriever = None

def retrieve_medicines(disease: str):
    """
    Convenient function to retrieve medicines for a disease.
    Uses a global retriever instance for speed.
    """
    global _retriever
    if _retriever is None:
        _retriever = MedicineRetriever()
    return _retriever.retrieve_medicines(disease)

if __name__ == "__main__":
    # Test the medicine retriever
    test_disease = "Flu"
    print(f"Searching medicines for: {test_disease}")
    results = retrieve_medicines(test_disease)
    for med in results:
        print(f"Name: {med['name']}, Uses: {med['uses']}")

