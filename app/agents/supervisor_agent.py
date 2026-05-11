"""
Supervisor Agent Module
The Supervisor Agent orchestrates (coordinates) all other specialized medical agents.
It controls the workflow: it calls each agent in order and combines their results.
Think of it as the project manager that delegates tasks to the team of specialist agents.

Agent Architecture:
1. Supervisor Agent - coordinates the workflow
2. Comparison Agent - finds similar historical cases
3. Condition Agent - predicts the medical condition
4. Medication Agent - recommends medications and therapies
5. Safety Agent - checks for medication interactions and warnings
6. Learning Agent - stores data for future learning
"""

from .comparison_agent import ComparisonAgent
from .condition_agent import ConditionAgent
from .medication_agent import MedicationAgent
from .safety_agent import SafetyAgent
from .learning_agent import LearningAgent
from app.services.medical_rag_service import MedicalRAGService
import asyncio

class SupervisorAgent:
    """
    Main orchestrator agent that coordinates all other agents.
    It runs a structured workflow to process patient data and generate medical recommendations.
    """
    
    def __init__(self):
        """
        Initialize the supervisor and all team member agents.
        Each agent becomes available for delegation.
        """
        self.comparison_agent = ComparisonAgent()  # Finds similar past cases
        self.condition_agent = ConditionAgent()  # Diagnoses condition
        self.medication_agent = MedicationAgent()  # Recommends medicines
        self.safety_agent = SafetyAgent()  # Checks medication safety
        self.learning_agent = LearningAgent()  # Records session for learning

    async def run_workflow(self, form_data: dict, vision_features: dict, patient_history: list = None) -> dict:
        """
        Execute the complete medical consultation workflow.
        Processes patient input through multiple AI agents and returns recommendations.
        
        Args:
            form_data: Patient information (name, symptoms, medical history, etc.)
            vision_features: Data from webcam analysis (emotion, facial features, etc.)
            patient_history: List of previous consultations for this specific patient
            
        Returns:
            A dictionary containing the final diagnosis, medications, and safety check results
        """
        # Extract key information from input
        symptoms = form_data.get('symptoms', '')
        emotion = vision_features.get('emotion', '')
        
        # ===== STEP 1: Retrieval Augmented Generation (RAG) =====
        # Search medical knowledge base for relevant information
        rag_data = MedicalRAGService.get_context_for_llm(symptoms)
        # Format the retrieved data into readable context for the AI
        rag_context = MedicalRAGService.format_rag_context(rag_data)

        # ===== STEP 2: Historical Comparison =====
        # Find similar cases from past consultations to help with diagnosis
        similar_cases = self.comparison_agent.get_similar_cases(form_data, emotion)
        
        # ===== STEP 3: Condition Prediction =====
        # Use the patient info, visual data, similar cases, and medical knowledge to predict the condition
        condition, conf = await self.condition_agent.predict_condition(
            form_data, vision_features, similar_cases, rag_context, patient_history
        )
        
        # ===== STEP 4: Medication & Prevention Recommendations =====
        # Suggest appropriate medications and lifestyle changes based on the condition
        med_res = await self.medication_agent.suggest_medication(condition, form_data, rag_context)
        
        # ===== STEP 5: Safety Check =====
        # Verify that recommended medicines are safe (no dangerous interactions)
        med_names = ", ".join([m.get("name", "") for m in med_res.get("allopathic", [])])
        safe = await asyncio.to_thread(self.safety_agent.check_safety, med_names)
        
        # If safety check fails, override results with a warning
        if not safe:
            med_res["allopathic"] = [{"name": "Safety Check Failed", "dosage": "N/A", "instruction": "Consult a doctor immediately", "purpose": "Safety Override"}]
            med_res["ayurvedic"] = [{"remedy": "N/A", "benefit": "Seek professional help", "usage": "N/A", "timing": "N/A"}]
            med_res["prevention"] = ["Immediate medical attention advised."]
        
        # ===== STEP 6: Learning =====
        # Store this session in the database for future learning and analysis
        self.learning_agent.store_session(form_data, vision_features, condition, med_names)
        
        # ===== Return Final Results =====
        return {
            "condition": condition,  # Predicted medical condition
            "confidence": conf,  # How confident the AI is (0-1)
            "medication": {
                "allopathic": med_res.get("allopathic", []),  # Western medicines
                "ayurvedic": med_res.get("ayurvedic", []),  # Traditional remedies
                "prevention": med_res.get("prevention", []) # Lifestyle recommendations
            },
            "prevention": med_res.get("prevention", []),  # Keep for backward compatibility if needed
            "safety_passed": safe,  # Whether medications passed safety check
            "similar_cases": similar_cases,  # Historical context used
            "patient_history_used": bool(patient_history) # Flag if personal history was used
        }

# Maintain backward compatibility for functional calls
async def run_agentic_workflow(form_data: dict, vision_features: dict, patient_history: list = None) -> dict:
    """
    Legacy function interface to run the complete workflow.
    Creates a supervisor agent and executes the workflow.
    This function is kept for backward compatibility with older code.
    """
    supervisor = SupervisorAgent()
    return await supervisor.run_workflow(form_data, vision_features, patient_history)

