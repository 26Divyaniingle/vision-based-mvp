import httpx
import asyncio

async def test_endpoints():
    async with httpx.AsyncClient() as client:
        print("Testing /session/list...")
        try:
            r1 = await client.get("http://localhost:8000/session/list?patient_id=1")
            print(f"Session List Status: {r1.status_code}")
            if r1.status_code != 200:
                print(f"Error: {r1.text}")
        except Exception as e:
            print(f"Session List Request failed: {e}")

        print("\nTesting /transcriber/history/1...")
        try:
            r2 = await client.get("http://localhost:8000/transcriber/history/1")
            print(f"Transcriber History Status: {r2.status_code}")
            if r2.status_code != 200:
                print(f"Error: {r2.text}")
        except Exception as e:
            print(f"Transcriber History Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_endpoints())
