"""
Similarity Engine Module
This module contains the core algorithm for comparing two embeddings.
It uses cosine similarity to calculate how similar two text embeddings are.
The result is between 0 (completely different) and 1 (identical).
"""

import numpy as np

def cosine_similarity(v1: list, v2: list) -> float:
    """
    Calculate the cosine similarity between two embedding vectors.
    Cosine similarity measures the angle between two vectors in multidimensional space.
    
    Returns:
    - 1.0 if vectors point in the same direction (very similar)
    - 0.0 if vectors are perpendicular (no similarity)
    - -1.0 if vectors point in opposite directions (very different)
    
    Results near 1.0 indicate very similar texts/symptoms/conditions.
    """
    # Convert lists to numpy arrays for numerical computation
    a, b = np.array(v1), np.array(v2)
    
    # Calculate dot product (sum of element-wise multiplication)
    dot = np.dot(a, b)
    
    # Calculate the magnitude (length) of each vector
    norma = np.linalg.norm(a)
    normb = np.linalg.norm(b)
    
    # Avoid division by zero
    if norma == 0 or normb == 0:
        return 0.0
    
    # Cosine similarity formula: dot(a,b) / (norm(a) * norm(b))
    return dot / (norma * normb)

