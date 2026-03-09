import numpy as np

def cosine_similarity(v1: list, v2: list) -> float:
    a, b = np.array(v1), np.array(v2)
    dot = np.dot(a, b)
    norma = np.linalg.norm(a)
    normb = np.linalg.norm(b)
    if norma == 0 or normb == 0:
        return 0.0
    return dot / (norma * normb)
