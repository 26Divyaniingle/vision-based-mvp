"""
FAISS Vector Store Module
FAISS (Facebook AI Similarity Search) is a library for efficient similarity search.
This module stores and searches medical case embeddings for the RAG system.
It allows quick retrieval of similar past cases based on symptoms or medical conditions.
"""

import faiss
import numpy as np
import os

# Set up paths for the FAISS index file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX_FILE = os.path.join(BASE_DIR, "data", "faiss_index", "cases.index")
dimension = 384  # MiniLM-L6-v2 embedding produces 384-dimensional vectors

def _load_or_create_index():
    """
    Load an existing FAISS index from disk, or create a new one if it doesn't exist.
    The index is saved to a file so we keep all past cases between app restarts.
    """
    if os.path.exists(INDEX_FILE):
        # Load existing index from file
        return faiss.read_index(INDEX_FILE)
    # Create a new empty index if file doesn't exist
    # IndexFlatL2 calculates L2 (Euclidean) distance between vectors
    return faiss.IndexFlatL2(dimension)

# Load or create the index when this module is imported
index = _load_or_create_index()
# List to store metadata about each case (disease, symptoms, medication, etc.)
stored_cases_metadata = []

def add_case(embedding: list, metadata: dict):
    """
    Add a new medical case to the vector store.
    This stores both the numerical embedding and the metadata (disease, symptoms, medicine, etc.).
    """
    global index, stored_cases_metadata
    # Convert embedding to numpy array in float32 format (required by FAISS)
    arr = np.array([embedding], dtype=np.float32)
    # Add the embedding vector to the index
    index.add(arr)
    # Store the metadata (disease, symptoms, medication, etc.)
    stored_cases_metadata.append(metadata)
    # Save the updated index to disk so we don't lose data
    faiss.write_index(index, INDEX_FILE)

def search_similar_cases(embedding: list, top_k=3):
    """
    Search for similar medical cases in the vector store.
    Returns the top_k most similar cases with their metadata and similarity scores.
    This is used to find similar symptoms/conditions from past cases for diagnosis help.
    """
    global index, stored_cases_metadata
    # Return empty list if no cases in index yet
    if index.ntotal == 0:
        return []
    
    # Convert embedding to numpy array in float32 format
    arr = np.array([embedding], dtype=np.float32)
    # Search the index for the k nearest neighbors
    # distances: L2 distances from the query to each result
    # indices: which cases are the most similar
    distances, indices = index.search(arr, top_k)
    
    # Convert distances to similarity scores and prepare results
    results = []
    for i, idx in enumerate(indices[0]):
        # Make sure the index is valid
        if idx != -1 and idx < len(stored_cases_metadata):
            results.append({
                "case": stored_cases_metadata[idx],  # The metadata of the similar case
                # Convert distance to similarity score (higher = more similar)
                "score": float(1.0 / (1.0 + distances[0][i]))
            })
    return results

