from app.core.llm_engine import generate_response
import json

class BaseAgent:
    def __init__(self, persona: str):
        self.persona = persona

    async def get_response(self, prompt: str) -> str:
        """Call the LLM engine with the given prompt."""
        return await generate_response(prompt)

    def parse_json(self, response: str) -> dict:
        """Extract and parse JSON from LLM response."""
        try:
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            return json.loads(response)
        except Exception:
            return {}
