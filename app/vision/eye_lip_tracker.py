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
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}
        
        h, w, _ = img.shape
        face_mesh = get_face_mesh()
        if not face_mesh:
            return {"eye_strain_score": 0.5, "lip_tension": 0.3, "blink_count": 0, "face_detected": False}

        results = face_mesh.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if not results.multi_face_landmarks:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}
        
        landmarks = results.multi_face_landmarks[0].landmark
        
        # 0. Coordinate Scaling (Crucial for Aspect Ratio)
        aspect = w / h
        # Helper to get physical-pixel-representative distance relative to image height
        def get_dist(p1_idx, p2_idx):
            dx = (landmarks[p1_idx].x - landmarks[p2_idx].x) * aspect
            dy = (landmarks[p1_idx].y - landmarks[p2_idx].y)
            return np.sqrt(dx*dx + dy*dy)

        # 1. Eye Strain (EAR - Eye Aspect Ratio)
        # Standard EAR uses vertical distance / horizontal distance
        def get_ear_corrected(top, bot, left, right):
            v = get_dist(top, bot)
            h = get_dist(left, right)
            return v / (h + 1e-6)

        ear_l = get_ear_corrected(159, 145, 33, 133)
        ear_r = get_ear_corrected(386, 374, 362, 263)
        avg_ear = (ear_l + ear_r) / 2.0
        
        # Sensitivity: Standard EAR is ~0.25-0.30 for open eyes.
        # We want score > 0 when eyes start to squint (< 0.28).
        # We'll use 0.32 as a soft baseline to capture subtle strain.
        eye_strain = max(0, min(1.0, 1.0 - (avg_ear / 0.32)))
        
        # 2. Lip Tension (Compression & Pursing)
        # We use outer height (0-17) and width (61-291)
        mouth_h = get_dist(0, 17)
        mouth_w = get_dist(61, 291)
        inner_h = get_dist(13, 14) # Opening
        
        # A relaxed closed mouth has mouth_h/mouth_w ratio around 0.2 
        # A tense/compressed mouth has a smaller ratio.
        # If mouth is wide open (inner_h > 0.05), it's talking, not tension.
        if inner_h > 0.04:
            lip_tension = 0.0
        else:
            # Scale ratio to 0-1 score where < 0.18 is tense
            ratio = mouth_h / (mouth_w + 1e-6)
            lip_tension = max(0, min(1.0, 1.0 - (ratio / 0.22)))

        return {
            "eye_strain_score": round(float(eye_strain), 2),
            "lip_tension": round(float(lip_tension), 2),
            "blink_count": 0,
            "face_detected": True
        }
        
    except Exception as e:
        print("Vision feature extraction error:", e)
        return {"eye_strain_score": 0.5, "lip_tension": 0.3, "blink_count": 0, "face_detected": False}
