# 🏥 Vision-Based Agentic AI Healthcare System 

> **Advanced multi-modal medical diagnostic AI with RAG-powered medication recommendations, real-time vision analysis, and intelligent agent orchestration.**

An enterprise-grade, real-time medical diagnostic ecosystem powered by **Native Agentic AI**. This system integrates computer vision, multimodal speech processing, medical knowledge retrieval (RAG), and a multi-agent supervisor-worker architecture to provide high-accuracy medical consultations with comprehensive prescriptions.

![Project Banner](https://img.shields.io/badge/AI-Native_Agentic-blueviolet?style=for-the-badge)
![Medical RAG](https://img.shields.io/badge/RAG-Medical_Knowledge-green?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI_|_Streamlit_|_Gemini-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20MVP-brightgreen?style=for-the-badge)

---

## 🎯 Key Features

- ✅ **Native Agentic Design:** Custom-built orchestration (no LangChain/LangGraph) for ultra-low latency and direct multimodal control
- ✅ **Medical RAG System:** FAISS-powered vector database with 250K+ medicines for grounded medication recommendations
- ✅ **Comprehensive Prescriptions:** Allopathic medicines + Ayurvedic remedies + Prevention tips (all in one output)
- ✅ **Bi-modal AI Interview:** Real-time speech-to-speech interaction using Google Gemini 1.5 Flash
- ✅ **Live Vision Diagnostics:** Real-time emotion, distress, and physical state monitoring using YOLOv8 + DeepFace
- ✅ **RAG-Enhanced Diagnosis:** Vector similarity search for symptoms → disease → medicines pipeline
- ✅ **Safety Validation:** Automated drug safety checks before prescription delivery
- ✅ **Multi-Agent Orchestration:** Supervisor agent coordinates Condition, Medication, Safety, Comparison, and Learning agents
- ✅ **Automated PDF Reports:** Professional medical reports with prescriptions, case summary, and recommendations
- ✅ **Email Delivery:** Automated SendGrid/SMTP integration for report distribution

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | FastAPI + Python 3.10+ |
| **Frontend** | Streamlit (Web) + React Native (Mobile) |
| **LLM / STT** | Google Gemini 1.5 Flash (Multimodal) |
| **TTS** | Microsoft Edge-TTS (Neural Voices) |
| **Medical RAG** | FAISS Vector Database + SentenceTransformers |
| **Computer Vision** | YOLOv8, DeepFace, OpenCV |
| **Database** | SQLite (SQLAlchemy ORM) |
| **Email** | SendGrid / SMTP |
| **Embeddings** | sentence-transformers/all-MiniLM-L6-v2 (384-dim) |

---

## 📊 System Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Patient Interface                       │
│         (Streamlit Web + React Native Mobile App)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  WebSocket Handler (Real-time Audio/Video Streaming)   ││
│  └─────────────────┬───────────────────────────────────────┘│
│                    │                                         │
│     ┌──────────────┼──────────────┐                         │
│     ▼              ▼              ▼                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐              │
│  │   STT    │ │  Vision  │ │  Form Data   │              │
│  │ (Gemini) │ │ (YOLOv8) │ │ (Symptoms)   │              │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘              │
│       │            │              │                       │
│       └────────────┼──────────────┘                       │
│                    ▼                                      │
│       ┌────────────────────────────┐                     │
│       │  Supervisor Agent          │                     │
│       │  (Orchestrates workflow)   │                     │
│       └────────────┬───────────────┘                     │
│                    │                                      │
│     ┌──────────────┼──────────────┬────────────────┐     │
│     ▼              ▼              ▼                ▼     │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌─────────┐│
│  │Comparison  │ │ Condition  │ │Medication│ │ Safety  ││
│  │Agent       │ │ Agent      │ │Agent     │ │Agent    ││
│  │(History)   │ │(Diagnosis) │ │(RAG)     │ │(Rules)  ││
│  └────────────┘ └────────────┘ └──────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌────────┐
    │Database │  │PDF Report│  │Email   │
    │(SQLite) │  │Generator │  │Service │
    └─────────┘  └──────────┘  └────────┘
```

---

## 📁 Project Structure

```
vision-based-mvp/
├── app/
│   ├── agents/                          # Multi-Agent System
│   │   ├── base_agent.py               # Base agent class
│   │   ├── supervisor_agent.py          # Orchestrates workflow
│   │   ├── condition_agent.py           # Diagnosis prediction
│   │   ├── medication_agent.py          # Prescription recommendations
│   │   ├── safety_agent.py              # Safety validation
│   │   ├── comparison_agent.py          # Historical case retrieval
│   │   └── learning_agent.py            # Session learning
│   │
│   ├── api/
│   │   ├── routes_auth.py               # Authentication endpoints
│   │   ├── routes_interview.py          # Interview workflow API
│   │   ├── routes_session.py            # Session management
│   │   ├── routes_report.py             # Report generation
│   │   └── routes_ws.py                 # WebSocket handlers
│   │
│   ├── auth/
│   │   ├── face_auth.py                 # Face recognition login
│   │   ├── face_embedding_store.py      # Face vector storage
│   │   ├── otp_service.py               # OTP verification
│   │   ├── token_auth.py                # JWT token auth
│   │   └── token_reset.py               # Password reset flow
│   │
│   ├── core/
│   │   ├── llm_engine.py                # LLM (Gemini) integration
│   │   ├── embedding_engine.py          # Text embeddings
│   │   ├── faiss_store.py               # Vector store operations
│   │   ├── similarity_engine.py         # Vector similarity search
│   │   └── safety_rules.py              # Medical safety checks
│   │
│   ├── services/
│   │   ├── stt_engine.py                # Speech-to-text
│   │   ├── tts_engine.py                # Text-to-speech
│   │   ├── dialogue_manager.py          # Conversation flow
│   │   ├── medical_rag_service.py       # RAG orchestration
│   │   └── email_agent.py               # Email delivery
│   │
│   ├── interview/
│   │   ├── interview_engine.py          # Interview logic
│   │   ├── question_bank.py             # Medical questions
│   │   └── symptom_extractor.py         # Symptom parsing
│   │
│   ├── vision/
│   │   ├── emotion_detector.py          # Emotion analysis
│   │   ├── eye_lip_tracker.py           # Facial feature tracking
│   │   └── face_recognition.py          # Face identification
│   │
│   ├── reports/
│   │   ├── pdf_generator.py             # PDF report creation
│   │   ├── email_service.py             # SMTP/SendGrid
│   │   └── sendgrid_service.py          # SendGrid integration
│   │
│   ├── database/
│   │   ├── db.py                        # Database setup
│   │   ├── models.py                    # SQLAlchemy models
│   │   └── crud.py                      # Database operations
│   │
│   ├── config.py                        # Configuration settings
│   └── main.py                          # FastAPI entry point
│
├── medical_rag/
│   ├── disease_predictor.py             # Symptom → Disease mapping
│   ├── medicine_retriever.py            # Disease → Medicines retrieval
│   ├── build_disease_index.py           # FAISS disease index builder
│   ├── build_medicine_index.py          # FAISS medicine index builder
│   ├── clean_dataset.py                 # Medicine dataset processor
│   └── medical_reasoning_pipeline.py    # RAG orchestration
│
├── frontend/
│   └── streamlit_app.py                 # Streamlit UI
│
├── mobile-app/                          # React Native mobile app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   └── api/
│   └── package.json
│
├── data/
│   ├── raw/
│   │   └── all_medicine databased.csv   # Medicine dataset (250K+)
│   ├── processed/
│   │   └── clean_medicine_data.csv      # Cleaned medicine data
│   ├── faiss_index/
│   │   ├── medicine_index.faiss         # Medicine vectors
│   │   ├── medicine_metadata.pkl        # Medicine metadata
│   │   ├── disease_index.faiss          # Disease vectors
│   │   └── disease_metadata.pkl         # Disease metadata
│   ├── embeddings/                      # Cached embeddings
│   └── reports/                         # Generated PDF reports
│
├── scripts/
│   └── test_llm_fallbacks.py            # LLM testing utilities
│
├── .env                                 # Environment variables
├── requirements.txt                     # Python dependencies
├── README.md                            # This file
└── TODO.md                              # Development roadmap
```

---

## 🔄 Complete Workflow: From Symptoms to Prescription

### 1️⃣ Patient Intake

```
Patient Starts Interview
    ↓
1. Authentication (Face/Token)
2. Load Medical History
3. Start Multi-Sensory Capture:
   - Audio Input (STT)
   - Vision Monitoring (Emotion)
   - Form Data (Symptoms/Allergies)
```

### 2️⃣ Interactive Conversation

```
AI Questions:
"What symptoms are you experiencing?"

Patient Response:
"High fever, cough, headache for 2 weeks"
    ↓
    ├─ STT: Convert audio → text
    ├─ Vision: Analyze emotion/distress
    └─ Extract: Symptoms, severity, duration
    ↓
Continue 10-12 guided questions until symptoms clarified
```

### 3️⃣ Medical RAG Pipeline

```
┌───────────────────────────────────────┐
│  Supervisor Agent Workflow            │
├───────────────────────────────────────┤
│                                       │
│ Input: Symptoms = "fever, cough"     │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Step 1: Medical RAG Retrieval   │  │
│ ├─────────────────────────────────┤  │
│ │ A) Disease Prediction:          │  │
│ │    Convert symptoms → embedding │  │
│ │    Search disease_index.faiss   │  │
│ │    Results: Flu, COVID-19, ...  │  │
│ │                                 │  │
│ │ B) Medicine Retrieval:          │  │
│ │    For each disease:            │  │
│ │    Search medicine_index.faiss  │  │
│ │    Results: Top 10 medicines    │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Step 2: Condition Prediction    │  │
│ ├─────────────────────────────────┤  │
│ │ Condition Agent analyzes:       │  │
│ │ • Symptom severity              │  │
│ │ • Duration of illness           │  │
│ │ • Vision distress signals       │  │
│ │ • Similar historical cases      │  │
│ │ • Medical knowledge (RAG)       │  │
│ │                                 │  │
│ │ Output: "Influenza (Flu)"       │  │
│ │ Confidence: 87%                 │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Step 3: Prescription Generation │  │
│ ├─────────────────────────────────┤  │
│ │ Medication Agent creates:       │  │
│ │ • Allopathic medicines          │  │
│ │   - Name: Aspirin               │  │
│ │   - Dosage: 500mg               │  │
│ │   - Instruction: Twice daily    │  │
│ │ • Ayurvedic remedies            │  │
│ │   - Turmeric+Ginger Tea         │  │
│ │   - Benefits: Anti-inflammatory │  │
│ │ • Prevention tips (3+ items)    │  │
│ │   - Stay hydrated               │  │
│ │   - Get adequate rest           │  │
│ │   - Avoid close contact         │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ Step 4: Safety Validation       │  │
│ ├─────────────────────────────────┤  │
│ │ Safety Agent checks:            │  │
│ │ • Blacklist forbidden drugs     │  │
│ │ • Patient allergies             │  │
│ │ • Drug interactions             │  │
│ │                                 │  │
│ │ Result: ✅ SAFE                 │  │
│ └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

