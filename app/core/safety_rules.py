def is_safe(medication: str) -> bool:
    # Rule-based safety (MVP mock logic)
    blacklist = ["arsenic", "mercury", "cyanide"]
    med_lower = medication.lower()
    for bad in blacklist:
        if bad in med_lower:
            return False
    return True
