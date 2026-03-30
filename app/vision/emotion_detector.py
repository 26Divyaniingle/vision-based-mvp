import cv2
import numpy as np
import base64
from app.vision.emotion_detection import EmotionDetector

detector = EmotionDetector()

def analyze_emotion(image_base64: str) -> str:
    if not image_base64:
        return "neutral"
    
    try:
        nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        dominant_emotion, confidence = detector.detect_emotion(img)
        return dominant_emotion
        
    except Exception as e:
        print("Emotion analysis error:", e)
        return "neutral"
