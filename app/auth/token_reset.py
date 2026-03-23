import bcrypt

def hash_token(plain_token: str) -> str:
    """Hash token with bcrypt."""
    return bcrypt.hashpw(plain_token.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_token(plain_token: str, hashed_token: str) -> bool:
    """Verify plain token against hash."""
    return bcrypt.checkpw(plain_token.encode('utf-8'), hashed_token.encode('utf-8'))

