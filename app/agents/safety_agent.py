from app.core.safety_rules import is_safe

def run_safety_check(medication: str):
    return 1 if is_safe(medication) else 0
