import os
import sys

# Ensure project root is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from medical_rag.disease_predictor import predict_disease
from medical_rag.medicine_retriever import retrieve_medicines

class MedicalRAGService:
    @staticmethod
    def get_context_for_llm(symptoms: str):
        """
        Retrieves diseases and medicines based on symptoms to provide grounded context.
        """
        try:
            # 1. Predict likely diseases from symptoms
            diseases = predict_disease(symptoms)
            
            # 2. Retrieve medicines for those diseases
            all_medicines = []
            seen_meds = set()
            for disease in diseases:
                meds = retrieve_medicines(disease)
                for med in meds:
                    if med['name'] not in seen_meds:
                        all_medicines.append(med)
                        seen_meds.add(med['name'])
            
            # Limit to top medicines
            verified_medicines = all_medicines[:10]
            
            return {
                "diseases": diseases,
                "medicines": verified_medicines
            }
        except Exception as e:
            print(f"Error in MedicalRAGService: {e}")
            return {"diseases": [], "medicines": []}

    @staticmethod
    def format_rag_context(rag_data: dict) -> str:
        """
        Formats the RAG data into a string for LLM prompts.
        """
        medicines = rag_data.get("medicines", [])
        diseases = rag_data.get("diseases", [])
        
        context = f"PREDICTED DISEASES FROM KNOWLEDGE BASE: {', '.join(diseases)}\n"
        context += "VERIFIED MEDICINES FROM DATABASE:\n"
        for med in medicines:
            context += f"- {med['name']}: Used for {med['uses']}. Side effects: {med.get('side_effects', 'N/A')}\n"
        
        return context
