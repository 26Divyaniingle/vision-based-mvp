"""
Webcam Analysis
Uses DeepFace (FER) and MediaPipe to detect expressions:
stress, discomfort, fatigue, pain.
"""
from app.vision.emotion_detector import analyze_emotion
from app.vision.eye_lip_tracker import extract_vision_features

def analyze_webcam_frame(image_base64: str) -> dict:
    emotion = analyze_emotion(image_base64)
    features = extract_vision_features(image_base64)
    
    # Map basic emotions + strain to custom stress/fatigue states
    stress = False
    fatigue = False
    pain = False
    discomfort = False
    
    if emotion in ["fear", "angry", "sad"]:
        stress = True
    if features.get("eye_strain_score", 0) > 0.6:
        fatigue = True
    if features.get("lip_tension", 0) > 0.6:
        discomfort = True
    if emotion == "angry" and features.get("lip_tension", 0) > 0.8:
        pain = True
        
    return {
        "emotion": emotion,
        "features": features,
        "distress_flags": {
            "stress": stress,
            "fatigue": fatigue,
            "pain": pain,
            "discomfort": discomfort
        }
    }
