import google.generativeai as genai
from app.config import settings

# Configure Google AI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_response(prompt: str) -> str:
    """
    Generates a response using Google Gemini 1.5 Flash.
    This replaces the OpenAI implementation to avoid quota issues.
    """
    if not settings.GEMINI_API_KEY:
         return "MOCK_RESPONSE: No Gemini API key. Assuming normal condition."
         
    try:
        model = genai.GenerativeModel("models/gemini-flash-latest")
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print("Gemini LLM Error:", e)
        return f"ERROR: {e}"
