from deepface import DeepFace
import cv2
import numpy as np
import base64

def get_face_embedding(image_base64: str, enforce_detection: bool = True) -> list:
    try:
        # Ensure proper base64 padding
        if "," in image_base64:
            try:
                image_base64 = image_base64.split(",")[1]
            except IndexError:
                pass # Already clean
        
        # Remove any whitespace/newlines that might be present
        image_base64 = image_base64.strip()
        
        # Add padding if needed
        padding = len(image_base64) % 4
        if padding > 0:
            image_base64 += "=" * (4 - padding)
        # Decode base64 to image
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []
            
        # Optimize image size for faster face detection if it's too large (e.g. from high-res phone cameras)
        h, w = img.shape[:2]
        max_size = 640
        if max(h, w) > max_size:
            scale = max_size / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    except Exception as e:
        print(f"Base64 decode error: {e}")
        return []
    
    # Generate embedding using DeepFace (Facenet)
    try:
        # Preferred detectors: 'ssd' or 'mtcnn' are more robust than 'opencv'
        # We avoid 'mediapipe' here because of incompatibilities with some environments
        try:
            objs = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=enforce_detection, detector_backend="ssd")
        except Exception as e:
            # print(f"DEBUG: SSD detector failed or not available, falling back to opencv: {e}")
            objs = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=enforce_detection, detector_backend="opencv")
            
        if objs and len(objs) > 0:
            return objs[0]["embedding"]
    except ValueError:
        # DeepFace raises ValueError if no face is detected with enforce_detection=True
        return []
    except Exception as e:
        print(f"Deepface error: {e}")
    return []

def verify_face(current_image_b64: str, reference_embedding: list, enforce_detection: bool = True, threshold: float = 0.4) -> bool:
    """
    Verifies if the face in current_image_b64 matches the reference_embedding.
    """
    if not reference_embedding:
        print("DEBUG: verify_face - No reference embedding provided. Skipping.")
        return True, 0.0 # Can't verify if no reference exists
        
    current_embedding = get_face_embedding(current_image_b64, enforce_detection=enforce_detection)
    if not current_embedding:
        # print("DEBUG: verify_face - No face detected in current frame.")
        return None, 0.0 # No face detected in current frame
        
    # Calculate cosine similarity
    # Cosine distance = 1 - (A . B) / (||A|| * ||B||)
    a = np.array(current_embedding)
    b = np.array(reference_embedding)
    
    # Simple dot product for unit vectors (DeepFace embeddings are usually normalized)
    dot_prod = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    distance = 1 - dot_prod / (norm_a * norm_b + 1e-6)
    
    # distance < threshold means it's the same person
    is_verified = distance < threshold
    
    print(f"DEBUG: verify_face - Distance: {distance:.4f}, Threshold: {threshold}, Verified: {is_verified}")
    
    return is_verified, distance
