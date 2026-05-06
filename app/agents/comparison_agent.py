"""
Comparison Agent Module
This agent searches for similar historical cases based on current symptoms and emotions.
It uses embeddings to find past consultations that had similar symptoms,
which helps provide context for the diagnosis of the current patient.
"""

from app.core.embedding_engine import generate_text_embedding
from app.core.faiss_store import search_similar_cases

class ComparisonAgent:
    """
    Specialized agent for finding similar historical cases.
    Uses vector similarity search to retrieve cases with matching symptoms.
    """
    
    def get_similar_cases(self, form_data: dict, vision_emotion: str):
        """
        Find past consultations similar to the current patient's presentation.
        Uses symptoms and emotional state to search the historical database.
        
        Args:
            form_data: Current patient's information including symptoms
            vision_emotion: The emotional state detected from webcam analysis
            
        Returns:
            A list of similar historical cases with metadata and similarity scores
        """
        # Create a search query combining current symptoms and emotion
        summary = f"Symptoms: {form_data.get('symptoms', '')}. Emotion: {vision_emotion}."
        
        # Convert the search query into an embedding (numerical vector)
        # This allows comparison with embeddings of past cases
        emb = generate_text_embedding(summary)
        
        # Search the vector database for the 2 most similar historical cases
        # These similar cases provide context for diagnosis
        return search_similar_cases(emb, top_k=2)

