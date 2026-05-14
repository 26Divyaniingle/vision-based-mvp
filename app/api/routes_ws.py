"""
WebSocket Routes for Real-Time Streaming (Audio/Video).
Manages full real-time flow: Speech -> Transcription -> Symptom Ext -> Next Q -> TTS TTS -> Audio output.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from starlette.websockets import WebSocketState


import json
import base64
import time
import asyncio
from app.database.db import get_db
from sqlalchemy.orm import Session as DBSession

from app.services.stt_engine import process_audio_chunk
from app.services.tts_engine import generate_speech_bytes
from app.services.webcam_analysis import analyze_webcam_frame
from app.services.symptom_extractor import extract_symptoms_ner
from app.services.dialogue_manager import generate_next_question
from app.services.medical_agent import predict_condition
from app.database.crud import create_session, get_patient_embedding, check_session_limit, increment_session_count
from app.vision.face_recognition import verify_face
from app.database.security_crud import create_security_alert, count_unresolved_alerts
from app.modules.smart_transcriber.services.history_service import HistoryService


router = APIRouter()

# Active sessions mapping (can also be handled in DB, but in-memory is okay for live real-time sockets)
active_connections = {}

@router.websocket("/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db: DBSession = Depends(get_db)):
    await websocket.accept()
    active_connections[session_id] = websocket
    
    # Init context state for the ongoing session
    conversation_history = []
    extracted_symptoms = set()
    latest_emotion_metrics = {
        "dominant_emotion": "neutral",
        "emotion": "neutral",
        "avg_eye_strain": 0.0,
        "avg_lip_tension": 0.0,
        "emotion_counts": {},
        "distress_flags": {"stress": False, "fatigue": False, "pain": False, "discomfort": False},
        "vision_frames_count": 0,
        "total_frames": 0
    }
    patient_id = -1 # to be obtained upon start message
    client_lang = "English" # Default
    total_frames = 0
    vision_frames_count = 0
    vision_task_active = False # Flag to prevent overlapping vision tasks
    reference_embedding = []   # For continuous authentication
    identity_mismatch_count = 0  # Track consecutive / total mismatches in this session
    session_restricted = False   # True when mismatches exceed threshold (3)
    historical_context = "" # To be loaded on start

    
    async def send_tts_audio(text, language):
        """Helper to generate and send TTS audio as a background task."""
        try:
            audio_bytes = await generate_speech_bytes(text, language=language)
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            await websocket.send_text(json.dumps({
                "type": "audio",
                "audio_b64": audio_b64
            }))
        except Exception as e:
            print(f"TTS Background Task Error: {e}")

    async def run_vision_analysis(img_b64, reference_embedding=None):
        nonlocal vision_task_active, total_frames, vision_frames_count, latest_emotion_metrics, identity_mismatch_count, session_restricted
        try:
            # print(f"DEBUG: Processing vision frame {total_frames} (Session: {session_id})")
            
            # Identity Verification (Security Check)
            if reference_embedding:
                is_verified, score = await asyncio.to_thread(verify_face, img_b64, reference_embedding)
                
                # Live security monitoring log
                if total_frames % 20 == 0:
                    print(f"Security check (Session: {session_id}): Score {score:.3f}")

                if is_verified is False:
                    identity_mismatch_count += 1
                    print(f"SECURITY ALERT (Session: {session_id}): Unauthorized person access detected (score={score:.4f})")

                    # Handle database alert logging
                    try:
                        # Call synchronously since we are already in the background task loop
                        # but check if we should offload ONLY the IO if needed.
                        # For now, avoid passing 'db' to to_thread
                        create_security_alert(
                            db,
                            session_id,
                            patient_id if patient_id != -1 else 0,
                            round(float(score), 4),
                            "UNAUTHORIZED_ACCESS",
                            f"Unauthorized person access detected. Distance: {score:.4f}",
                        )
                    except Exception as db_err:
                        print(f"Security alert DB write error: {db_err}")

                    # Compute restriction (lock after 3 total mismatches)
                    restrict = identity_mismatch_count >= 3
                    if restrict:
                        print(f"SESSION ENFORCEMENT: Restricting session {session_id} due to multiple identity mismatches.")
                        session_restricted = True

                    # Alert immediately on mismatch
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(json.dumps({
                            "type": "identity_alert",
                            "message": "SECURITY ALERT: Unauthorized person access detected.",
                            "score": round(float(score), 4),
                            "mismatch_count": identity_mismatch_count,
                            "restrict": restrict,
                        }))
                
                elif is_verified is True:
                    # Reset mismatch relay if a successful match occurs (self-healing)
                    if identity_mismatch_count > 0:
                        print(f"DEBUG: Identity re-verified for session {session_id}. Resetting mismatch count.")
                        identity_mismatch_count = 0
                        
                elif is_verified is None:
                    # No face detected - notify user via status message if they are waiting for an alert
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(json.dumps({
                            "type": "status",
                            "text": "🔍 Monitoring: No face clearly detected in frame."
                        }))
                    if total_frames % 10 == 0:
                        print(f"DEBUG: No face detected in vision frame for session {session_id}")

            else:
                if total_frames % 20 == 0:
                    print(f"DEBUG: Skipping identity verification - no reference embedding yet.")


            
            # Offload CPU-bound CV tasks to a separate thread

            analysis = await asyncio.to_thread(analyze_webcam_frame, img_b64)
            
            # Update average metrics only if face was detected
            emo = analysis.get("emotion")
            face_detected = analysis["features"].get("face_detected", False)
            flags = analysis["distress_flags"]
            
            if emo or face_detected:
                vision_frames_count += 1
                latest_emotion_metrics["vision_frames_count"] = vision_frames_count
                
                # Update Emotion Counts (if valid)
                if emo:
                    counts = latest_emotion_metrics["emotion_counts"]
                    counts[emo] = counts.get(emo, 0) + 1
                    
                    # Mature Output: Weighted Election for dominant_emotion
                    clinical_total = sum(counts.get(e, 0) for e in ['sad', 'fear', 'angry', 'disgust'])
                    clinical_ratio = clinical_total / sum(counts.values())
                    
                    if clinical_ratio > 0.15:
                        # Filter counts to only clinical and pick max
                        clinical_counts = {e: counts.get(e, 0) for e in ['sad', 'fear', 'angry', 'disgust']}
                        latest_emotion_metrics["dominant_emotion"] = max(clinical_counts, key=clinical_counts.get)
                    else:
                        latest_emotion_metrics["dominant_emotion"] = max(counts, key=counts.get)

                # Update physical features (if valid)
                if face_detected:
                    curr_eye = analysis["features"].get("eye_strain_score", 0)
                    curr_lip = analysis["features"].get("lip_tension", 0)
                    
                    # Corrected rolling average logic
                    n = vision_frames_count
                    latest_emotion_metrics["avg_eye_strain"] = (latest_emotion_metrics["avg_eye_strain"] * (n - 1) + curr_eye) / n
                    latest_emotion_metrics["avg_lip_tension"] = (latest_emotion_metrics["avg_lip_tension"] * (n - 1) + curr_lip) / n
                
                latest_emotion_metrics["distress_flags"]["stress"] |= flags["stress"]
                latest_emotion_metrics["distress_flags"]["pain"] |= flags["pain"]

                # ── Push live vision update to mobile sidebar ──────────────────
                if websocket.client_state == WebSocketState.CONNECTED:
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "vision_update",
                            "emotion":      latest_emotion_metrics["dominant_emotion"],
                            "eye_strain":   round(latest_emotion_metrics["avg_eye_strain"], 3),
                            "lip_tension":  round(latest_emotion_metrics["avg_lip_tension"], 3),
                            "stress":       latest_emotion_metrics["distress_flags"]["stress"],
                            "pain":         latest_emotion_metrics["distress_flags"]["pain"],
                        }))
                    except Exception as ve:
                        print(f"vision_update send error: {ve}")
                # ───────────────────────────────────────────────────────────────
            
            total_frames += 1
            latest_emotion_metrics["total_frames"] = total_frames
            latest_emotion_metrics["emotion"] = latest_emotion_metrics["dominant_emotion"]
            
            if flags["pain"]:
                # Check connection still open before sending
                if websocket.client_state == WebSocketState.CONNECTED:
                    await websocket.send_text(json.dumps({
                        "type": "alert",
                        "message": "Pain expressions detected. I'm noting this in your profile."
                    }))
        except Exception as e:
            print(f"Vision Analysis Error: {e}")
        finally:
            vision_task_active = False

    try:
        while True:
            try:
                # Receive text or binary data
                message = await websocket.receive_text()
            except WebSocketDisconnect:
                # Connection closed normally
                break
            except Exception as e:
                # Connection closed with error or protocol issue
                print(f"WebSocket receive error: {e}")
                break

            try:
                data = json.loads(message)
                msg_type = data.get("type", "unknown")
                
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    continue

                if msg_type == "start":
                    patient_id = data.get("patient_id", -1)
                    patient_name = data.get("patient_name", "Guest")
                    client_lang = data.get("language", "English")
                    
                    p_id = -1
                    try:
                        p_id = int(patient_id)
                        if p_id != -1:
                            reference_embedding = get_patient_embedding(db, p_id)
                            print(f"DEBUG: Loaded reference embedding for patient {p_id}. Length: {len(reference_embedding)}")
                            if reference_embedding:
                                await websocket.send_text(json.dumps({
                                    "type": "status",
                                    "text": "🛡️ Identity protection active for this session."
                                }))
                            else:
                                await websocket.send_text(json.dumps({
                                    "type": "status",
                                    "text": "⚠️ Identity protection inactive: No face registered."
                                }))
                    except (ValueError, TypeError):
                        print(f"DEBUG: Invalid patient_id format: {patient_id}")

                    # --- SESSION LIMIT CHECK ---
                    if p_id != -1:
                        limit_status = check_session_limit(db, p_id)
                        if not limit_status["allowed"]:
                            await websocket.send_text(json.dumps({
                                "type": "access_locked",
                                "message": limit_status["message"],
                                "admin_email": "medsense.ai@gmail.com"
                            }))
                            await websocket.close()
                            break
                        
                        # Increment count as session has "started successfully"
                        increment_session_count(db, p_id)
                    # ---------------------------

                    # Fetch historical context for smarter dialogue
                    if p_id != -1:
                        try:
                            historical_context = HistoryService.get_patient_history_summary(db, p_id)
                        except Exception as hist_err:
                            print(f"Error loading history: {hist_err}")
                            historical_context = ""



                    
                    # Auto-trigger first question naturally translated
                    GREETINGS = {
                        "English": f"Hello {patient_name}, I am your Medical AI Assistant. Please tell me what brings you in today?",
                        "Spanish": f"Hola {patient_name}, soy su asistente médico de IA. Por favor, dígame qué le trae por aquí hoy.",
                        "Hindi": f"नमस्ते {patient_name}, मैं आपका मेडिकल एआई सहायक हूँ। कृपया मुझे बताएं कि आज आप यहाँ क्यों आए हैं?",
                        "French": f"Bonjour {patient_name}, je suis votre assistant médical IA. S'il vous plaît, dites-moi ce qui vous amène aujourd'hui.",
                        "Arabic": f"مرحباً {patient_name}، أنا المساعد الطبي بالذكاء الاصطناعي الخاص بك. يرجى إخباري بما يجعلك تزورنا اليوم.",
                        "Portuguese": f"Olá {patient_name}, eu sou o seu Assistente Médico de IA. Por favor, diga-me o que o traz cá hoje.",
                        "German": f"Hallo {patient_name}, ich bin Ihr medizinischer KI-Assistent. Bitte sagen Sie mir, was Sie heute zu mir führt.",
                        "Italian": f"Salve {patient_name}, sono il suo assistente medico IA. La prego di dirmi cosa la porta qui oggi.",
                        "Russian": f"Здравствуйте, {patient_name}, я ваш медицинский ИИ-ассистент. Пожалуйста, расскажите мне, что вас беспокоит.",
                        "Japanese": f"こんにちは {patient_name}さん、私はあなたの医療AIアシスタントです。今日はどうされましたか？",
                        "Korean": f"안녕하세요 {patient_name}님, 저는 귀हा의 의료 AI 어시스턴트입니다. 오늘 어떤 일로 오셨는지 말씀해 주세요.",
                        "Chinese": f"您好 {patient_name}，我是您的医疗人工智能助理。请告诉我您今天哪里不舒服？",
                        "Marathi": f"नमस्कार {patient_name}, मी तुमचा मेडिकल एआय असिस्टंट आहे. कृपया मला सांगा आज तुम्ही इथे का आला आहात?",
                        "Hinglish": f"Hello {patient_name}, main aapka Medical AI Assistant hoon. Please bataiye aaj aapko kya takleef hai?"
                    }
                    
                    first_q = GREETINGS.get(client_lang, GREETINGS["English"])
                    conversation_history.append({"role": "bot", "text": first_q})
                    
                    # Send Audio TTS of Q (Awaited to ensure synchronous delivery with text)
                    try:
                        audio_bytes = await generate_speech_bytes(first_q, language=client_lang)
                        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                    except Exception as tts_err:
                        print(f"Initial TTS Error: {tts_err}")
                        audio_b64 = None
                    
                    # Send text and audio together
                    await websocket.send_text(json.dumps({
                        "type": "question", 
                        "text": first_q,
                        "audio_b64": audio_b64,
                        "symptoms_so_far": list(extracted_symptoms)
                    }))
                    continue

                elif msg_type == "video_frame":
                    # Received live webcam snapshot 
                    img_b64 = data.get("image_base64", "")
                    if img_b64 and not vision_task_active:
                        # print(f"DEBUG: Received video frame for session {session_id}")
                        vision_task_active = True
                        asyncio.create_task(run_vision_analysis(img_b64, reference_embedding))

                elif msg_type == "audio_chunk":
                    # Patient sent audio explicitly or just transcribed text
                    audio_b64 = data.get("audio_b64", "")
                    stt_text = data.get("text", "") # Fallback if browser did STT
                    
                    if audio_b64:
                        aud_bytes = base64.b64decode(audio_b64)
                        stt_text = await process_audio_chunk(aud_bytes, language=client_lang)
                        
                    if stt_text and stt_text.strip():
                        conversation_history.append({"role": "patient", "text": stt_text})
                        
                        # Send transcript back so UI shows it immediately
                        await websocket.send_text(json.dumps({
                            "type": "transcript",
                            "text": stt_text
                        }))
                        
                        # Extract symptoms (Offload NER to thread)
                        await websocket.send_text(json.dumps({
                            "type": "processing",
                            "text": "🔬 Mapping clinical markers..."
                        }))
                        new_symps = await extract_symptoms_ner(stt_text)
                        extracted_symptoms.update(new_symps)
                        
                        # Track question count (how many questions did the bot ASK so far)
                        bot_questions = [m for m in conversation_history if m["role"] == "bot"]
                        q_count = len(bot_questions)
                        
                        # Generate next question (Offload LLM to thread to keep loop responsive)
                        await websocket.send_text(json.dumps({
                            "type": "processing",
                            "text": "🧠 Synthesizing your symptoms..."
                        }))
                        acting_emotion = latest_emotion_metrics["dominant_emotion"]
                        if latest_emotion_metrics["distress_flags"]["pain"]: acting_emotion = "severe pain"
                        
                        # Safety check: if we already asked 8 questions, force completion
                        if q_count >= 8:
                            next_q = "INTERVIEW_COMPLETE"
                        else:
                            next_q = await generate_next_question( 
                                conversation_history, 
                                list(extracted_symptoms), 
                                acting_emotion, 
                                patient_name=patient_name, 
                                language=client_lang,
                                question_count=q_count + 1, # The one we are about to ask
                                historical_context=historical_context
                            )

                        
                        if next_q == "INTERVIEW_COMPLETE":
                            # We are ready for diagnosis
                            await websocket.send_text(json.dumps({
                                "type": "processing",
                                "text": "Thank you for sharing. Generating your comprehensive medical analysis..."
                            }))
                            
                            try:
                                agent_res = await predict_condition(list(extracted_symptoms), latest_emotion_metrics, conversation_history, db=db, patient_id=patient_id)
                            except Exception as e:
                                print(f"Agentic Workflow Error: {e}")
                                agent_res = {
                                    "condition": "Diagnostic Timeout", 
                                    "confidence": 0.0, 
                                    "medication": {"allopathic": [], "ayurvedic": []},
                                    "prevention": ["Consult a doctor."]
                                }
                            
                            # Save session to SQLite DB (Wrapped in try/except)
                            try:
                                create_session(
                                    db=db,
                                    session_id=session_id,
                                    patient_id=patient_id,
                                    transcript=conversation_history,
                                    symptoms=list(extracted_symptoms),
                                    emotion_metrics=latest_emotion_metrics,
                                    condition=agent_res.get("condition", "Unknown"),
                                    confidence=agent_res.get("confidence", 0.0),
                                    medication=json.dumps(agent_res.get("medication", {})),
                                    safety=int(agent_res.get("safety_passed", 0)),
                                    distress=latest_emotion_metrics["distress_flags"]["pain"] or latest_emotion_metrics["distress_flags"]["stress"]
                                )
                            except Exception as db_err:
                                print(f"DB Update Error during finalize: {db_err}")
                            
                            await websocket.send_text(json.dumps({
                                "type": "finalize",
                                "diagnosis": agent_res,
                                "symptoms": list(extracted_symptoms),
                                "vision": latest_emotion_metrics
                            }))
                        else:
                            conversation_history.append({"role": "bot", "text": next_q})
                            
                            # Generate TTS (Awaited)
                            await websocket.send_text(json.dumps({
                                "type": "processing",
                                "text": "🗣️ Preparing AI response..."
                            }))
                            try:
                                audio_resp_bytes = await generate_speech_bytes(next_q, language=client_lang)
                                resp_audio_b64 = base64.b64encode(audio_resp_bytes).decode("utf-8")
                            except Exception as tts_err:
                                print(f"Question TTS Error: {tts_err}")
                                resp_audio_b64 = None
                            
                            # Send text and audio together
                            await websocket.send_text(json.dumps({
                                "type": "question", 
                                "text": next_q,
                                "audio_b64": resp_audio_b64,
                                "symptoms_so_far": list(extracted_symptoms)
                            }))
            except Exception as e:
                print(f"Error processing message content: {e}")

    except WebSocketDisconnect:
        print(f"Websocket disconnected for session: {session_id}")
        if session_id in active_connections:
            del active_connections[session_id]
    except Exception as e:
        print(f"Fatal Websocket error for session {session_id}: {e}")
