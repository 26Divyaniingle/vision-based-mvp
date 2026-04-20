from app.agents.comparison_agent import get_similar_cases
from app.agents.condition_agent import predict_condition
from app.agents.medication_agent import suggest_medication
from app.agents.safety_agent import run_safety_check
from app.agents.learning_agent import store_session_for_learning
from app.services.medical_rag_service import MedicalRAGService
import asyncio

async def run_agentic_workflow(form_data: dict, vision_features: dict) -> dict:
    symptoms = form_data.get('symptoms', '')
    
    # RAG Layer: Retrieve grounded medical knowledge
    rag_data = MedicalRAGService.get_context_for_llm(symptoms)
    rag_context = MedicalRAGService.format_rag_context(rag_data)

    # Comparison
    similar_cases = get_similar_cases(form_data, vision_features.get('emotion', ''))
    
    # Condition Pred (Now with RAG context)
    condition, conf = await predict_condition(form_data, vision_features, similar_cases, rag_context)
    
    # Medication & Prevention (Now with RAG context)
    med_res = await suggest_medication(condition, form_data, rag_context)
    
    # Safety
    # We check the names of allopathic meds
    med_names = ", ".join([m.get("name", "") for m in med_res.get("allopathic", [])])
    safe = await asyncio.to_thread(run_safety_check, med_names)
    
    if not safe:
        med_res["allopathic"] = [{"name": "Safety Check Failed", "dosage": "N/A", "instruction": "Consult a doctor immediately"}]
        med_res["ayurvedic"] = [{"remedy": "N/A", "benefit": "Seek professional help"}]
        med_res["prevention"] = ["Immediate medical attention advised."]
    
    # Learning (Store interaction)
    combined_meds_text = f"Condition: {condition} | Meds: {med_names}"
    store_session_for_learning(form_data, vision_features, condition, combined_meds_text)
    
    return {
        "condition": condition,
        "confidence": conf,
        "medication": {
            "allopathic": med_res.get("allopathic", []),
            "ayurvedic": med_res.get("ayurvedic", [])
        },
        "prevention": med_res.get("prevention", []),
        "safety_passed": safe,
        "similar_cases": similar_cases
    }
