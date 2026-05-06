"""
Medical Agent Module
Uses multi-modal inputs + symptom context to predict medical conditions.
Combines logic from condition_agent, medication_agent, and FAISS store.
"""
from app.agents.supervisor_agent import run_agentic_workflow
from app.database.crud import get_sessions_by_patient_id
from sqlalchemy.orm import Session as DBSession

async def predict_condition(symptoms: list, vision_metrics: dict, conversation_history: list, db: DBSession = None, patient_id: int = -1) -> dict:
    """
    Consolidates the extracted data into a diagnosis and care plan.
    It calls the existing agentic workflow.
    """
    # Fetch patient history if available
    patient_history = []
    if db and patient_id > 0:
        try:
            patient_history = get_sessions_by_patient_id(db, patient_id)
        except Exception as e:
            print(f"Error fetching patient history: {e}")

    form_data = {
        "symptoms": ", ".join(symptoms),
        "conversation_summary": conversation_history[-6:],
        "weight": 70, # defaults
        "age": 30
    }
    
    # We pass the aggregated vision metrics
    features = {
        "emotion": vision_metrics.get("dominant_emotion", "neutral"),
        "eye_strain_score": vision_metrics.get("avg_eye_strain", 0.0),
        "lip_tension": vision_metrics.get("avg_lip_tension", 0.0)
    }

    result = await run_agentic_workflow(form_data, features, patient_history=patient_history)
    return result
