from app.agents.comparison_agent import get_similar_cases
from app.agents.condition_agent import predict_condition
from app.agents.medication_agent import suggest_medication
from app.agents.safety_agent import run_safety_check
from app.agents.learning_agent import store_session_for_learning
from app.services.medical_rag_service import MedicalRAGService

def run_agentic_workflow(form_data: dict, vision_features: dict):
    symptoms = form_data.get('symptoms', '')
    
    # RAG Layer: Retrieve grounded medical knowledge
    rag_data = MedicalRAGService.get_context_for_llm(symptoms)
    rag_context = MedicalRAGService.format_rag_context(rag_data)

    # Comparison
    similar_cases = get_similar_cases(form_data, vision_features.get('emotion', ''))
    
    # Condition Pred (Now with RAG context)
    condition, conf = predict_condition(form_data, vision_features, similar_cases, rag_context)
    
    # Medication & Prevention (Now with RAG context)
    med_res = suggest_medication(condition, form_data, rag_context)
    meds = med_res.get("medication", "")
    ayurvedic = med_res.get("ayurvedic", "")
    prevention = med_res.get("prevention", "")
    
    # Safety
    safe = run_safety_check(meds)
    if not safe:
        meds = "Proposed medication failed safety checks. Please consult a doctor directly."
        ayurvedic = "Please consult a doctor before trying any home remedies."
        prevention = "Consult a licensed medical professional immediately."
    
    # Learning (Store interaction)
    combined_meds = f"Clinical/Allopathic: {meds} | Ayurvedic: {ayurvedic}"
    store_session_for_learning(form_data, vision_features, condition, combined_meds)
    
    return {
        "condition": condition,
        "confidence": conf,
        "medication": meds,
        "ayurvedic": ayurvedic,
        "prevention": prevention,
        "safety_passed": safe,
        "similar_cases": similar_cases
    }
