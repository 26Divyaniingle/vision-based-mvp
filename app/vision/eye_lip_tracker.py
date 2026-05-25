import cv2
import numpy as np
import base64
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import threading

# Global instance for reuse
_detector = None
_lock = threading.Lock()

def get_face_landmarker():
    global _detector
    with _lock:
        if _detector is None:
            try:
                model_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
                if not os.path.exists(model_path):
                    # Fallback path for different launch contexts
                    model_path = os.path.abspath("app/vision/face_landmarker.task")
                
                base_options = python.BaseOptions(model_asset_path=model_path)
                options = vision.FaceLandmarkerOptions(
                    base_options=base_options,
                    output_face_blendshapes=True,
                    output_facial_transformation_matrixes=True,
                    num_faces=1
                )
                _detector = vision.FaceLandmarker.create_from_options(options)
            except Exception as e:
                print(f"Error initializing FaceLandmarker: {e}")
                _detector = None
    return _detector


def extract_vision_features(image_base64: str) -> dict:
    """
    Extracts real physical features from the face using MediaPipe Tasks API.
    Computes Eye Aspect Ratio (EAR) for strain and lip distance for tension.
    """
    try:
        # Decode image
        if "," in image_base64:
            try:
                image_base64 = image_base64.split(",")[1]
            except IndexError:
                pass
                
        # Add padding if needed
        image_base64 = image_base64.strip()
        padding = len(image_base64) % 4
        if padding > 0:
            image_base64 += "=" * (4 - padding)
            
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}
        
        h, w, _ = img.shape
        detector = get_face_landmarker()
        if not detector:
            # If detector fails to load, we can't do landmark-based analysis
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}

        # Convert to MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        
        with _lock:
            result = detector.detect(mp_image)
        
        if not result.face_landmarks:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}
        
        # New API returns a list of lists of landmarks
        landmarks = result.face_landmarks[0]
        
        # 0. Coordinate Scaling (Crucial for Aspect Ratio)
        aspect = w / h
        # Helper to get physical-pixel-representative distance relative to image height
        def get_dist(p1_idx, p2_idx):
            dx = (landmarks[p1_idx].x - landmarks[p2_idx].x) * aspect
            dy = (landmarks[p1_idx].y - landmarks[p2_idx].y)
            return np.sqrt(dx*dx + dy*dy)

        # 1. Eye Strain (EAR - Eye Aspect Ratio)
        def get_ear_corrected(top, bot, left, right):
            v = get_dist(top, bot)
            h = get_dist(left, right)
            return v / (h + 1e-6)

        # Indices are consistent between old and new MediaPipe FaceMesh
        ear_l = get_ear_corrected(159, 145, 33, 133)
        ear_r = get_ear_corrected(386, 374, 362, 263)
        avg_ear = (ear_l + ear_r) / 2.0
        
        # Sensitivity: Standard EAR is ~0.25-0.30 for open eyes.
        # Slightly adjusted threshold for better detection
        eye_strain = max(0, min(1.0, 1.0 - (avg_ear / 0.32)))
        
        # 2. Lip Tension (Compression & Pursing)
        mouth_h = get_dist(0, 17)
        mouth_w = get_dist(61, 291)
        inner_h = get_dist(13, 14) # Opening
        
        if inner_h > 0.04:
            lip_tension = 0.0
        else:
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
        return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "face_detected": False}
