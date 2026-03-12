# Vision-Based Agentic AI Healthcare System (Homeopathy MVP)

An advanced, real-time medical diagnostic ecosystem powered by **Native Agentic AI**. This system integrates computer vision, multimodal speech processing, and a multi-agent supervisor-worker architecture to provide high-accuracy homeopathic consultations.

![Project Banner](https://img.shields.io/badge/AI-Native_Agentic-blueviolet?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI_|_Streamlit_|_Gemini-blue?style=for-the-badge)

---

## 🚀 Key Features

- **Native Agentic Design:** Custom-built orchestration (no LangChain/LangGraph) for ultra-low latency and direct multimodal control.
- **Bi-modal AI Interview:** Real-time speech-to-speech interaction using Google Gemini 1.5 Flash (STT) and Microsoft Edge-TTS.
- **Live Vision Diagnostics:** Background monitoring of patient emotions and physical state using YOLOv8 and Computer Vision.
- **RAG-Powered Diagnosis:** Leverages a FAISS Vector Database to compare current symptoms with historical medical cases.
- **Automated Reporting:** Generates professional PDF medical reports and dispatches them via automated email agents.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | FastAPI (Python) |
| **Frontend** | Streamlit |
| **LLM / STT** | Google Gemini 1.5 Flash (Multimodal) |
| **TTS** | Microsoft Edge-TTS (Neural Voices) |
| **Computer Vision** | YOLOv8, DeepFace, OpenCV |
| **Vector DB** | FAISS (Facebook AI Similarity Search) |
| **Database** | SQLite (SQLAlchemy ORM) |

---

## 📁 Project Structure

```text
├── app/
│   ├── agents/          # Specialized AI Agents (Condition, Medication, Safety)
│   ├── api/             # FastAPI Routes & WebSocket Handlers
│   ├── core/            # AI Engines (Gemini LLM, FAISS Store, Embeddings)
│   ├── services/        # Utilities (STT, TTS, Email, PDF Generation)
│   ├── vision/          # Computer Vision logic (YOLO, Face Recognition)
│   └── main.py          # Backend Entry Point
├── data/                # Local Persistence (Database & Vector Index)
├── frontend/
│   └── streamlit_app.py # Primary User Interface
├── .env                 # API Keys & Configuration
└── requirements.txt     # Dependency List
```

---

## 🔄 The Native Agentic Workflow

### 1. Unified Authentication
Patients log in using facial recognition or secure tokens. The system loads their historical context from the local database.

### 2. Multi-Sensory Consultations
During the AI interview, the system listens (STT), speaks (TTS), and watches (Vision) simultaneously. 
- **STT:** Captured audio bytes are sent directly to Gemini Flash for context-aware transcription.
- **Vision:** YOLOv8 analyzes facial cues to detect pain or emotional distress.

### 3. The Agentic Pipeline
When the interview ends, the **Supervisor Agent** orchestrates four specialized sub-agents:
1. **Comparison Agent:** Retrieves similar cases from the FAISS Vector Store using text embeddings.
2. **Condition Agent:** Reasons over (Form + Vision + History) to predict the condition.
3. **Medication Agent:** Selects optimal homeopathic remedies.
4. **Safety Agent:** Validates the plan against medical safety rules.
5. **Learning Agent:** Re-indexes the session to make the system smarter for the next patient.

---

## 🏃‍♂️ How to Run

### 1. Environment Setup
```bash
# Create and activate venv
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Credentials
Create a `.env` file in the root directory:
```text
GEMINI_API_KEY=your_google_ai_studio_key
DATABASE_URL=sqlite:///./data/vision_agent.db
EMAIL_SENDER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 3. Launch the System
**Terminal 1 (Backend):**
```bash
uvicorn app.main:app --reload
```

**Terminal 2 (Frontend):**
```bash
streamlit run frontend/streamlit_app.py
```

---

## 📄 License
This project is developed as a Healthcare AI MVP. All medical suggestions should be verified by a licensed healthcare professional.
