import os
import sys
import asyncio
import json

# Add current directory to path so we can import app modules
sys.path.append(os.getcwd())

from app.services.ai_assistant_service import AIAssistantService

async def test():
    # Use a small valid base64 image (1x1 transparent dot)
    dummy_img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    print(f"Testing Groq Vision API with dummy image...")
    res = await AIAssistantService.analyze_report(dummy_img, "test.png")
    print("\nResult:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    asyncio.run(test())
