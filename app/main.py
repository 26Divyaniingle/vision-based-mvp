"""
Main Application Entry Point
This file sets up the FastAPI application, loads all API routes, and initializes the server.
It also handles model pre-loading during startup to prevent timeouts on first requests.
"""

from fastapi import FastAPI
from app.api import routes_auth, routes_session, routes_report, routes_interview, routes_ws, routes_ai_assistant
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from contextlib import asynccontextmanager
from app.services.symptom_extractor import get_ner_pipeline
from app.vision.emotion_detector import analyze_emotion
import numpy as np
import cv2
import base64

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle app startup and shutdown events.
    This function runs when the server starts and when it shuts down.
    We use it to pre-load heavy machine learning models to prevent timeouts.
    """
    # Pre-load models in background to not block app startup too much
    print("Pre-loading models...")
    try:
        # Create a dummy image to trigger model loading without needing real input
        dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', dummy_img)
        dummy_b64 = base64.b64encode(buffer).decode('utf-8')
        
        # Pre-load DeepFace Emotion detection model
        # This makes the first emotion analysis call much faster
        await asyncio.to_thread(analyze_emotion, dummy_b64)
        
        # Pre-load DeepFace FaceNet model (for face recognition)
        # This prevents the first login/register from timing out
        from app.vision.face_recognition import get_face_embedding
        await asyncio.to_thread(get_face_embedding, dummy_b64)

        # Pre-load Medical RAG models (SentenceTransformer + FAISS)
        # This avoids several seconds of delay during the first interview turn
        from medical_rag.disease_predictor import predict_disease
        from medical_rag.medicine_retriever import retrieve_medicines
        await asyncio.to_thread(predict_disease, "fever")
        await asyncio.to_thread(retrieve_medicines, "Flu")
        
        print("Models pre-loaded successfully.")
    except Exception as e:
        print(f"Error pre-loading models: {e}")
    
    # Yield control back to the app (it now runs)
    yield
    # Cleanup code would go here after app shuts down

# Create the FastAPI application instance with custom startup/shutdown handler
app = FastAPI(title="Vision Agentic AI MVP", lifespan=lifespan)

# Add CORS middleware to allow requests from any origin (frontend can talk to backend)
# In production, you should restrict this to specific domains for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change in production!)
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Include all the API route modules with their prefixes
# Each router handles a specific part of the application
app.include_router(routes_auth.router, prefix="/auth", tags=["auth"])  # Login/registration/face auth endpoints
app.include_router(routes_session.router, prefix="/session", tags=["session"])  # Session management endpoints
app.include_router(routes_report.router, prefix="/report", tags=["report"])  # PDF report generation endpoints
app.include_router(routes_interview.router, prefix="/interview", tags=["interview"])  # Medical interview endpoints
app.include_router(routes_ws.router, prefix="/ws", tags=["websocket"])  # WebSocket endpoints for real-time communication
app.include_router(routes_ai_assistant.router, prefix="/assistant", tags=["assistant"])  # AI Assistant endpoints

@app.get("/")
def root():
    """
    Root endpoint - returns a simple message to verify the server is running.
    """
    return {"message": "Vision Agentic AI Core Active"}

