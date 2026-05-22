import httpx
import asyncio

async def test_history():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/transcriber/history/1")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_history())
