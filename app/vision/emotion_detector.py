from deepface import DeepFace
import cv2
import numpy as np
import base64

def analyze_emotion(image_base64: str) -> str:
    nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    try:
        objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="opencv")
        if len(objs) > 0:
            return objs[0]['dominant_emotion']
    except Exception as e:
        print("Emotion analysis error:", e)
    return "neutral"
