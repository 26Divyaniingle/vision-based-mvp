import streamlit as st
import requests
import base64
import json
import time
import uuid
import streamlit.components.v1 as components

API_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/stream"

st.set_page_config(
    layout="wide",
    page_title="AI Medical Interview Assistant",
    page_icon="🏥"
)

# ─── Custom CSS ───
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* { font-family: 'Inter', sans-serif; }

.main-header {
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    padding: 2rem;
    border-radius: 16px;
    margin-bottom: 1.5rem;
    text-align: center;
    color: white;
}
.main-header h1 { font-size: 2rem; font-weight: 700; margin: 0; }
.main-header p { opacity: 0.8; margin-top: 0.5rem; }

.chat-bubble-ai {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 18px 18px 18px 4px;
    margin: 0.5rem 0;
    max-width: 80%;
    animation: fadeIn 0.5s ease-in;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
.chat-bubble-patient {
    background: linear-gradient(135deg, #11998e, #38ef7d);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 18px 18px 4px 18px;
    margin: 0.5rem 0;
    max-width: 80%;
    margin-left: auto;
    text-align: right;
    animation: fadeIn 0.5s ease-in;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(17, 153, 142, 0.3);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.vision-card {
    background: linear-gradient(145deg, #1a1a2e, #16213e);
    padding: 1.2rem;
    border-radius: 14px;
    color: white;
    margin: 0.5rem 0;
    border: 1px solid rgba(255,255,255,0.1);
}
.vision-card h4 { color: #667eea; margin: 0 0 0.5rem 0; }

.metric-pill {
    display: inline-block;
    background: rgba(102, 126, 234, 0.2);
    border: 1px solid rgba(102, 126, 234, 0.4);
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    margin: 0.2rem;
    font-size: 0.85rem;
    color: #a8b5ff;
}

.symptom-tag {
    display: inline-block;
    background: linear-gradient(135deg, #f093fb, #f5576c);
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    margin: 0.2rem;
    font-size: 0.85rem;
    font-weight: 500;
}
.alert-box {
    background: linear-gradient(135deg, #f5576c, #f093fb);
    color: white;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 10px;
    text-align: center;
    font-weight: bold;
}
.stButton > button {
    border-radius: 12px !important;
    padding: 0.6rem 1.5rem !important;
    font-weight: 600 !important;
    transition: all 0.3s ease !important;
}
.stButton > button:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;
}

.results-card {
    background: linear-gradient(145deg, #0f0c29, #302b63);
    padding: 1.5rem;
    border-radius: 16px;
    color: white;
    margin: 0.5rem 0;
    border: 1px solid rgba(255,255,255,0.1);
}
</style>
""", unsafe_allow_html=True)


# ─── Session State Initialization ───
if "token" not in st.session_state:
    st.session_state.token = None
if "patient_id" not in st.session_state:
    st.session_state.patient_id = None
if "patient_name" not in st.session_state:
    st.session_state.patient_name = None
if "patient_email" not in st.session_state:
    st.session_state.patient_email = None
if "patient_phone" not in st.session_state:
    st.session_state.patient_phone = None

if "interview_session_id" not in st.session_state:
    st.session_state.interview_session_id = None
if "interview_active" not in st.session_state:
    st.session_state.interview_active = False
if "interview_results" not in st.session_state:
    st.session_state.interview_results = None
if "language" not in st.session_state:
    st.session_state.language = "English"

def get_base64_from_uploaded(file) -> str:
    import io
    from PIL import Image
    try:
        img = Image.open(file).convert('RGB')
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG")
        return base64.b64encode(buffered.getvalue()).decode("utf-8")
    except Exception:
        return ""


# ═══════════════════════════════════════
# WEBSOCKET STREAM COMPONENT
# ═══════════════════════════════════════
def render_websocket_stream(session_id: str, patient_id: int, language: str):
    """
    Renders pure HTML/JS to connect to FastAPI WebSocket.
    Features:
    - Captures Audio using MediaRecorder and sends it when silence is detected / manually.
    - Captures Video frames using canvas and sends them every X seconds.
    - Receives Audio (TTS) and plays it back.
    - Receives Transcripts (STT) and AI Questions and displays them.
    - Handles Completion state to notify Streamlit.
    """
    
    html_code = f"""
    <div id="ws-container" style="background:#1a1a2e; padding:20px; border-radius:15px; color:white;">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <div id="status" style="font-weight:bold; color:#764ba2;">🟡 Connecting...</div>
            <button id="mic-btn" onclick="toggleMic()" style="background:#38ef7d; border:none; border-radius:8px; padding:8px 15px; color:#1a1a2e; font-weight:bold; cursor:pointer;">🎤 Speak</button>
        </div>
        
        <div style="display:flex; gap:20px;">
            <!-- Video preview -->
            <div style="width:30%; max-width:200px; text-align:center;">
                <video id="video-preview" autoplay playsinline muted style="width:100%; border-radius:10px; border:2px solid #667eea;"></video>
                <div style="font-size:12px; margin-top:5px; color:#aaa;">Live Face Scan</div>
                <canvas id="video-canvas" style="display:none;"></canvas>
            </div>
            
            <!-- Chat display -->
            <div id="chat-box" style="flex:1; height:400px; overflow-y:auto; background:#16213e; padding:15px; border-radius:10px; border:1px solid #302b63;">
                <div style="color:#aaa; text-align:center; font-style:italic;">Initializing session...</div>
            </div>
        </div>
        
        <!-- Alerts & Symptoms -->
        <div id="alerts-box" style="margin-top:15px;"></div>
        
        <div id="symptoms-box" style="margin-top:15px; background:rgba(102, 126, 234, 0.1); padding:10px; border-radius:8px; border:1px solid rgba(102, 126, 234, 0.3);">
            <div style="font-size:12px; color:#a8b5ff; margin-bottom:5px;">DETECTED SYMPTOMS</div>
            <div id="symptoms-list"></div>
        </div>
        
        <div style="margin-top:15px; text-align:center;">
             <button id="finish-btn" onclick="finishInterview()" style="background:#f5576c; display:none; border:none; border-radius:8px; padding:10px 20px; color:white; font-weight:bold; cursor:pointer;">Show My Results</button>
        </div>
    </div>
    
    <script>
        const chatBox = document.getElementById('chat-box');
        const symptomsList = document.getElementById('symptoms-list');
        const alertsBox = document.getElementById('alerts-box');
        const statusEl = document.getElementById('status');
        const micBtn = document.getElementById('mic-btn');
        const finishBtn = document.getElementById('finish-btn');
        
        let ws = new WebSocket('{WS_URL}/{session_id}');
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        let finalStatusData = null;
        
        // Video
        const video = document.getElementById('video-preview');
        const canvas = document.getElementById('video-canvas');
        let videoStream = null;
        let frameInterval = null;
        
        // Audio playback
        const audioPlayer = new Audio();
        
        function appendChat(role, text) {{
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.style.padding = '10px 15px';
            div.style.borderRadius = '15px';
            div.style.maxWidth = '80%';
            
            if(role === 'bot') {{
                div.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                div.style.color = 'white';
                div.innerHTML = '🤖 ' + text;
                div.style.borderBottomLeftRadius = '4px';
            }} else {{
                div.style.background = 'linear-gradient(135deg, #11998e, #38ef7d)';
                div.style.color = 'white';
                div.style.marginLeft = 'auto';
                div.innerHTML = text + ' 🗣️';
                div.style.borderBottomRightRadius = '4px';
                div.style.textAlign = 'right';
            }}
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
        }}
        
        function updateSymptoms(symptoms) {{
            symptomsList.innerHTML = '';
            if(!symptoms || symptoms.length === 0) return;
            symptoms.forEach(s => {{
                const span = document.createElement('span');
                span.style.background = 'linear-gradient(135deg, #f093fb, #f5576c)';
                span.style.color = 'white';
                span.style.padding = '3px 8px';
                span.style.borderRadius = '15px';
                span.style.fontSize = '12px';
                span.style.marginRight = '5px';
                span.style.display = 'inline-block';
                span.style.marginBottom = '5px';
                span.innerText = s;
                symptomsList.appendChild(span);
            }});
        }}
        
        ws.onopen = () => {{
            statusEl.innerText = '🟢 Connected';
            statusEl.style.color = '#38ef7d';
            // Start the session
            ws.send(JSON.stringify({{ type: 'start', patient_id: {patient_id}, language: '{language}' }}));
            
            // Start camera
            navigator.mediaDevices.getUserMedia({{ video: true, audio: true }})
                .then(stream => {{
                    // Set up video
                    videoStream = stream;
                    video.srcObject = stream;
                    
                    // Periodically capture and send frame
                    frameInterval = setInterval(() => {{
                        if (ws.readyState === WebSocket.OPEN && video.readyState >= 2) {{
                            canvas.width = video.videoWidth / 2;
                            canvas.height = video.videoHeight / 2;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            // Get base64 (strip prefix)
                            let b64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                            ws.send(JSON.stringify({{ type: 'video_frame', image_base64: b64 }}));
                        }}
                    }}, 3000); // Process frame every 3s
                    
                    // Set up speech recognition (STT fallback for MVP if audio bytes too large)
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if(SpeechRecognition) {{
                        const recognition = new SpeechRecognition();
                        recognition.continuous = true;
                        recognition.interimResults = false;
                        
                        let bcp47 = 'en-US';
                        if ('{language}' === 'Spanish') bcp47 = 'es-ES';
                        else if ('{language}' === 'Hindi') bcp47 = 'hi-IN';
                        else if ('{language}' === 'French') bcp47 = 'fr-FR';
                        else if ('{language}' === 'Arabic') bcp47 = 'ar-SA';
                        else if ('{language}' === 'Portuguese') bcp47 = 'pt-BR';
                        else if ('{language}' === 'German') bcp47 = 'de-DE';
                        else if ('{language}' === 'Italian') bcp47 = 'it-IT';
                        else if ('{language}' === 'Russian') bcp47 = 'ru-RU';
                        else if ('{language}' === 'Japanese') bcp47 = 'ja-JP';
                        else if ('{language}' === 'Korean') bcp47 = 'ko-KR';
                        else if ('{language}' === 'Chinese') bcp47 = 'zh-CN';
                        else if ('{language}' === 'Marathi') bcp47 = 'mr-IN';
                        else if ('{language}' === 'Hinglish') bcp47 = 'hi-IN';
                        recognition.lang = bcp47;
                        
                        micBtn.onclick = () => {{
                            if(!isRecording) {{
                                recognition.start();
                                isRecording = true;
                                micBtn.innerText = '🔴 Recording... Click to Stop';
                                micBtn.style.background = '#f5576c';
                                micBtn.style.color = 'white';
                            }} else {{
                                recognition.stop();
                                isRecording = false;
                                micBtn.innerText = '🎤 Speak';
                                micBtn.style.background = '#38ef7d';
                                micBtn.style.color = '#1a1a2e';
                            }}
                        }};
                        
                        recognition.onresult = (event) => {{
                            let transcript = event.results[event.results.length - 1][0].transcript;
                            ws.send(JSON.stringify({{ type: 'audio_chunk', text: transcript }}));
                        }};
                    }} else {{
                        micBtn.innerText = 'Not Supported';
                        micBtn.disabled = true;
                    }}
                }})
                .catch(err => {{
                    console.error("Media error", err);
                    statusEl.innerText = '⚠️ Camera/Mic Error';
                }});
        }};
        
        ws.onmessage = (event) => {{
            const data = JSON.parse(event.data);
            
            if(data.type === 'question') {{
                appendChat('bot', data.text);
                updateSymptoms(data.symptoms_so_far);
            }} 
            else if(data.type === 'transcript') {{
                appendChat('patient', data.text);
            }}
            else if(data.type === 'audio') {{
                // Play TTS
                audioPlayer.src = "data:audio/mp3;base64," + data.audio_b64;
                audioPlayer.play();
            }}
            else if(data.type === 'alert') {{
                const div = document.createElement('div');
                div.className = 'alert-box';
                div.innerText = '⚠️ ' + data.message;
                alertsBox.appendChild(div);
                setTimeout(() => div.remove(), 5000); // hide after 5s
            }}
            else if(data.type === 'processing') {{
                appendChat('bot', data.text);
            }}
            else if(data.type === 'finalize') {{
                statusEl.innerText = '🏁 Session Complete';
                micBtn.style.display = 'none';
                finishBtn.style.display = 'inline-block';
                clearInterval(frameInterval);
                audioPlayer.pause();
                
                finalStatusData = data;
            }}
        }};
        
        ws.onclose = () => {{
            statusEl.innerText = '🔴 Disconnected';
            statusEl.style.color = '#f5576c';
            if(frameInterval) clearInterval(frameInterval);
        }};
        
        function finishInterview() {{
            // send data back to Streamlit URL params to bridge JS -> Python
            if(finalStatusData) {{
                const url = new URL(window.parent.location);
                // We encode the stringified JSON
                url.searchParams.set('interview_finished', 'true');
                url.searchParams.set('final_results', encodeURIComponent(JSON.stringify(finalStatusData)));
                window.parent.history.replaceState({{}}, '', url);
                
                // Refresh top level streamlit
                window.parent.document.dispatchEvent(new Event("streamlit:run"));
                window.parent.location.reload();
            }}
        }}
    </script>
    """
    components.html(html_code, height=600)

# ═══════════════════════════════════════
# AUTH PAGE
# ═══════════════════════════════════════
def auth_page():
    st.markdown("""
    <div class="main-header">
        <h1>🏥 Agentic Medical Voice Chatbot</h1>
        <p>Real-Time Multi-Modal Healthcare System</p>
    </div>
    """, unsafe_allow_html=True)

    tab1, tab2, tab3 = st.tabs(["🔒 Face Login", "👤 Register", "🔑 OTP/Token Login"])

    with tab1:
        st.subheader("Login with Webcam")
        login_cam = st.camera_input("Take a picture to log in")
        if login_cam:
            b64 = get_base64_from_uploaded(login_cam)
            with st.spinner("Authenticating Face (DeepFace)..."):
                r = requests.post(f"{API_URL}/auth/login/face", json={"image_base64": b64})
                if r.status_code == 200:
                    data = r.json()
                    st.session_state.token = data["token"]
                    st.session_state.patient_name = data["name"]
                    st.session_state.patient_id = data["id"]
                    st.success(f"Welcome back, {data['name']}!")
                    st.rerun()
                else:
                    st.error("Face login failed. Try Token or Register.")

    with tab2:
        st.subheader("Register New Patient")
        with st.form("reg_form"):
            r_name = st.text_input("Full Name")
            r_age = st.number_input("Age", min_value=1, max_value=120, value=30)
            r_phone = st.text_input("Phone Number (+123...)")
            r_email = st.text_input("Email ID (For Report)")
            reg_cam = st.camera_input("Capture Face")
            
            reg_submit = st.form_submit_button("Create Patient Profile")
            
            if reg_submit and reg_cam and r_name:
                b64 = get_base64_from_uploaded(reg_cam)
                with st.spinner("Registering patient and face embeddings..."):
                    payload = {
                        "name": r_name,
                        "age": r_age,
                        "phone": r_phone,
                        "email": r_email,
                        "image_base64": b64
                    }
                    r = requests.post(f"{API_URL}/auth/register/face", json=payload)
                    if r.status_code == 200:
                        data = r.json()
                        st.success(f"Registered! Your fallback Token/OTP is: {data['token']}")
                    else:
                        st.error(r.json().get('detail', 'Registration error.'))

    with tab3:
        st.subheader("Token Fallback Login")
        tok = st.text_input("Enter your token/OTP")
        if st.button("Login via Token"):
            r = requests.post(f"{API_URL}/auth/login/token", json={"token": tok})
            if r.status_code == 200:
                data = r.json()
                st.session_state.token = data["token"]
                st.session_state.patient_name = data["name"]
                st.session_state.patient_id = data["id"]
                st.success("Login successful!")
                st.rerun()
            else:
                st.error("Invalid token.")


# ═══════════════════════════════════════
# RESULTS DISPLAY
# ═══════════════════════════════════════
def display_results(data):
    """Display the final interview results and AI diagnosis."""
    st.markdown("""
    <div class="main-header" style="background: linear-gradient(135deg, #11998e, #38ef7d);">
        <h1>✅ Session Complete</h1>
        <p>Medical Vision Agentic AI Report</p>
    </div>
    """, unsafe_allow_html=True)

    ai = data.get("diagnosis", {})
    vision = data.get("vision", {})
    symptoms = data.get("symptoms", [])

    st.markdown("### 🩺 NLP Extracted Symptoms")
    if symptoms:
        symptoms_html = ""
        for s in symptoms:
            symptoms_html += f'<span class="symptom-tag">{s}</span> '
        st.markdown(symptoms_html, unsafe_allow_html=True)
    else:
        st.info("No symptoms extracted.")

    st.markdown("---")

    res_col1, res_col2 = st.columns(2)

    with res_col1:
        st.markdown(f"""
        <div class="results-card">
            <h3 style="color: #667eea;">📊 Webcam Emotion Metrics</h3>
            <p><strong>Dominant Emotion:</strong> {vision.get('dominant_emotion', 'N/A').title()}</p>
            <p><strong>Avg Eye Fatigue:</strong> {vision.get('avg_eye_strain', 0):.2f}</p>
            <p><strong>Avg Discomfort Tension:</strong> {vision.get('avg_lip_tension', 0):.2f}</p>
            <hr>
            <p><strong>Stress Flag:</strong> {'🚨 TRUE' if vision.get('distress_flags', {}).get('stress') else 'Normal'}</p>
            <p><strong>Pain Flag:</strong> {'🚨 TRUE' if vision.get('distress_flags', {}).get('pain') else 'Normal'}</p>
        </div>
        """, unsafe_allow_html=True)

    with res_col2:
        st.markdown(f"""
        <div class="results-card">
            <h3 style="color: #38ef7d;">🧠 Agentic Diagnosis</h3>
            <p><strong>Condition:</strong> {ai.get('condition', 'N/A')}</p>
            <p><strong>Confidence:</strong> {(ai.get('confidence', 0) * 100):.1f}%</p>
            <p><strong>Prescription/Care:</strong> {ai.get('medication', 'N/A')}</p>
            <p><strong>Safety Checked:</strong> {'✅ Passed' if ai.get('safety_passed') else '⚠️ Failed Guidelines'}</p>
        </div>
        """, unsafe_allow_html=True)

    # Export Section
    st.markdown("---")
    st.markdown("### 🖨️ Patient Delivery")
    exp_col1, exp_col2 = st.columns(2)
    
    # We must construct session_data matching the old format for reports to work
    session_data = {
        "symptoms": ", ".join(symptoms) if symptoms else "None",
        "vision": vision,
        "ai_results": ai
    }
    
    with exp_col1:
        if st.button("📄 Generate PDF Local"):
            with st.spinner("Generating PDF..."):
                pdf_res = requests.post(f"{API_URL}/report/generate_pdf", json={"session_data": session_data})
                if pdf_res.status_code == 200:
                    pdf_bytes = base64.b64decode(pdf_res.json()["pdf_base64"])
                    st.download_button("⬇️ Download PDF", data=pdf_bytes, file_name="Medical_Report.pdf", mime="application/pdf")
                else:
                    st.error("PDF generation failed.")

    with exp_col2:
        email_val = st.session_state.patient_email or ""
        email_addr = st.text_input("Auto-Delivery Email Address", value=email_val, placeholder="patient@example.com")
        if st.button("📬 Auto-Dispatch Report (Email/SMS)") and email_addr:
            with st.spinner("Dispatching via Agent..."):
                em_res = requests.post(f"{API_URL}/report/email_pdf", json={
                    "session_data": session_data,
                    "email": email_addr,
                    "patient_name": st.session_state.patient_name
                })
                if em_res.status_code == 200:
                    st.success(f"Report dispatched to {email_addr}!")
                else:
                    st.error("Failed to send.")

    st.markdown("---")
    if st.button("🔄 Start New Live Session", type="primary"):
        st.session_state.interview_session_id = None
        st.session_state.interview_active = False
        st.session_state.interview_results = None
        # Remove URL params so it starts fresh
        st.query_params.clear()
        st.rerun()


# ═══════════════════════════════════════
# MAIN APP - LIVE SESSION
# ═══════════════════════════════════════
def main_app():
    # Top Bar
    st.markdown(f"""
    <div style="display:flex; justify-content:space-between; align-items:center; background:#16213e; padding:15px; border-radius:10px; color:white; margin-bottom:15px;">
        <span><strong>Patient:</strong> {st.session_state.patient_name} (ID: {st.session_state.patient_id})</span>
        <form style="margin:0;"><button style="background:transparent; border:1px solid #f5576c; color:#f5576c; border-radius:5px; padding:5px 10px; cursor:pointer;">Logout</button></form>
    </div>
    """, unsafe_allow_html=True)
    
    # Check if we have results coming back from JS URL params
    query_params = st.query_params
    if 'interview_finished' in query_params:
        try:
            results_json = query_params.get('final_results')
            import urllib.parse
            decoded_json = urllib.parse.unquote(results_json)
            final_data = json.loads(decoded_json)
            st.session_state.interview_results = final_data
            st.session_state.interview_active = False
        except Exception as e:
            st.error(f"Error reading results: {e}")

    # Display results if available
    if st.session_state.interview_results:
        display_results(st.session_state.interview_results)
        return

    # Pre-interview
    if not st.session_state.interview_active:
        st.markdown("""
        <div class="main-header">
            <h1>🎙️ Voice-Activated Medical Agent</h1>
            <p>Start your real-time session. Speak naturally. The AI will monitor your emotions via webcam.</p>
        </div>
        """, unsafe_allow_html=True)

        col_start = st.columns([1, 2, 1])
        with col_start[1]:
            st.session_state.language = st.selectbox("🌍 Select Preferred Language", 
                ["English", "Spanish", "Hindi", "Hinglish", "Marathi", "French", "Arabic", 
                 "Portuguese", "German", "Italian", "Russian", 
                 "Japanese", "Korean", "Chinese"]
            )
            
            if st.button("🚀 Start Live WebSocket Audio/Video Session", type="primary", use_container_width=True):
                st.session_state.interview_session_id = str(uuid.uuid4())[:8]
                st.session_state.interview_active = True
                st.rerun()
        return

    # Active Interview WS Client
    if st.session_state.interview_active:
        st.markdown("### 🔴 LIVE Interactive Medical Session")
        render_websocket_stream(st.session_state.interview_session_id, st.session_state.patient_id, st.session_state.language)


# ═══════════════════════════════════════
# ENTRY
# ═══════════════════════════════════════
if st.session_state.token is None:
    auth_page()
else:
    main_app()
