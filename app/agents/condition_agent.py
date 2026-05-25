"""
Condition Agent Module
This specialized agent makes the actual disease/condition diagnosis.
It analyzes patient symptoms, vision insights, historical cases, and medical knowledge
to predict the most likely medical condition and a confidence score.
"""

from .base_agent import BaseAgent
import json

class ConditionAgent(BaseAgent):
    """
    Specialized agent for medical condition prediction and diagnosis.
    Makes the core diagnosis decision based on multiple data sources.
    """
    
    def __init__(self):
        """
        Initialize the condition prediction agent with a diagnostic persona.
        """
        super().__init__(persona="medical diagnostic assistant matching the 'Llama' persona")

    async def predict_condition(self, form_data: dict, vision_features: dict, similar_cases: list, rag_context: str, patient_history: list = None):
        """
        Predict the patient's medical condition based on all available data.
        
        Args:
            form_data: Patient's symptom descriptions and medical history
            vision_features: Emotional and physical indicators from webcam analysis
            similar_cases: Previously diagnosed cases with similar symptoms
            rag_context: Medical knowledge retrieved from the knowledge base
            patient_history: Previous consultations for this specific patient
            
        Returns:
            A tuple of (condition_name, confidence_score, is_serious)
            - condition_name: String describing the predicted condition
            - confidence_score: Float between 0 and 1 indicating diagnosis confidence
            - is_serious: Boolean indicating if the case requires immediate care
        """
        
        # Format patient history for the prompt
        history_str = "None available"
        if patient_history:
            history_str = "\n".join([
                f"- Date: {getattr(h, 'created_at', 'Unknown')}, Condition: {getattr(h, 'predicted_condition', 'Unknown')}, Symptoms: {getattr(h, 'symptoms', 'Unknown')}"
                for h in patient_history[:5]  # Last 5 sessions
            ])

        # Create a comprehensive prompt with all available data
        prompt = f"""
You are a {self.persona}.
Analyze the following patient data:
Form: {json.dumps(form_data)}
Vision Insights: {json.dumps(vision_features)}
Similar Historical Cases (Other Patients): {json.dumps(similar_cases)}
Patient's Own Previous Consultations: 
{history_str}

REFERENCE MEDICAL KNOWLEDGE (RAG):
{rag_context}

Based ON the patient current symptoms, their medical history (previous consultations), and the provided reference medical knowledge, output ONLY a JSON with three keys:
"condition": <the predicted medical condition, concise>
"confidence": <float between 0 and 1>
"is_serious": <boolean, true if the case is potentially life-threatening or requires immediate clinical care, otherwise false>
"""
        
        # Send prompt to LLM and get response
        resp = await self.get_response(prompt)
        
        # Parse the JSON response from the LLM
        data = self.parse_json(resp)
        
        # Extract fields, with sensible defaults if parsing fails
        condition = data.get("condition", "Possible viral infection or stress")
        confidence = float(data.get("confidence", 0.6))
        is_serious = bool(data.get("is_serious", False))
        
        return condition, confidence, is_serious