### 4️⃣ Output Prescription

```json
{
  "condition": "Influenza (Flu)",
  "confidence": 0.87,
  "medication": {
    "allopathic": [
      {
        "name": "Aspirin",
        "dosage": "500mg",
        "instruction": "Twice daily after meals"
      },
      {
        "name": "Paracetamol",
        "dosage": "650mg",
        "instruction": "Every 6 hours as needed"
      }
    ],
    "ayurvedic": [
      {
        "remedy": "Ginger Turmeric Tea",
        "benefit": "Reduces inflammation and boosts immunity"
      },
      {
        "remedy": "Honey Lemon Warm Water",
        "benefit": "Soothes throat and aids recovery"
      }
    ]
  },
  "prevention": [
    "Stay hydrated - drink at least 8 glasses of water daily",
    "Get adequate rest - sleep 7-8 hours per night",
    "Avoid close contact with others to prevent spread",
    "Maintain proper hand hygiene",
    "Use saline nasal drops for congestion relief"
  ],
  "safety_passed": true,
  "similar_cases": [...]
}
```

### 5️⃣ Report Generation & Delivery

```
Generate PDF Report:
├── Patient Info
├── Medical History
├── Extracted Symptoms
├── Diagnosis & Confidence
├── Allopathic Prescriptions
├── Ayurvedic Remedies
├── Prevention Guidelines
└── Medical Disclaimer

Email Report:
├── Via SendGrid/SMTP
├── Patient receives PDF
└── Doctor receives copy (if enabled)
```

