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
    nparr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
    
    # Decode the image array using OpenCV (reads as BGR format)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    try:
        # Use DeepFace to analyze emotions
        # actions=['emotion'] - only analyze emotions (speeds up processing)
        # enforce_detection=False - continue even if face detection is uncertain
        # detector_backend="opencv" - use OpenCV for face detection (faster than alternatives)
        objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="opencv")
        
        # Check if any faces were detected and analyzed
        if len(objs) > 0:
            # Return the dominant (most likely) emotion for the first detected face
            return objs[0]['dominant_emotion']
    except Exception as e:
        print("Emotion analysis error:", e)
    
    # Return neutral if anything goes wrong
    return "neutral"

