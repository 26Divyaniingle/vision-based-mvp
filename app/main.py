from fastapi import FastAPI
from app.api import routes_auth, routes_session, routes_report, routes_interview, routes_ws
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
    # Pre-load models in background to not block app startup too much
    print("Pre-loading models...")
    try:
        # Pre-load NER (This downloads model if not present, take some time)
        await asyncio.to_thread(get_ner_pipeline)
        
        # Pre-load DeepFace (Trigger dummy analysis)
        dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
        _, buffer = cv2.imencode('.jpg', dummy_img)
        dummy_b64 = base64.b64encode(buffer).decode('utf-8')
        await asyncio.to_thread(analyze_emotion, dummy_b64)
        print("Models pre-loaded successfully.")
    except Exception as e:
        print(f"Error pre-loading models: {e}")
    yield

app = FastAPI(title="Vision Agentic AI MVP", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_auth.router, prefix="/auth", tags=["auth"])
app.include_router(routes_session.router, prefix="/session", tags=["session"])
app.include_router(routes_report.router, prefix="/report", tags=["report"])
app.include_router(routes_interview.router, prefix="/interview", tags=["interview"])
app.include_router(routes_ws.router, prefix="/ws", tags=["websocket"])

@app.get("/")
def root():
    return {"message": "Vision Agentic AI Core Active"}
