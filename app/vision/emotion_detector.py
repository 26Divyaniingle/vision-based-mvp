"""
Emotion Detection Module
This module analyzes facial expressions in images to detect the user's emotional state.
It uses the DeepFace library with emotion recognition to classify emotions like happy, sad, angry, etc.
The emotion data is used to assess patient distress levels during medical consultations.
"""

from deepface import DeepFace
import cv2
import numpy as np
import base64

def analyze_emotion(image_base64: str) -> str:
    """
    Analyze an image to detect the person's dominant emotion.
    
    Args:
        image_base64: A base64-encoded image of a person's face
        
    Returns:
        A string representing the detected emotion (e.g., 'happy', 'sad', 'angry', 'neutral', 'fearful')
        Returns 'neutral' if emotion detection fails
    """
    # Decode the base64 image to a numpy array
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
    
    # Decode the image array using OpenCV (reads as BGR format)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    try:
        # Use DeepFace to analyze emotions
        # Use opencv as it is more compatible in this environment
        objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="opencv")
        
        if objs and len(objs) > 0:
            # Check if a face was actually detected (OpenCV backend might return empty face if not found)
            if 'region' in objs[0] and (objs[0]['region']['w'] == 0 or objs[0]['region']['h'] == 0):
                return None

            emotion_scores = objs[0]['emotion']
            dominant = objs[0]['dominant_emotion']
            
            # Clinical Priority Thresholds
            clinical_threshold = 15.0  # If a clinical emotion is > 15%, it's significant
            
            clinical_emotions = ['sad', 'fear', 'angry', 'disgust']
            best_clinical_emo = None
            max_clinical_score = 0
            
            for emo in clinical_emotions:
                score = emotion_scores.get(emo, 0)
                if score > clinical_threshold and score > max_clinical_score:
                    max_clinical_score = score
                    best_clinical_emo = emo
            
            # If we found a significant clinical emotion, and neutral isn't overwhelming (>80%)
            # we prefer the clinical emotion for a more 'mature' analysis.
            if best_clinical_emo and emotion_scores.get('neutral', 0) < 80.0:
                return best_clinical_emo
                
            return dominant
    except Exception as e:
        print("Emotion analysis error:", e)
    
    # Return None if anything goes wrong to distinguish from 'neutral'
    return None