---

## 🚀 Complete Setup & Installation Guide

### Prerequisites
- Python 3.10+
- pip/conda
- Google AI API key (Gemini)
- SendGrid/Gmail credentials (optional)
- 4GB+ RAM (for FAISS indices)

### Step 1: Clone Repository

```bash
git clone https://github.com/26Divyaniingle/vision-based-mvp.git
cd vision-based-mvp
```

### Step 2: Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

Create `.env` file in root directory:

```env
# ===== Google Gemini API =====
GEMINI_API_KEY=your_google_ai_key_here

# ===== Database =====
DATABASE_URL=sqlite:///./data/vision_agent.db

# ===== Email Configuration (SendGrid) =====
SENDGRID_API_KEY=your_sendgrid_key_here
EMAIL_SENDER=noreply@yourdomain.com

# ===== Email Configuration (SMTP/Gmail) =====
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# ===== Face Recognition =====
FACE_RECOGNITION_THRESHOLD=0.70

# ===== RAG System =====
FAISS_INDEX_PATH=./data/faiss_index/
MEDICINE_DATA_PATH=./data/processed/clean_medicine_data.csv

# ===== LLM Fallback Chain =====
GROQ_API_KEY=optional_groq_key
OLLAMA_URL=http://localhost:11434  # For local LLM
```

