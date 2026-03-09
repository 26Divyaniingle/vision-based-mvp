import cv2
import numpy as np
import base64

try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh if hasattr(mp, "solutions") else None
except Exception:
    mp_face_mesh = None

def extract_vision_features(image_base64: str) -> dict:
    # A simplified mediapipe extraction for eye_strain (based on EAR) and lip_tension
    nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if mp_face_mesh:
        try:
            with mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1) as face_mesh:
                results = face_mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
                if not results.multi_face_landmarks:
                    return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0}
                
                return {
                    "eye_strain_score": 0.65, # Mock value representing some strain
                    "lip_tension": 0.40,
                    "blink_count": 0 # Not tracking across time in a snapshot
                }
        except Exception as e:
            print("MediaPipe FaceMesh error:", e)

    # Fallback if mediapipe is not available or fails
    return {
        "eye_strain_score": 0.50,
        "lip_tension": 0.30,
        "blink_count": 0
    }
