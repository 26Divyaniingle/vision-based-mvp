import os
import sys

# Add the current directory to sys.path to allow imports if run as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from disease_predictor import predict_disease
from medicine_retriever import retrieve_medicines

class MedicalReasoningPipeline:
    def __init__(self):
        pass

    def run_pipeline(self, symptoms: str):
        """
        Orchestrates the 3-layer medical RAG pipeline.
        """
        print(f"\n--- Medical Reasoning Pipeline ---")
        print(f"Symptoms: {symptoms}")

        # Step 1: Predict Disease
        print("\nStep 1: Predicting diseases...")
        predicted_diseases = predict_disease(symptoms)
        print(f"Predicted Diseases: {predicted_diseases}")

        # Step 2: Retrieve Medicines for predicted diseases
        print("\nStep 2: Retrieving medicines...")
        all_medicines = []
        seen_medicines = set()
        
        for disease in predicted_diseases:
            meds = retrieve_medicines(disease)
            for med in meds:
                if med['name'] not in seen_medicines:
                    all_medicines.append(med)
                    seen_medicines.add(med['name'])
        
        # Limit to top 5 distinct medicines across all predicted diseases
        verified_medicines = all_medicines[:5]

        # Step 3: Prepare structured context for LLM
        print("\nStep 3: Preparing context for LLM...")
        
        medicine_context = ""
        for med in verified_medicines:
            medicine_context += f"Name: {med['name']}\nUses: {med['uses']}\nSide Effects: {med.get('side_effects', 'N/A')}\n\n"

        prompt_context = f"""
Patient symptoms:
{symptoms}

Predicted diseases:
{', '.join(predicted_diseases)}

Verified medicines:
{medicine_context}

Instruction to LLM:
You are a medical assistant.
Based only on the retrieved medicines and diseases, suggest the safest treatment and dosage guidance.
Do not invent medicines. Ensure you mention that this is for informational purposes and the patient should consult a doctor.
"""
        return prompt_context

if __name__ == "__main__":
    pipeline = MedicalReasoningPipeline()
    # Example input
    test_input = "high fever cough headache"
    context = pipeline.run_pipeline(test_input)
    print("\n--- Final LLM Prompt Context ---")
    print(context)
