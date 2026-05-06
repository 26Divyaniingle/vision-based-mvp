import cv2
import numpy as np
import base64

try:
    import mediapipe as mp
    mp_face_mesh = mp.solutions.face_mesh if hasattr(mp, "solutions") else None
except Exception:
    mp_face_mesh = None

# Global instance for reuse
_face_mesh = None

def get_face_mesh():
    global _face_mesh
    if _face_mesh is None and mp_face_mesh:
        _face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1)
    return _face_mesh


def extract_vision_features(image_base64: str) -> dict:
    """
    Extracts real physical features from the face using MediaPipe.
    Computes Eye Aspect Ratio (EAR) for strain and lip distance for tension.
    """
    try:
        # Decode image
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0}
        
        h, w, _ = img.shape
        face_mesh = get_face_mesh()
        if not face_mesh:
            return {"eye_strain_score": 0.5, "lip_tension": 0.3, "blink_count": 0}

        results = face_mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0}
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # 1. Lip Tension (Distance between upper and lower lip centers)
        # Landmark 0 (top lip center), 17 (bottom lip center)
        top_lip = np.array([landmarks[0].x, landmarks[0].y])
        bot_lip = np.array([landmarks[17].x, landmarks[17].y])
        lip_dist = np.linalg.norm(top_lip - bot_lip)
        # Normalize: larger opening = lower tension, very tight = high tension
        # We'll treat very tight or pursed as tension > 0.6
        lip_tension = max(0, 1.0 - (lip_dist * 5.0)) # Mapping distance to a 0-1 tension score
        
        # 2. Eye Strain (Inverse of EAR)
        # Left Eye: 159 (top), 145 (bottom). Right Eye: 386 (top), 374 (bottom)
        # Note: EAR = (vertical dist) / (horizontal dist)
        def get_ear(top_idx, bot_idx, left_idx, right_idx):
            v = np.linalg.norm(np.array([landmarks[top_idx].x, landmarks[top_idx].y]) - 
                               np.array([landmarks[bot_idx].x, landmarks[bot_idx].y]))
            h = np.linalg.norm(np.array([landmarks[left_idx].x, landmarks[left_idx].y]) - 
                               np.array([landmarks[right_idx].x, landmarks[right_idx].y]))
            return v / (h + 1e-6)

        ear_l = get_ear(159, 145, 33, 133)
        ear_r = get_ear(386, 374, 362, 263)
        avg_ear = (ear_l + ear_r) / 2.0
        
        # Eye strain is high when eyes are squinting (low EAR)
        # Healthy open eye EAR is ~0.25-0.30. Squinting is < 0.15.
        eye_strain = max(0, min(1.0, 1.0 - (avg_ear / 0.35)))
        
        return {
            "eye_strain_score": round(float(eye_strain), 2),
            "lip_tension": round(float(lip_tension), 2),
            "blink_count": 0
        }
        
    except Exception as e:
        print("Vision feature extraction error:", e)
        return {"eye_strain_score": 0.5, "lip_tension": 0.3, "blink_count": 0}
