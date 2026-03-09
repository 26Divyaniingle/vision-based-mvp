# Vision Agentic AI MVP - Real-Time Medical  Chatbot

This project is an advanced Vision-Based Agentic AI Healthcare System. It features a conversational medical chatbot that conducts an interview with the patient, extracting progressive symptoms through NLP while simultaneously analyzing live webcam feeds to evaluate emotional state, eye strain, and lip tension.

## How to Run the Project

You need to run two separate processes: the backend API and the frontend UI.

### 1. Setup Environment
Ensure you have activated your virtual environment and installed all dependencies:
```bash
# If using Windows powershell
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start the FastAPI Backend
Open a terminal in the root directory and start the server:
```bash
# From the vision_agentic_ai_mvp directory
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*The backend must be running first because the frontend relies on it.*

### 3. Start the Streamlit Frontend
Open a **new** terminal, activate the environment, and run the Streamlit app:
```bash
# From the vision_agentic_ai_mvp directory
streamlit run frontend\streamlit_app.py
```
This will automatically open your default browser pointing to `http://localhost:8501`.

## Medical Interview Flow Overview

1. **Authentication**
   - The user registers their face and logs in securely using DeepFace facial recognition.
   - Fallback authentication is available via token.

2. **Pre-Consultation**
   - The patient provides basic details such as age and weight.
   - Patient hits the "Start AI Interview" button.

3. **Real-time Questioning & Speech Handling**
   - The AI starts the consultation by asking a sequence of targeted medical questions (from `question_bank.py`).
   - The interface reads the questions aloud using **Browser-native TTS** (Text-to-Speech).
   - The user answers the questions either by typing or by speaking utilizing the **Browser-native STT** engine (Speech Recognition).

4. **Continuous Vision Analysis**
   - As the interview progresses, a webcam stream takes continuous snapshots.
   - DeepFace and MediaPipe extract vision metrics including *dominant emotion*, *eye strain*, and *lip tension*.
   - This data is aggregated across the entire interview duration to form a "Vision Summary" over time.

5. **NLP Symptom Extraction (Gemini LLM)**
   - Every time the patient gives an answer, the backend uses a prompt tailored for Gemini to extract named medical symptoms, severity, patterns, lifestyle issues, or medications mentioned in that turn.
   - The AI aggregates symptoms cumulatively throughout the conversation.

6. **Agentic Workflows (The resulting diagnosis)**
   - After the final question, the engine compiles the complete conversational history, the array of extracted symptoms, and the computed vision averages.
   - These parameters map into the existing **Supervisor Agent** logic:
     - **Comparison Agent:** Retrieves similar historical medical cases via Faiss vector store.
     - **Condition Agent:** Predicts the likely condition with a percentage confidence.
     - **Medication Agent:** Suggests homeopathic remedies.
     - **Safety Agent:** Checks recommended meds against safe guidelines.
     - **Learning Agent:** Re-incorporates the newly solved case back into the vector memory.

7. **Reporting**
   - The finalized session report shows both the Vision trends and the AI medical diagnosis.
   - Users can download this report as a generated PDF or have it emailed directly to them.
