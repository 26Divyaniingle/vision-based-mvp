import cv2
import numpy as np
import base64
from app.vision.face_detection import FaceDetector
from app.vision.behavior_analysis import BehaviorAnalyzer

face_detector = FaceDetector()
behavior_analyzer = BehaviorAnalyzer()

def extract_vision_features(image_base64: str) -> dict:
    if not image_base64:
        return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "attention": "low", "eye_contact": "low"}
    try:
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        landmarks = face_detector.get_landmarks(img)
        
        if not landmarks:
            return {"eye_strain_score": 0.0, "lip_tension": 0.0, "blink_count": 0, "attention": "low", "eye_contact": "low"}
            
        eye_contact, attention = behavior_analyzer.analyze(landmarks, img.shape)
        
        strain_score = 0.0
        lip_tension = 0.0
        
        if eye_contact == "low":
            strain_score = 0.8
        elif eye_contact == "medium":
            strain_score = 0.4
            
        if attention == "low":
            lip_tension = 0.8
        elif attention == "medium":
            lip_tension = 0.4

        return {
            "eye_strain_score": strain_score,
            "lip_tension": lip_tension,
            "blink_count": 0,
            "attention": attention,
            "eye_contact": eye_contact
        }
    except Exception as e:
        print("Vision feature extraction error:", e)
        return {
            "eye_strain_score": 0.50,
            "lip_tension": 0.30,
            "blink_count": 0,
            "attention": "low",
            "eye_contact": "low"
        }
