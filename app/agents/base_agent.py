"""
Base Agent Module
This is the parent class for all specialized medical agents in the system.
Every agent inherits from BaseAgent and uses it to communicate with the LLM (AI model).
Agents are specialized AI workers that handle specific medical tasks.
"""

from app.core.llm_engine import generate_response
import json

class BaseAgent:
    """
    Base class for all medical agents.
    Provides common functionality for making LLM calls and parsing responses.
    This class should be inherited by all specialized agents.
    """
    
    def __init__(self, persona: str):
        """
        Initialize an agent with a specific persona/role.
        
        Args:
            persona: A string describing the agent's role and expertise
                    (e.g., "Expert cardiologist", "Clinical assistant")
        """
        self.persona = persona

    async def get_response(self, prompt: str) -> str:
        """
        Send a prompt to the LLM and get back a text response.
        This function handles communication with the AI model.
        
        Args:
            prompt: The question or task to send to the LLM
            
        Returns:
            The AI-generated response as a string
        """
        return await generate_response(prompt)

    def parse_json(self, response: str) -> dict:
        """
        Extract and parse JSON data from an LLM response.
        The LLM often wraps JSON in markdown code blocks (```json ... ```),
        so this function removes those markers and extracts the actual JSON.
        
        Args:
            response: The response text from the LLM
            
        Returns:
            A Python dictionary containing the parsed JSON,
            or an empty dict {} if parsing fails
        """
        try:
            # Try to extract JSON wrapped in ```json ... ``` markers
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            # Fall back to extracting JSON from ``` ... ``` markers
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            # Parse the JSON string into a Python dictionary
            return json.loads(response)
        except Exception:
            # Return empty dict if parsing fails for any reason
            return {}

