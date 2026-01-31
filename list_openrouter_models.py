
import httpx
import asyncio
import json

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models"

async def list_models():
    async with httpx.AsyncClient() as client:
        response = await client.get(OPENROUTER_API_URL)
        if response.status_code == 200:
            models = response.json()["data"]
            gemini_models = [m["id"] for m in models if "gemini" in m["id"] and "flash" in m["id"]]
            print("Available Gemini Flash Models:")
            for m in gemini_models:
                print(f"- {m}")
        else:
            print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    asyncio.run(list_models())
