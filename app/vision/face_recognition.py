from deepface import DeepFace
import cv2
import numpy as np
import base64

def get_face_embedding(image_base64: str) -> list:
    try:
        # Ensure proper base64 padding
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        image_base64 += "=" * ((4 - len(image_base64) % 4) % 4)
        # Decode base64 to image
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []
    except Exception as e:
        print(f"Base64 decode error: {e}")
        return []
    
    # Generate embedding using DeepFace (Facenet)
    try:
        # Using opencv for maximum speed in an MVP, with detection enforced to False to prevent crashes.
        objs = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=False, detector_backend="opencv")
        if len(objs) > 0:
            return objs[0]["embedding"]
    except Exception as e:
        print(f"Deepface error: {e}")
    return []

def verify_face(current_image_b64: str, reference_embedding: list) -> bool:
    """
    Verifies if the face in current_image_b64 matches the reference_embedding.
    Returns True if match, False otherwise.
    """
    if not reference_embedding:
        return True # Can't verify if no reference exists
        
    current_embedding = get_face_embedding(current_image_b64)
    if not current_embedding:
        return False # No face detected in current frame
        
    # Calculate cosine similarity
    # Cosine distance = 1 - (A . B) / (||A|| * ||B||)
    a = np.array(current_embedding)
    b = np.array(reference_embedding)
    
    # Simple dot product for unit vectors (DeepFace embeddings are usually normalized)
    distance = 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    # Stricter threshold for Facenet (0.3 instead of 0.4)
    # distance < 0.3 means it's the same person
    return distance < 0.3, distance


