import openai
from app.config import settings

def generate_response(prompt: str) -> str:
    if not settings.OPENAI_API_KEY:
         return "MOCK_RESPONSE: No API key. Assuming normal condition and standard remedy."
    try:
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800
        )
        return response.choices[0].message.content
    except Exception as e:
        print("LLM Error:", e)
        return f"ERROR: {e}"
