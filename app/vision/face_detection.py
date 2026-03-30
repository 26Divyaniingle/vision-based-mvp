import os
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# Path to the downloaded FaceLandmarker model file
_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "face_landmarker.task")


class _LandmarkPoint:
    """Compatibility wrapper for a single landmark point."""
    def __init__(self, x, y, z=0.0):
        self.x = x
        self.y = y
        self.z = z


class _LandmarkList:
    """
    Compatibility wrapper so that landmarks.landmark[i].x/.y/.z
    keeps working exactly as with the old FaceMesh API.
    """
    def __init__(self, normalized_landmarks):
        self.landmark = [
            _LandmarkPoint(lm.x, lm.y, lm.z)
            for lm in normalized_landmarks
        ]



class FaceDetector:
    """Handles face detection and facial landmarks extraction using MediaPipe Tasks API."""

    def __init__(self):
        base_options = mp_python.BaseOptions(model_asset_path=_MODEL_PATH)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self.face_landmarker = mp_vision.FaceLandmarker.create_from_options(options)

    def get_landmarks(self, frame):
        """
        Extracts face landmarks from a frame.
        Returns a _LandmarkList compatible object (same .landmark[i].x/.y/.z interface
        as the old MediaPipe FaceMesh API) or None if no face is detected.
        """
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        result = self.face_landmarker.detect(mp_image)

        if result.face_landmarks:
            return _LandmarkList(result.face_landmarks[0])
        return None

    def get_bounding_box(self, frame, landmarks):
        """Calculates bounding box from landmarks."""
        if not landmarks:
            return None
        h, w, _ = frame.shape
        x_min, y_min = w, h
        x_max = y_max = 0

        for lm in landmarks.landmark:
            x, y = int(lm.x * w), int(lm.y * h)
            if x < x_min: x_min = x
            if x > x_max: x_max = x
            if y < y_min: y_min = y
            if y > y_max: y_max = y

        return (x_min, y_min, x_max - x_min, y_max - y_min)
