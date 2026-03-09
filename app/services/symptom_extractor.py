"""
Symptom Extraction Engine
Uses a BioBERT/ClinicalBERT NLP model for Medical Named Entity Recognition (NER).
Extracts symptoms from patient speech and dialogue.
"""

from typing import List

# Cache pipeline globally
_ner_pipeline = None

def get_ner_pipeline():
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            from transformers import pipeline
            # Using d4data/biomedical-ner-all as a BioBERT/ClinicalBERT proxy
            _ner_pipeline = pipeline("ner", model="d4data/biomedical-ner-all", aggregation_strategy="simple")
        except Exception as e:
            print(f"Transformers NER pipeline failed to load: {e}")
            _ner_pipeline = "fallback"
    return _ner_pipeline

def extract_symptoms_ner(text: str) -> List[str]:
    """
    Extract medical symptoms from patient's natural language using NER.
    """
    pipe = get_ner_pipeline()
    
    # If transformers is unavailable or fails, fallback to LLM
    if pipe == "fallback" or not pipe:
        return _extract_symptoms_llm_fallback(text)
        
    try:
        results = pipe(text)
        symptoms = []
        for entity in results:
            if entity.get("entity_group") in ["Sign_symptom", "Disease_Disorder", "Medication"]:
                symptoms.append(entity["word"])
        return list(set(symptoms))
    except Exception as e:
        print(f"NER Extraction error: {e}")
        return _extract_symptoms_llm_fallback(text)

def _extract_symptoms_llm_fallback(text: str) -> List[str]:
    """Fallback LLM-based extraction if BioBERT pipeline fails."""
    from app.core.llm_engine import generate_response
    import json
    
    prompt = f"Extract a JSON array of medical symptoms from this text: '{text}'. Only output the array, like [\"headache\", \"nausea\"]."
    resp = generate_response(prompt)
    try:
        import re
        match = re.search(r'\[.*\]', resp.replace('\n', ' '))
        if match:
            return json.loads(match.group())
        return []
    except:
        return []
