import google.generativeai as genai
import openai
import httpx
import json
import asyncio
from app.config import settings

# Global async client for connection pooling
# This prevents socket exhaustion (WinError 10055) on Windows
ASYNC_CLIENT = httpx.AsyncClient(timeout=30.0)

# Configure Google AI
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Configure OpenAI
if settings.OPENAI_API_KEY:
    openai.api_key = settings.OPENAI_API_KEY

# Initialize Gemini Model once at module level for speed
from app.utils.key_manager import gemini_manager

async def try_groq_response(prompt: str) -> str:
    """Fallback to Groq API using Llama 3."""
    if not settings.GROQ_API_KEY:
        return None
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    
    try:
        response = await ASYNC_CLIENT.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"].strip()
        print(f"Groq API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Groq Request failed: {e}")
    return None

async def try_ollama_response(prompt: str) -> str:
    """Fallback to local Ollama instance."""
    if not settings.OLLAMA_BASE_URL:
        return None
    
    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False
    }
    try:
        response = await ASYNC_CLIENT.post(url, json=payload)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
    except Exception as e:
        print(f"Ollama local fallback failed: {e}")
    return None

async def generate_response(prompt: str) -> str:
    """
    Generates a response with multi-provider fallback:
    Gemini (Rotated) -> Groq (Llama 3) -> OpenAI (GPT-4o) -> Ollama (Local)
    """
    # 1. Try Gemini with Rotation
    max_retries = len(settings.gemini_keys) if settings.gemini_keys else 1
    for attempt in range(max_retries):
        model = gemini_manager.get_model()
        if model:
            try:
                response = await asyncio.to_thread(model.generate_content, prompt)
                return response.text.strip()
            except Exception as e:
                print(f"Gemini LLM Attempt {attempt + 1} failed: {e}")
                if "429" in str(e) or "quota" in str(e).lower():
                    if not gemini_manager.rotate_key():
                        break
                else:
                    break

    # 2. Try Groq (Fast, Free tier usually available)
    print("Falling back to Groq...")
    groq_res = await try_groq_response(prompt)
    if groq_res:
        return groq_res

    # 3. Try OpenAI
    if settings.OPENAI_API_KEY:
        print("Falling back to OpenAI...")
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as oe:
            print(f"OpenAI Fallback Error: {oe}")

    # 4. Final Fallback: Local Ollama
    print("Final attempt: Ollama Local...")
    ollama_res = await try_ollama_response(prompt)
    if ollama_res:
        return ollama_res

    return "ERROR: All LLM providers (Gemini, Groq, OpenAI, Ollama) failed. Please check your API keys or internet connection."

