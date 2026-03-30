from deepface import DeepFace

class EmotionDetector:
    """Handles emotion detection using DeepFace."""
    def __init__(self):
        pass

    def detect_emotion(self, frame):
        """Analyzes frame to extract dominant emotion and its confidence."""
        try:
            # Analyze frame for emotion, enforce_detection=False to avoid exceptions if face is not perfectly clear
            results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, silent=True)
            
            # DeepFace can return a list if multiple faces are found (though we expect 1 here)
            if isinstance(results, list):
                results = results[0]
                
            dominant_emotion = results.get('dominant_emotion', 'neutral')
            emotion_probabilities = results.get('emotion', {})
            
            # Convert 0-100 percentage to 0-1 confidence score
            # Wrap in float() to ensure native Python float (not numpy.float32) for JSON serialization
            confidence = float(emotion_probabilities.get(dominant_emotion, 0.0)) / 100.0
            
            return dominant_emotion, confidence
            
        except Exception as e:
            # Fallback in case of processing failure
            return "neutral", 0.0
