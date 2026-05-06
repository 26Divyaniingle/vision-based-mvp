"""
Medication Agent Module
This agent is responsible for recommending medications and prevention strategies.
It uses the Medication Agent persona to suggest allopathic (Western) medicines,
Ayurvedic (traditional Indian) remedies, and lifestyle prevention tips.
Recommendations are based on the diagnosed condition and verified medical knowledge from RAG.
"""

from .base_agent import BaseAgent
import json

class MedicationAgent(BaseAgent):
    """
    Specialized agent for medication and wellness recommendations.
    Provides three types of recommendations: allopathic medicines, ayurvedic remedies, and prevention tips.
    """
    
    def __init__(self):
        """
        Initialize the medication agent with a medical persona.
        This persona helps the LLM understand its role and provide appropriate responses.
        """
        super().__init__(persona="Advanced Medical Assistant and Ayurvedic wellness expert")

    async def suggest_medication(self, condition: str, form_data: dict, rag_context: str) -> dict:
        """
        Generate medication and wellness recommendations for a patient's condition.
        
        Args:
            condition: The diagnosed medical condition
            form_data: Patient information including symptoms and medical history
            rag_context: Medical knowledge retrieved from the RAG database
            
        Returns:
            A dictionary with three keys:
            - allopathic: List of Western medicines with dosage and instructions
            - ayurvedic: List of traditional remedies with benefits
            - prevention: List of lifestyle tips to prevent recurrence
        """
        
        # Create a detailed prompt for the AI that specifies exactly what we want
        prompt = f"""
You are {self.persona}.
Condition: {condition}
Patient Symptoms: {form_data.get('symptoms', '')}

VERIFIED MEDICINES AND REFERENCE KNOWLEDGE (RAG):
{rag_context}

CRITICAL: Return ONLY valid JSON with ALL three fields: allopathic, ayurvedic, AND prevention.
Do NOT add any text before or after the JSON.

Based on the verified medicines and reference knowledge provided, provide a care plan in JSON format with exactly this structure:
{{
  "allopathic": [
    {{ 
      "name": "Medicine Name", 
      "dosage": "e.g. 500mg", 
      "instruction": "e.g. Twice daily after meals",
      "purpose": "Detailed explanation of what this medicine does and why it is used (e.g. 'This is an analgesic that reduces fever and blocks pain signals in the brain')"
    }}
  ],
  "ayurvedic": [
    {{ 
      "remedy": "Remedy Name", 
      "benefit": "e.g. Reduces inflammation",
      "usage": "Step-by-step RECIPE and detailed instructions on how to prepare and use it (e.g. 'Grind 3 leaves with honey...')" ,
      "timing": "Specific timing instructions (e.g. 'On an empty stomach in the early morning')"
    }}
  ],
  "prevention": [
    "Precise lifestyle tip 1",
    "Precise lifestyle tip 2",
    "Precise lifestyle tip 3"
  ]
}}

Return ONLY the raw JSON. Strictly choose allopathic medicines from the VERIFIED list if available.
Include at least 3 prevention tips for the patient.
"""
        
        # Send the prompt to the LLM and get a response
        resp = await self.get_response(prompt)
        
        # Parse the JSON response
        data = self.parse_json(resp)
        
        # Default prevention tips if the AI doesn't provide any
        DEFAULT_PREVENTION = [
            "Maintain standard health precautions.",
            "Rest adequately and get 7-8 hours of sleep.",
            "Stay well-hydrated (drink 8+ glasses of water daily)."
        ]

        # Check if prevention data is missing or empty
        prevention_data = data.get("prevention", [])
        if not prevention_data:  # handles both None and empty list []
            print(f"⚠️  WARNING: Prevention missing/empty in response. Raw response: {resp[:300]}")
            prevention_data = DEFAULT_PREVENTION
        
        # Return the properly formatted response with fallbacks for missing data
        return {
            # Allopathic medicines - use defaults if none provided
            "allopathic": data.get("allopathic", [{"name": "Consult a physician", "dosage": "N/A", "instruction": "For formal prescription", "purpose": "N/A"}]),
            # Ayurvedic remedies - use defaults if none provided
            "ayurvedic": data.get("ayurvedic", [{"remedy": "Consult an expert", "benefit": "For customized home remedies", "usage": "N/A", "timing": "N/A"}]),
            # Prevention tips - already has defaults applied above
            "prevention": prevention_data
        }

