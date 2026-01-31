import asyncio
import os
import sys

sys.path.append(os.getcwd())

from sqlalchemy import text
from app.core.db import engine

async def check_learner_scores():
    learner_id = '21da4b0e-18d8-431c-bc62-b35e7677d981'
    async with engine.begin() as conn:
        print(f"Checking Score table for learner {learner_id}...")
        result = await conn.execute(text(f"SELECT id, topic, score, created_at FROM score WHERE learner_id = '{learner_id}'"))
        rows = result.fetchall()
        print(f"Found {len(rows)} scores.")
        for row in rows:
            print(f"Topic: '{row.topic}', Score: {row.score}")

if __name__ == "__main__":
    asyncio.run(check_learner_scores())
