from app.config import settings
print(f"GROQ_API_KEY status: {'Present' if settings.GROQ_API_KEY else 'MISSING'}")
if settings.GROQ_API_KEY:
    print(f"Key starts with: {settings.GROQ_API_KEY[:10]}...")
