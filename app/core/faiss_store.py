import faiss
import numpy as np
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX_FILE = os.path.join(BASE_DIR, "data", "faiss_index", "cases.index")
dimension = 384 # MiniLM-L6-v2 size

def _load_or_create_index():
    if os.path.exists(INDEX_FILE):
        return faiss.read_index(INDEX_FILE)
    return faiss.IndexFlatL2(dimension)

index = _load_or_create_index()
stored_cases_metadata = []

def add_case(embedding: list, metadata: dict):
    global index, stored_cases_metadata
    arr = np.array([embedding], dtype=np.float32)
    index.add(arr)
    stored_cases_metadata.append(metadata)
    faiss.write_index(index, INDEX_FILE)

def search_similar_cases(embedding: list, top_k=3):
    global index, stored_cases_metadata
    if index.ntotal == 0:
        return []
        
    arr = np.array([embedding], dtype=np.float32)
    distances, indices = index.search(arr, top_k)
    
    results = []
    for i, idx in enumerate(indices[0]):
        if idx != -1 and idx < len(stored_cases_metadata):
            results.append({
                "case": stored_cases_metadata[idx],
                "score": float(1.0 / (1.0 + distances[0][i])) # Convert distance to similarity
            })
    return results
