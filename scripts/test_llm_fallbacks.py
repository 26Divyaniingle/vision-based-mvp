import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.llm_engine import generate_response, try_groq_response, try_ollama_response
from app.services.stt_engine import process_audio_chunk
from app.config import settings
import asyncio

def test_llms():
    print("--- Testing LLM Fallback Chain ---")
    
    print("\n1. Testing Groq API directly...")
    if settings.GROQ_API_KEY:
        res = try_groq_response("Say 'Groq is Working'")
        print(f"Result: {res}")
    else:
        print("Groq API Key missing.")

    print("\n2. Testing OpenAI API directly (if available)...")
    if settings.OPENAI_API_KEY:
        import openai
        try:
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Say 'OpenAI is Working'"}],
                max_tokens=10
            )
            print(f"Result: {response.choices[0].message.content.strip()}")
        except Exception as e:
            print(f"OpenAI Failed: {e}")
    else:
        print("OpenAI API Key missing.")

    print("\n3. Testing Ollama (if available)...")
    res = try_ollama_response("Say 'Ollama is Working'")
    if res:
        print(f"Result: {res}")
    else:
        print("Ollama not responding or not configured.")

    print("\n4. Testing Full Fallback Logic...")
    # This will try Gemini first, then fall back if it fails
    res = generate_response("Hello, this is a test of the multi-provider system.")
    print(f"Final Combined Result: {res}")

    print("\n5. Testing STT Fallback Logic...")
    # Use a small dummy wav or one from venv
    test_data_dir = os.path.join("venv", "Lib", "site-packages", "scipy", "io", "tests", "data")
    sample_wav = os.path.join(test_data_dir, "test-8000Hz-le-1ch-1byte-ulaw.wav")
    
    if os.path.exists(sample_wav):
        with open(sample_wav, "rb") as f:
            audio_bytes = f.read()
        
        try:
            # process_audio_chunk is async
            loop = asyncio.get_event_loop()
            stt_res = loop.run_until_complete(process_audio_chunk(audio_bytes))
            print(f"STT Result (Gemini or Fallback): {stt_res}")
        except Exception as e:
            print(f"STT Test Failed: {e}")
    else:
        print(f"Sample wav not found at {sample_wav}")

if __name__ == "__main__":
    test_llms()
