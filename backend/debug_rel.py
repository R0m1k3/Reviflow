import asyncio
import sys
import os

# Add parent directory to sys.path to allow imports
sys.path.append(os.getcwd())

from app.core.db import async_session_maker
from app.modules.auth.models import User, LearnerProfile, UserRole
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check():
    try:
        async with async_session_maker() as session:
            # Re-fetch parent like the router does
            # Role user: 04015eb2-a78b-46ee-9337-f1bd94b8b951
            stmt = select(User).where(User.email == "michaelschal@gmail.com").options(
                selectinload(User.children).selectinload(User.learner_profile)
            )
            res = await session.execute(stmt)
            parent = res.scalar_one_or_none()
            
            if not parent:
                print("Parent not found!")
                return
            
            print(f"Parent: {parent.username} | Children count: {len(parent.children)}")
            for child in parent.children:
                print(f" - Child: {child.username} | Profile: {child.learner_profile.first_name if child.learner_profile else 'NONE'}")
                
            # Direct check for children in DB
            from sqlalchemy import func
            children_res = await session.execute(select(User).where(User.parent_id == parent.id))
            db_children = children_res.scalars().all()
            print(f"Direct DB check - Children with parent_id={parent.id} in DB: {len(db_children)}")
            for c in db_children:
                print(f" - DB Child: {c.username} (ID: {c.id})")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check())
