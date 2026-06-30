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
    
    # Decode the image array using OpenCV (reads as BGR format)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    try:
        # Use DeepFace to analyze emotions
        # Use ssd as it is more robust, falling back to opencv
        try:
            objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="ssd")
        except Exception:
            objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="opencv")
        
        if objs and len(objs) > 0:
            # Check if a face was actually detected
            region = objs[0].get('region', {})
            if region.get('w', 0) == 0 or region.get('h', 0) == 0:
                print("DEBUG: Emotion analysis - No face in region.")
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
        print(f"DeepFace emotion analysis error: {e}")
    
    # Return None if anything goes wrong to distinguish from 'neutral'
    return None

