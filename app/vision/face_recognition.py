from deepface import DeepFace
import cv2
import numpy as np
import base64

def get_face_embedding(image_base64: str) -> list:
    # Decode base64 to image
    nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Generate embedding using DeepFace (Facenet)
    try:
        # Using opencv for maximum speed in an MVP, with detection enforced to False to prevent crashes.
        objs = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=False, detector_backend="opencv")
        if len(objs) > 0:
            return objs[0]["embedding"]
    except Exception as e:
        print(f"Deepface error: {e}")
    return []
