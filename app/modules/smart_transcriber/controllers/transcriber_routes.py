from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.modules.smart_transcriber.models.transcriber_models import SmartConsultation
from app.modules.smart_transcriber.services.transcription_service import TranscriptionService
from app.modules.smart_transcriber.services.summary_service import SummaryService
import json
import base64
import asyncio

router = APIRouter()
transcription_service = TranscriptionService()
summary_service = SummaryService()

@router.post("/start")
async def start_consultation(patient_id: int, db: Session = Depends(get_db)):
    """
    Initialize a new smart consultation session.
    """
    new_consultation = SmartConsultation(patient_id=patient_id)
    db.add(new_consultation)
    db.commit()
    db.refresh(new_consultation)
    return {"consultation_id": new_consultation.id, "status": "started"}

@router.post("/{consultation_id}/stop")
async def stop_consultation(consultation_id: int, db: Session = Depends(get_db)):
    """
    Stop recording, generate medical summary and save indicators.
    """
    consultation = db.query(SmartConsultation).filter(SmartConsultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    # Generate AI summary from the transcript
    summary_data = await summary_service.generate_consultation_summary(consultation.transcript)
    
    # Update consultation record
    consultation.summary = summary_data["summary"]
    consultation.symptoms = summary_data["symptoms"]
    consultation.medical_keywords = summary_data["medical_keywords"]
    consultation.duration = summary_data["duration"]
    
    db.commit()
    db.refresh(consultation)
    
    # Trigger RAG indexing (Placeholder for future integration)
    # await medical_rag_service.index_consultation(consultation)
    
    return {
        "status": "stopped",
        "consultation": consultation.to_dict()
    }

@router.get("/history/{patient_id}")
async def get_patient_history(patient_id: int, db: Session = Depends(get_db)):
    """
    Retrieve historical consultations for a specific patient.
    """
    history = db.query(SmartConsultation).filter(SmartConsultation.patient_id == patient_id).all()
    return [c.to_dict() for c in history]

@router.websocket("/ws/{consultation_id}")
async def transcriber_websocket(websocket: WebSocket, consultation_id: int, db: Session = Depends(get_db)):
    """
    WebSocket for real-time consultation transcription and speaker identification.
    """
    await websocket.accept()
    
    consultation = db.query(SmartConsultation).filter(SmartConsultation.id == consultation_id).first()
    if not consultation:
        await websocket.close(code=4004)
        return

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio_chunk":
                audio_b64 = message.get("audio_b64")
                if not audio_b64:
                    continue
                    
                audio_bytes = base64.b64decode(audio_b64)
                
                # 1. Transcribe
                text = await transcription_service.transcribe_audio(audio_bytes)
                
                if text and text.strip():
                    # 2. Identify Speaker
                    speaker = await transcription_service.identify_speaker_contextually(
                        text, consultation.transcript
                    )
                    
                    entry = {
                        "speaker": speaker,
                        "text": text,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    
                    # 3. Save to DB (In-memory list update for now, commit later or periodically)
                    # For safety in this MVP, we'll append to the list and commit
                    current_transcript = list(consultation.transcript)
                    current_transcript.append(entry)
                    consultation.transcript = current_transcript
                    db.commit()
                    
                    # 4. Stream back to client
                    await websocket.send_text(json.dumps({
                        "type": "transcript_update",
                        "speaker": speaker,
                        "text": text
                    }))
                    
            elif message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        print(f"Transcriber WebSocket disconnected: {consultation_id}")
    except Exception as e:
        print(f"Transcriber WebSocket error: {e}")
        await websocket.close()
