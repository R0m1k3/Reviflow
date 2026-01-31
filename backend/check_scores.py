import asyncio
import os
import sys

sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.db import engine

async def check_db():
    async with engine.begin() as conn:
        print("Checking Score table...")
        result = await conn.execute(text("SELECT id, topic, score, learner_id, created_at FROM score ORDER BY created_at DESC LIMIT 5;"))
        rows = result.fetchall()
        for row in rows:
            print(f"ID: {row.id}, Topic: '{row.topic}', Score: {row.score}")

if __name__ == "__main__":
    asyncio.run(check_db())
