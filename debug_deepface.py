from deepface import DeepFace
import cv2
import numpy as np
import time

print("Initializing DeepFace test...")
img = np.zeros((224, 224, 3), dtype=np.uint8)

try:
    start_time = time.time()
    print("Running Facenet represent...")
    objs = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=False, detector_backend="opencv")
    print(f"Facenet represent took: {time.time() - start_time:.2f} seconds")
    
    start_time = time.time()
    print("Running Emotion analysis...")
    objs = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, detector_backend="opencv")
    print(f"Emotion analysis took: {time.time() - start_time:.2f} seconds")
    
except Exception as e:
    print(f"DeepFace error: {e}")