### Step 5: Setup Medical Data

```bash
# Clean medicine dataset
python medical_rag/clean_dataset.py

# Build FAISS indices (one-time operation)
python medical_rag/build_disease_index.py
python medical_rag/build_medicine_index.py

# Expected output:
# ✅ Disease index built: data/faiss_index/disease_index.faiss
# ✅ Medicine index built: data/faiss_index/medicine_index.faiss
```

### Step 6: Initialize Database

```bash
# Create SQLite tables
python -c "from app.database.db import init_db; init_db()"
```

### Step 7: Launch Backend

```bash
# Terminal 1: Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     WebSocket available at ws://0.0.0.0:8000/interview
```

### Step 8: Launch Frontend

```bash
# Terminal 2: Start Streamlit
streamlit run frontend/streamlit_app.py

# Expected output:
# You can now view your Streamlit app in your browser.
# Local URL: http://localhost:8501
```

---

## 🔌 Complete API Documentation

### Authentication Endpoints

#### Register with Face
```
POST /auth/register/face
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30,
  "phone": "9876543210",
  "email": "john@example.com",
  "image_base64": "..."
}

Response: {
  "patient_id": "uuid",
  "face_embedding": [...],
  "message": "Registration successful"
}
```

#### Login with Face
```
POST /auth/login/face
{
  "image_base64": "..."
}

Response: {
  "patient_id": "uuid",
  "token": "jwt_token",
  "confidence": 0.95
}
```

#### Forgot Token (OTP)
```
POST /auth/recovery/forgot-token
{
  "email": "john@example.com"
}

Response: {
  "message": "OTP sent to email"
}
```

### Interview Endpoints

#### Start Interview
```
POST /interview/start
{
  "patient_id": "uuid",
  "session_type": "consultation"
}

Response: {
  "session_id": "session-uuid",
  "first_question": "What brings you in today?",
  "websocket_url": "ws://localhost:8000/interview/ws"
}
```

#### WebSocket Interview (Real-time)
```
WS ws://localhost:8000/interview/ws?session_id=xxx

Message Types:
1. user_input: {"type": "user_input", "text": "I have fever"}
2. audio_chunk: {"type": "audio_chunk", "data": "base64_audio"}
3. vision_frame: {"type": "vision_frame", "data": "base64_image"}

Server Responds:
1. ai_response: {"type": "ai_response", "text": "..."}
2. question: {"type": "question", "text": "..."}
3. finalize: {"type": "finalize", "diagnosis": {...}, "vision": {...}}
```

#### Get Interview Results
```
GET /interview/results/{session_id}

Response: {
  "condition": "Influenza",
  "confidence": 0.87,
  "medication": {
    "allopathic": [...],
    "ayurvedic": [...],
    "prevention": [...]
  },
  "safety_passed": true,
  "vision_summary": {...}
}
```

### Report Endpoints

#### Generate PDF Report
```
POST /report/generate
{
  "session_id": "session-uuid"
}

Response: {
  "report_id": "report-uuid",
  "pdf_url": "http://server/reports/report-uuid.pdf",
  "generated_at": "2026-04-21T10:30:00Z"
}
```

#### Send Report via Email
```
POST /report/send
{
  "session_id": "session-uuid",
  "recipient_email": "patient@example.com",
  "include_doctor_copy": true
}

Response: {
  "message": "Report sent successfully",
  "sent_to": ["patient@example.com", "doctor@example.com"]
}
```

---

## 🎬 How Medical RAG Works

### Medical Knowledge Database

The system uses the **All India Medicine Database** containing:
- **250,000+ medicines** with metadata
- **Disease-to-medicine mappings** via embeddings
- **Symptom-to-disease predictions** using FAISS

### RAG Pipeline Flow

