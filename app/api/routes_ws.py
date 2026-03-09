"""
WebSocket Routes for Real-Time Streaming (Audio/Video).
Manages full real-time flow: Speech -> Transcription -> Symptom Ext -> Next Q -> TTS TTS -> Audio output.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
import base64
import time
from app.database.db import get_db
from sqlalchemy.orm import Session as DBSession

from app.services.stt_engine import process_audio_chunk
from app.services.tts_engine import generate_speech_bytes
from app.services.webcam_analysis import analyze_webcam_frame
from app.services.symptom_extractor import extract_symptoms_ner
from app.services.dialogue_manager import generate_next_question
from app.services.medical_agent import predict_condition
from app.database.crud import create_session

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
        "avg_eye_strain": 0.0,
        "avg_lip_tension": 0.0,
        "emotion_counts": {},
        "distress_flags": {"stress": False, "fatigue": False, "pain": False, "discomfort": False}
    }
    patient_id = -1 # to be obtained upon start message
    client_lang = "English" # Default
    total_frames = 0
    
    try:
        while True:
            # Receive text or binary data
            message = await websocket.receive_text()
            data = json.loads(message)
            msg_type = data.get("type", "unknown")
            
            if msg_type == "start":
                patient_id = data.get("patient_id", -1)
                patient_name = data.get("patient_name", "Guest")
                client_lang = data.get("language", "English")
                
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
                    "Korean": f"안녕하세요 {patient_name}님, 저는 귀하의 의료 AI 어시스턴트입니다. 오늘 어떤 일로 오셨는지 말씀해 주세요.",
                    "Chinese": f"您好 {patient_name}，我是您的医疗人工智能助理。请告诉我您今天哪里不舒服？",
                    "Marathi": f"नमस्कार {patient_name}, मी तुमचा मेडिकल एआय असिस्टंट आहे. कृपया मला सांगा आज तुम्ही इथे का आला आहात?",
                    "Hinglish": f"Hello {patient_name}, main aapka Medical AI Assistant hoon. Please bataiye aaj aapko kya takleef hai?"
                }
                
                first_q = GREETINGS.get(client_lang, GREETINGS["English"])
                conversation_history.append({"role": "bot", "text": first_q})
                
                # Send text Q
                await websocket.send_text(json.dumps({
                    "type": "question", 
                    "text": first_q,
                    "symptoms_so_far": list(extracted_symptoms)
                }))
                
                # Send Audio TTS of Q
                audio_bytes = await generate_speech_bytes(first_q, language=client_lang)
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                await websocket.send_text(json.dumps({
                    "type": "audio",
                    "audio_b64": audio_b64
                }))
                continue

            elif msg_type == "video_frame":
                # Received live webcam snapshot 
                img_b64 = data.get("image_base64", "")
                if img_b64:
                    # Async wrapper not strictly necessary for fast CV operations, but good practice
                    analysis = analyze_webcam_frame(img_b64)
                    
                    # Update average metrics
                    emo = analysis["emotion"]
                    flags = analysis["distress_flags"]
                    
                    counts = latest_emotion_metrics["emotion_counts"]
                    counts[emo] = counts.get(emo, 0) + 1
                    
                    # Compute rolling averages (simplistic)
                    total_frames += 1
                    prev_eye = latest_emotion_metrics["avg_eye_strain"]
                    curr_eye = analysis["features"].get("eye_strain_score", 0)
                    latest_emotion_metrics["avg_eye_strain"] = prev_eye + (curr_eye - prev_eye) / total_frames
                    
                    prev_lip = latest_emotion_metrics["avg_lip_tension"]
                    curr_lip = analysis["features"].get("lip_tension", 0)
                    latest_emotion_metrics["avg_lip_tension"] = prev_lip + (curr_lip - prev_lip) / total_frames
                    
                    # Mark persistent distress
                    latest_emotion_metrics["distress_flags"]["stress"] |= flags["stress"]
                    latest_emotion_metrics["distress_flags"]["pain"] |= flags["pain"]
                    latest_emotion_metrics["dominant_emotion"] = max(counts, key=counts.get)
                    
                    # Send live feedback if distress is severe
                    if flags["pain"]:
                        await websocket.send_text(json.dumps({
                            "type": "alert",
                            "message": "Pain expressions detected. I'm noting this in your profile."
                        }))

            elif msg_type == "audio_chunk":
                # Patient sent audio explicitly or just transcribed text
                # We expect actual base64 audio if STT model handles bytes, else browser-transcribed text
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
                    
                    # Extract symptoms
                    new_symps = extract_symptoms_ner(stt_text)
                    extracted_symptoms.update(new_symps)
                    
                    # Generate next question
                    acting_emotion = latest_emotion_metrics["dominant_emotion"]
                    if latest_emotion_metrics["distress_flags"]["pain"]: acting_emotion = "severe pain"
                    
                    next_q = generate_next_question(conversation_history, list(extracted_symptoms), acting_emotion, patient_name=patient_name, language=client_lang)
                    
                    if next_q == "INTERVIEW_COMPLETE":
                        # We are ready for diagnosis
                        await websocket.send_text(json.dumps({
                            "type": "processing",
                            "text": "Thank you for sharing. Generating your comprehensive medical analysis..."
                        }))
                        
                        agent_res = predict_condition(list(extracted_symptoms), latest_emotion_metrics, conversation_history)
                        
                        # Save session to SQLite DB
                        create_session(
                            db=db,
                            session_id=session_id,
                            patient_id=patient_id,
                            transcript=conversation_history,
                            symptoms=list(extracted_symptoms),
                            emotion_metrics=latest_emotion_metrics,
                            condition=agent_res["condition"],
                            confidence=agent_res["confidence"],
                            medication=agent_res["medication"],
                            safety=int(agent_res["safety_passed"]),
                            distress=latest_emotion_metrics["distress_flags"]["pain"] or latest_emotion_metrics["distress_flags"]["stress"]
                        )
                        
                        await websocket.send_text(json.dumps({
                            "type": "finalize",
                            "diagnosis": agent_res,
                            "symptoms": list(extracted_symptoms),
                            "vision": latest_emotion_metrics
                        }))
                    else:
                        conversation_history.append({"role": "bot", "text": next_q})
                        
                        # Send text Q
                        await websocket.send_text(json.dumps({
                            "type": "question",
                            "text": next_q,
                            "symptoms_so_far": list(extracted_symptoms)
                        }))
                        
                        # Send TTS
                        audio_resp_bytes = await generate_speech_bytes(next_q, language=client_lang)
                        resp_audio_b64 = base64.b64encode(audio_resp_bytes).decode("utf-8")
                        await websocket.send_text(json.dumps({
                            "type": "audio",
                            "audio_b64": resp_audio_b64
                        }))

    except WebSocketDisconnect:
        print(f"Websocket disconnected for session: {session_id}")
        if session_id in active_connections:
            del active_connections[session_id]
