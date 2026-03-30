"""
Vision Module Test Script
Tests all vision components: emotion detection, face detection, behavior analysis, eye/lip tracking
"""
import sys
import os
import cv2
import numpy as np
import base64

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_test_image():
    """Creates a simple test image with a face-like pattern"""
    # Create a blank image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Fill with light gray background
    img.fill(200)
    return img

def create_test_image_base64():
    """Creates a test image and returns it as base64"""
    img = create_test_image()
    # Add some features to simulate a face
    cv2.circle(img, (320, 200), 50, (100, 100, 200), -1)  # Face
    cv2.circle(img, (300, 180), 10, (50, 50, 50), -1)  # Left eye
    cv2.circle(img, (340, 180), 10, (50, 50, 50), -1)  # Right eye
    cv2.ellipse(img, (320, 230), (30, 15), 0, 0, 180, (50, 50, 50), 2)  # Mouth
    
    # Encode to base64
    _, buffer = cv2.imencode('.jpg', img)
    img_b64 = base64.b64encode(buffer).decode('utf-8')
    return img_b64

def test_emotion_detector():
    """Test the emotion detection module"""
    print("\n" + "="*50)
    print("Testing Emotion Detection...")
    print("="*50)
    
    try:
        from app.vision.emotion_detector import analyze_emotion
        
        test_b64 = create_test_image_base64()
        result = analyze_emotion(test_b64)
        
        print(f"✓ Emotion Detector loaded successfully")
        print(f"  - Result: {result}")
        return True
    except Exception as e:
        print(f"✗ Emotion Detector test failed: {e}")
        return False

def test_face_detection():
    """Test the face detection module"""
    print("\n" + "="*50)
    print("Testing Face Detection...")
    print("="*50)
    
    try:
        from app.vision.face_detection import FaceDetector
        
        detector = FaceDetector()
        print(f"✓ Face Detector initialized successfully")
        
        # Test with test image
        test_img = create_test_image()
        landmarks = detector.get_landmarks(test_img)
        
        if landmarks:
            print(f"  - Landmarks detected: {len(landmarks.landmark)} points")
        else:
            print(f"  - No face detected (expected for synthetic image)")
        
        return True
    except Exception as e:
        print(f"✗ Face Detection test failed: {e}")
        return False

def test_behavior_analysis():
    """Test the behavior analysis module"""
    print("\n" + "="*50)
    print("Testing Behavior Analysis...")
    print("="*50)
    
    try:
        from app.vision.behavior_analysis import BehaviorAnalyzer
        
        analyzer = BehaviorAnalyzer()
        print(f"✓ Behavior Analyzer initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Behavior Analysis test failed: {e}")
        return False

def test_eye_lip_tracker():
    """Test the eye/lip tracking module"""
    print("\n" + "="*50)
    print("Testing Eye/Lip Tracker...")
    print("="*50)
    
    try:
        from app.vision.eye_lip_tracker import extract_vision_features
        
        test_b64 = create_test_image_base64()
        result = extract_vision_features(test_b64)
        
        print(f"✓ Eye/Lip Tracker loaded successfully")
        print(f"  - Result: {result}")
        return True
    except Exception as e:
        print(f"✗ Eye/Lip Tracker test failed: {e}")
        return False

def test_face_recognition():
    """Test the face recognition module"""
    print("\n" + "="*50)
    print("Testing Face Recognition...")
    print("="*50)
    
    try:
        from app.vision.face_recognition import get_face_embedding
        
        test_b64 = create_test_image_base64()
        result = get_face_embedding(test_b64)
        
        print(f"✓ Face Recognition loaded successfully")
        print(f"  - Embedding length: {len(result)}")
        return True
    except Exception as e:
        print(f"✗ Face Recognition test failed: {e}")
        return False

def test_webcam_analysis():
    """Test the webcam analysis module"""
    print("\n" + "="*50)
    print("Testing Webcam Analysis...")
    print("="*50)
    
    try:
        from app.services.webcam_analysis import analyze_webcam_frame
        
        test_b64 = create_test_image_base64()
        result = analyze_webcam_frame(test_b64)
        
        print(f"✓ Webcam Analysis loaded successfully")
        print(f"  - Result keys: {result.keys()}")
        print(f"  - Emotion: {result.get('emotion')}")
        print(f"  - Distress flags: {result.get('distress_flags')}")
        return True
    except Exception as e:
        print(f"✗ Webcam Analysis test failed: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n" + "="*50)
    print("Checking Dependencies...")
    print("="*50)
    
    required_packages = [
        'cv2',
        'mediapipe', 
        'deepface',
        'numpy',
        'tensorflow'
    ]
    
    all_ok = True
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package}: installed")
        except ImportError:
            print(f"✗ {package}: NOT INSTALLED")
            all_ok = False
    
    return all_ok

def check_model_files():
    """Check if required model files exist"""
    print("\n" + "="*50)
    print("Checking Model Files...")
    print("="*50)
    
    model_path = os.path.join(os.path.dirname(__file__), "app", "face_landmarker.task")
    
    if os.path.exists(model_path):
        print(f"✓ MediaPipe model exists: {model_path}")
        return True
    else:
        print(f"✗ MediaPipe model NOT FOUND: {model_path}")
        print("  Download from: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task")
        return False

def main():
    """Run all vision module tests"""
    print("\n" + "="*60)
    print("   VISION MODULE TEST SUITE")
    print("="*60)
    
    # Check dependencies first
    deps_ok = check_dependencies()
    if not deps_ok:
        print("\n⚠️  Please install missing dependencies:")
        print("   pip install -r requirements.txt")
        return False
    
    # Check model files
    model_ok = check_model_files()
    if not model_ok:
        print("\n⚠️  Please download the required model file")
    
    # Run all tests
    tests = [
        ("Emotion Detection", test_emotion_detector),
        ("Face Detection", test_face_detection),
        ("Behavior Analysis", test_behavior_analysis),
        ("Eye/Lip Tracking", test_eye_lip_tracker),
        ("Face Recognition", test_face_recognition),
        ("Webcam Analysis", test_webcam_analysis),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"✗ {name} crashed: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("   TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  🎉 All vision module tests passed!")
        return True
    else:
        print("\n  ⚠️  Some tests failed. Check errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

