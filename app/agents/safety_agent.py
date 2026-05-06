"""
Safety Agent Module
This agent checks if recommended medications are safe for the patient.
It uses medical safety rules to detect dangerous drug interactions,
allergies, and contraindications before we suggest them to the patient.
"""

from app.core.safety_rules import is_safe

class SafetyAgent:
    """
    Specialized agent for medication safety validation.
    Ensures that recommended medicines don't cause harm or dangerous interactions.
    """
    
    def check_safety(self, medication: str) -> bool:
        """
        Verify if the recommended medications are safe to suggest to the patient.
        Checks for contraindications, drug interactions, and known safety issues.
        
        Args:
            medication: Comma-separated list of medication names to check
            
        Returns:
            True if the medications are safe, False if there are concerns
        """
        # Delegate to the safety rules module which contains the actual checks
        return is_safe(medication)

