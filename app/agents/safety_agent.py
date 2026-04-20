from app.core.safety_rules import is_safe

class SafetyAgent:
    def check_safety(self, medication: str) -> bool:
        """Verify if the medication list is safe to suggest."""
        return is_safe(medication)
