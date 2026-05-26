import base64
import json
from typing import List, Dict, Optional
from app.core.llm_engine import ASYNC_CLIENT
from app.config import settings

class AIAssistantService:
    """
    Service for general-purpose AI chat and medical report analysis.
    Uses Groq's high-speed models for a premium feel.
    """
    
    @staticmethod
    async def chat(messages: List[Dict[str, str]]) -> str:
        """
        Handle a conversation with the AI assistant.
        messages: List of {"role": "user"|"assistant"|"system", "content": "text"}
        """
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        system_prompt = (
            "You are MedSense AI, an advanced medical assistant. "
            "You provide empathetic, professional, and scientifically-grounded advice. "
            "You can analyze medical reports, explain symptoms, and provide health tips. "
            "Always include a disclaimer that you are an AI and not a doctor. "
            "Keep responses concise, conversational, and helpful like Meta AI."
        )
        
        # Insert system prompt if not present
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": system_prompt})
            
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        
        try:
            response = await ASYNC_CLIENT.post(url, headers=headers, json=payload, timeout=20.0)
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            return f"Error: Status {response.status_code}"
        except Exception as e:
            return f"Chat error: {str(e)}"

    @staticmethod
    async def analyze_report(image_base64: str, filename: str = "report.jpg") -> Dict:
        """
        Analyze a medical report image using Groq Vision.
        """
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Construct the vision prompt
        prompt = (
            "Analyze this medical report/document. Extract key findings, "
            "abnormal values, and provide a simple summary of what this means for the patient. "
            "Format the output as a medical insight. Be clear and professional."
        )
        
        payload = {
            "model": "llama-3.2-11b-vision-preview",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 1024
        }
        
        try:
            print(f"Analyzing report: {filename} (Base64 length: {len(image_base64)})")
            response = await ASYNC_CLIENT.post(url, headers=headers, json=payload, timeout=60.0)
            if response.status_code == 200:
                result = response.json()
                analysis = result["choices"][0]["message"]["content"].strip()
                return {
                    "success": True,
                    "analysis": analysis,
                    "filename": filename
                }
            
            error_msg = response.text
            print(f"Vision API Error: {response.status_code} - {error_msg}")
            return {"success": False, "error": f"Vision API error {response.status_code}: {error_msg[:100]}"}
        except Exception as e:
            print(f"Exception during report analysis: {str(e)}")
            return {"success": False, "error": str(e)}