```
User Symptoms: "Fever, cough, headache"
        ↓
┌───────────────────────────────────────┐
│ Step 1: Symptom Embedding             │
│ (SentenceTransformer - 384 dimensions)│
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ Step 2: Disease Search (FAISS)        │
│ Query: "Fever cough headache"         │
│ Top-3 Results:                        │
│ • Influenza (99.2% similarity)        │
│ • COVID-19 (95.8% similarity)         │
│ • Bronchitis (92.1% similarity)       │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ Step 3: Medicine Retrieval (FAISS)    │
│ For disease "Influenza":              │
│ Top medicines:                        │
│ • Aspirin (uses: pain relief)         │
│ • Ibuprofen (uses: fever reduction)   │
│ • Paracetamol (uses: pain/fever)      │
│ [Deduplicate & limit to top 10]       │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ Step 4: Format as RAG Context         │
│ For LLM Prompt:                       │
│ "VERIFIED MEDICINES:                  │
│  - Aspirin: Used for pain relief...   │
│  - Ibuprofen: Used for fever..."      │
└───────────────┬───────────────────────┘
                ↓
┌───────────────────────────────────────┐
│ Step 5: LLM Generation                │
│ Medication Agent uses RAG context     │
│ to generate prescriptions:            │
│ • Select from verified medicines      │
│ • Add dosage & instructions           │
│ • Include prevention tips             │
│ • Validate against safety rules       │
└───────────────────────────────────────┘
```

### FAISS Index Details

```
Disease Index:
├── Total diseases: 1,000+
├── Embedding size: 384 dimensions
├── Index type: FlatL2 (exact search)
└── Query time: <50ms

Medicine Index:
├── Total medicines: 250,000
├── Embedding size: 384 dimensions
├── Columns: name, uses, side_effects, chemical_class
├── Index type: FlatL2 (exact search)
└── Query time: <100ms
```

---

## 📤 Output Format

Every consultation returns comprehensive output:

```json
{
  "session_id": "session-2024-001",
  "condition": {
    "name": "Viral Fever",
    "icd_code": "R50.9",
    "confidence": 0.87,
    "severity": "moderate"
  },
  "medication": {
    "allopathic": [
      {
        "name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "Every 6 hours",
        "instruction": "Take after meals with water",
        "duration": "5 days",
        "side_effects": "Rarely nausea"
      }
    ],
    "ayurvedic": [
      {
        "remedy": "Tulsi (Holy Basil) Tea",
        "benefit": "Boosts immunity and reduces fever",
        "preparation": "Boil 10-15 leaves in water for 5 minutes",
        "frequency": "Twice daily"
      }
    ]
  },
  "prevention": [
    "Stay hydrated - drink 8-10 glasses of water daily",
    "Get 7-8 hours of sleep to support immune system",
    "Avoid oily and spicy food",
    "Wash hands frequently to prevent spread",
    "Use hand sanitizer if water unavailable",
    "Maintain distance from infected persons"
  ],
  "lifestyle_tips": [
    "Light exercise like walking (if not too weak)",
    "Avoid stressful activities",
    "Wear light clothing"
  ],
  "when_to_seek_help": [
    "If fever persists beyond 7 days",
    "If symptoms worsen significantly",
    "If new serious symptoms develop",
    "If difficulty breathing occurs"
  ],
  "safety_passed": true,
  "similar_cases": 3,
  "generated_at": "2026-04-21T10:30:00Z"
}
```
---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| FAISS index not found | Run `python medical_rag/build_medicine_index.py` |
| Prevention tips missing | Check LLM response format; ensure JSON parsing works |
| Database locked | Close other instances; delete `.db-journal` file |
| OTP not sending | Check SMTP/SendGrid credentials in `.env` |
| Face recognition fails | Ensure good lighting; try different angle |
| High latency | Increase FAISS cache; use IndexFlatL2 instead of HNSW |
| Memory issues | Process medicine data in batches; use sparse indices |

---

## 📈 Performance Metrics

```
Component              | Latency  | Throughput
─────────────────────────────────────────────
Disease Prediction     | 50ms     | 100 req/s
Medicine Retrieval     | 100ms    | 50 req/s
LLM Inference          | 2-5s     | 10 req/s
Face Recognition       | 200ms    | 50 req/s
PDF Generation         | 3-5s     | 5 req/s
Full Consultation      | 8-12min  | 1 concurrent
─────────────────────────────────────────────
```



## 📝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit Pull Request





---

## 🏥 Medical Disclaimer

⚠️ **IMPORTANT DISCLAIMER:**

This system is designed for **educational and advisory purposes only**. It is NOT a substitute for professional medical consultation. Always consult with a qualified healthcare provider for:
- Serious medical conditions
- Prescription medications
- Surgical decisions
- Mental health concerns
- Emergency situations

Users are solely responsible for any medical decisions made based on this system's recommendations.

---

**Last Updated:** April 21, 2026  
**Version:** 2.0 (RAG-Enhanced)
```bash
streamlit run frontend/streamlit_app.py
```

---

## 📄 License
This project is developed as a Healthcare AI MVP. All medical suggestions should be verified by a licensed healthcare professional.
