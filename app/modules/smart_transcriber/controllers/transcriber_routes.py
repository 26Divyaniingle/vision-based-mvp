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
async def start_consultation(patient_id: int, language: str = "Hinglish", db: Session = Depends(get_db)):
    """
    Initialize a new smart consultation session.
    language: 'Hinglish' | 'English' | 'Hindi' | 'Marathi'
    """
    new_consultation = SmartConsultation(patient_id=patient_id, language=language)
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
    WebSocket for real-time consultation transcription.

    Client sends:
      { "type": "audio_chunk", "audio_b64": "...", "verbatim": true|false }
      { "type": "ping" }
      { "type": "set_mode", "verbatim": true|false, "language": "English" }

    Server sends:
      { "type": "transcript_update", "speaker": "...", "text": "...", "verbatim": true|false }
      { "type": "pong" }
      { "type": "mode_ack", "verbatim": true|false, "language": "..." }
    """
    await websocket.accept()
    
    consultation = db.query(SmartConsultation).filter(SmartConsultation.id == consultation_id).first()
    if not consultation:
        await websocket.close(code=4004)
        return

    # Session-level mode state (can be changed at runtime via set_mode message)
    session_verbatim = False       # Default: medical + speaker ID mode
    session_language = consultation.language or "Hinglish"

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")

            # ── Live mode toggle from client ────────────────────────────────────
            if msg_type == "set_mode":
                session_verbatim = bool(message.get("verbatim", False))
                if message.get("language"):
                    session_language = message["language"]
                print(f"[Transcriber] Mode changed → verbatim={session_verbatim}, lang={session_language}")
                await websocket.send_text(json.dumps({
                    "type": "mode_ack",
                    "verbatim": session_verbatim,
                    "language": session_language
                }))

            # ── Audio chunk processing ──────────────────────────────────────────
            elif msg_type == "audio_chunk":
                audio_b64 = message.get("audio_b64")
                if not audio_b64:
                    continue

                # Per-chunk verbatim override (optional, falls back to session state)
                chunk_verbatim = message.get("verbatim", session_verbatim)
                    
                audio_bytes = base64.b64decode(audio_b64)
                
                result = await transcription_service.process_transcription_segment(
                    audio_bytes,
                    list(consultation.transcript),
                    language=session_language,
                    verbatim=chunk_verbatim
                )
                
                if result:
                    speaker = result["speaker"]
                    text = result["text"]
                    is_verbatim = result.get("raw", False)
                    
                    entry = {
                        "speaker": speaker,
                        "text": text,
                        "verbatim": is_verbatim,
                        "timestamp": asyncio.get_event_loop().time()
                    }
                    
                    # Persist to DB
                    current_transcript = list(consultation.transcript)
                    current_transcript.append(entry)
                    consultation.transcript = current_transcript
                    db.commit()
                    
                    # Stream back to client
                    await websocket.send_text(json.dumps({
                        "type": "transcript_update",
                        "speaker": speaker,
                        "text": text,
                        "verbatim": is_verbatim
                    }))

            # ── Keepalive ───────────────────────────────────────────────────────
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                
    except WebSocketDisconnect:
        print(f"Transcriber WebSocket disconnected: {consultation_id}")
    except Exception as e:
        print(f"Transcriber WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
