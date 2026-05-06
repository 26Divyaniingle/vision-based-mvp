"""
Medical RAG (Retrieval Augmented Generation) Service Module
This module implements RAG which grounds AI responses in verified medical knowledge.
Instead of letting the AI make up medical information, it retrieves real medicines and diseases
from the knowledge base and provides those to the AI as context.
This ensures recommendations are based on actual medical data, not hallucinations.
"""

import os
import sys

# Ensure project root is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from medical_rag.disease_predictor import predict_disease
from medical_rag.medicine_retriever import retrieve_medicines

class MedicalRAGService:
    """
    Service for Retrieval Augmented Generation (RAG) in the medical domain.
    Retrieves verified diseases and medicines from the knowledge base.
    """
    
    @staticmethod
    def get_context_for_llm(symptoms: str):
        """
        Retrieve verified medical knowledge based on patient symptoms.
        This provides grounded context to prevent AI hallucinations.
        
        Process:
        1. Predict likely diseases from the symptoms
        2. For each disease, retrieve verified medicines from the database
        3. Remove duplicate medicines
        4. Return the top 10 medicines
        
        Args:
            symptoms: Patient's symptom description
            
        Returns:
            Dictionary with:
            - diseases: List of predicted diseases
            - medicines: List of verified medicines with details
        """
        try:
            # Step 1: Predict likely diseases from the symptoms using ML model
            # This uses similarity search to find matching diseases
            diseases = predict_disease(symptoms)
            
            # Step 2: Retrieve medicines for each predicted disease
            all_medicines = []
            seen_meds = set()  # Track medicines we've already added
            
            for disease in diseases:
                # Get medicines for this specific disease
                meds = retrieve_medicines(disease)
                # Add each medicine if we haven't seen it before (avoid duplicates)
                for med in meds:
                    if med['name'] not in seen_meds:
                        all_medicines.append(med)
                        seen_meds.add(med['name'])
            
            # Step 3: Limit to top 10 medicines to keep context manageable for LLM
            verified_medicines = all_medicines[:10]
            
            return {
                "diseases": diseases,  # The predicted diseases
                "medicines": verified_medicines  # Verified medicines from database
            }
        except Exception as e:
            print(f"Error in MedicalRAGService: {e}")
            # Return empty data if retrieval fails (safe fallback)
            return {"diseases": [], "medicines": []}

    @staticmethod
    def format_rag_context(rag_data: dict) -> str:
        """
        Convert RAG data into a formatted string for LLM prompts.
        This makes the information readable and clearly structured for the AI.
        
        Args:
            rag_data: Dictionary with diseases and medicines from get_context_for_llm()
            
        Returns:
            Formatted text with diseases and medicine details
            Example:
            PREDICTED DISEASES FROM KNOWLEDGE BASE: cold, flu
            VERIFIED MEDICINES FROM DATABASE:
            - Aspirin: Used for pain relief. Side effects: Stomach upset
            - Ibuprofen: Used for fever reduction. Side effects: Allergic reaction
        """
        medicines = rag_data.get("medicines", [])
        diseases = rag_data.get("diseases", [])
        
        # Start with the predicted diseases
        context = f"PREDICTED DISEASES FROM KNOWLEDGE BASE: {', '.join(diseases)}\n"
        context += "VERIFIED MEDICINES FROM DATABASE:\n"
        
        # Add each medicine with its uses and side effects
        for med in medicines:
            context += f"- {med['name']}: Used for {med['uses']}. Side effects: {med.get('side_effects', 'N/A')}\n"
        
        return context

