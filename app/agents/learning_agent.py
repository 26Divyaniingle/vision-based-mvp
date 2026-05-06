"""
Learning Agent Module
This agent stores consultation data in the vector database for future learning.
Each consultation becomes a case that can be retrieved and used to help diagnose future patients.
This enables the system to improve over time by learning from past experiences.
"""

from app.core.embedding_engine import generate_text_embedding
from app.core.faiss_store import add_case

class LearningAgent:
    """
    Specialized agent for storing consultation data for future learning.
    Converts patient sessions into searchable embeddings for future reference.
    """
    
    def store_session(self, form_data: dict, vision: dict, condition: str, medication: str):
        """
        Store a completed medical consultation in the vector database.
        This makes the session available for the system to learn from in future consultations.
        
        Args:
            form_data: Patient information including symptoms
            vision: Visual analysis data from the consultation
            condition: The predicted/diagnosed medical condition
            medication: The recommended medications
        """
        # Create a summary combining all key information from the session
        text_summary = f"Symptoms: {form_data.get('symptoms', '')}. Emotion: {vision.get('emotion', '')}. Condition: {condition}. Meds: {medication}."
        
        # Convert the text summary into a numerical embedding (vector)
        # This allows future symptom queries to find similar cases
        emb = generate_text_embedding(text_summary)
        
        # Store the embedding and metadata in the FAISS vector database
        # Future consultations can search for similar cases using embeddings
        add_case(emb, {
            "condition": condition,
            "medication": medication,
            "symptoms": form_data.get('symptoms', '')
        })

# Backward compatibility function
def store_session_for_learning(form_data: dict, vision: dict, condition: str, medication: str):
    """
    Legacy function interface for storing sessions.
    Creates a learning agent and stores the session.
    Kept for backward compatibility with older code.
    """
    agent = LearningAgent()
    agent.store_session(form_data, vision, condition, medication)

