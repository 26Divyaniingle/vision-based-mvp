from .comparison_agent import ComparisonAgent
from .condition_agent import ConditionAgent
from .medication_agent import MedicationAgent
from .safety_agent import SafetyAgent
from .learning_agent import store_session_for_learning
from app.services.medical_rag_service import MedicalRAGService
import asyncio

class SupervisorAgent:
    def __init__(self):
        self.comparison_agent = ComparisonAgent()
        self.condition_agent = ConditionAgent()
        self.medication_agent = MedicationAgent()
        self.safety_agent = SafetyAgent()

    async def run_workflow(self, form_data: dict, vision_features: dict) -> dict:
        symptoms = form_data.get('symptoms', '')
        emotion = vision_features.get('emotion', '')
        
        # 1. RAG Layer
        rag_data = MedicalRAGService.get_context_for_llm(symptoms)
        rag_context = MedicalRAGService.format_rag_context(rag_data)

        # 2. Historical Comparison
        similar_cases = self.comparison_agent.get_similar_cases(form_data, emotion)
        
        # 3. Condition Prediction
        condition, conf = await self.condition_agent.predict_condition(
            form_data, vision_features, similar_cases, rag_context
        )
        
        # 4. Medication & Prevention
        med_res = await self.medication_agent.suggest_medication(condition, form_data, rag_context)
        
        # 5. Safety Check
        med_names = ", ".join([m.get("name", "") for m in med_res.get("allopathic", [])])
        safe = await asyncio.to_thread(self.safety_agent.check_safety, med_names)
        
        if not safe:
            med_res["allopathic"] = [{"name": "Safety Check Failed", "dosage": "N/A", "instruction": "Consult a doctor immediately"}]
            med_res["ayurvedic"] = [{"remedy": "N/A", "benefit": "Seek professional help"}]
            med_res["prevention"] = ["Immediate medical attention advised."]
        
        # 6. Learning 
        store_session_for_learning(form_data, vision_features, condition, f"Condition: {condition}")
        
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

# Maintain backward compatibility for functional calls
async def run_agentic_workflow(form_data: dict, vision_features: dict) -> dict:
    supervisor = SupervisorAgent()
    return await supervisor.run_workflow(form_data, vision_features)
