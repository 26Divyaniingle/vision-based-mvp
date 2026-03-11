class BehaviorAnalyzer:
    """Analyzes behavioral signals like attention and eye contact."""
    def __init__(self):
        pass

    def analyze(self, landmarks, frame_shape):
        """
        Determines eye_contact and attention locally using MediaPipe landmarks.
        Returns: (eye_contact, attention) both as strings (e.g., 'low', 'medium', 'high')
        """
        if not landmarks:
            return "low", "low"

        # MediaPipe FaceMesh landmarks indices
        NOSE_TIP = 1
        LEFT_EYE_INNER = 133
        RIGHT_EYE_INNER = 362
        
        h, w, _ = frame_shape
        
        nose_x = landmarks.landmark[NOSE_TIP].x
        left_eye_x = landmarks.landmark[LEFT_EYE_INNER].x
        right_eye_x = landmarks.landmark[RIGHT_EYE_INNER].x
        
        # Calculate horizontal center point between the eyes
        eyes_center_x = (left_eye_x + right_eye_x) / 2
        
        # Distance between eyes for normalization
        eye_dist = abs(right_eye_x - left_eye_x)
        if eye_dist == 0:
            eye_dist = 0.001
            
        # Horizontal deviation of the nose from the center between eyes
        # Gives a rough estimation of head yaw (turning left or right)
        deviation = abs(nose_x - eyes_center_x) / eye_dist
        
        # Evaluate based on deviation metrics
        if deviation < 0.2:
            eye_contact = "high"
            attention = "high"
        elif deviation < 0.5:
            eye_contact = "medium"
            attention = "medium"
        else:
            eye_contact = "low"
            attention = "low"
            
        return eye_contact, attention
