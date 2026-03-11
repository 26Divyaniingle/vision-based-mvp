from app.agents.comparison_agent import get_similar_cases
from app.agents.condition_agent import predict_condition
from app.agents.medication_agent import suggest_medication
from app.agents.safety_agent import run_safety_check
from app.agents.learning_agent import store_session_for_learning

def run_agentic_workflow(form_data: dict, vision_features: dict):
    # Comparison
    similar_cases = get_similar_cases(form_data, vision_features.get('emotion', ''))
    
    # Condition Pred
    condition, conf = predict_condition(form_data, vision_features, similar_cases)
    
    # Medication & Prevention
    med_res = suggest_medication(condition, form_data)
    meds = med_res.get("medication", "")
    prevention = med_res.get("prevention", "")
    
    # Safety
    safe = run_safety_check(meds)
    if not safe:
        meds = "Proposed medication failed safety checks. Please consult a doctor directly."
        prevention = "Consult a licensed medical professional immediately."
    
    # Learning (Store interaction)
    store_session_for_learning(form_data, vision_features, condition, meds)
    
    return {
        "condition": condition,
        "confidence": conf,
        "medication": meds,
        "prevention": prevention,
        "safety_passed": safe,
        "similar_cases": similar_cases
    }
