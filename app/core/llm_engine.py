import httpx
import json
import asyncio
from app.config import settings

# Global async client for connection pooling
# This prevents socket exhaustion (WinError 10055) on Windows
ASYNC_CLIENT = httpx.AsyncClient(timeout=30.0)

async def generate_response(prompt: str) -> str:
    """
    Generates a response using ONLY Groq AI with Llama 3.3.
    This provides high performance and low latency as requested.
    """
    if not settings.groq_api_key:
        return "ERROR: Groq API key is missing. Please configure GROQ_API_KEY in your production environment variables."
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json"
    }
    
    # Using Llama 3.3 70B for the best balance of speed and quality
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a professional Medical AI Assistant. Provide accurate, empathetic, and concise responses based on clinical reasoning."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3, # Lower temperature for better diagnostic consistency
        "max_tokens": 4096
    }
    
    try:
        response = await ASYNC_CLIENT.post(url, headers=headers, json=payload, timeout=20.0)
        
        if response.status_code == 200:
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()
        
        error_detail = response.text
        print(f"Groq API Error: {response.status_code} - {error_detail}")
        return f"ERROR: Groq AI service returned an error ({response.status_code})."
        
    except httpx.TimeoutException:
        print("Groq API Timeout")
        return "ERROR: Groq AI service timed out. Please try again."
    except Exception as e:
        print(f"Groq Request failed: {e}")
        return f"ERROR: Failed to connect to Groq AI: {str(e)}"


