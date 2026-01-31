import asyncio
import sys
import os

# Add parent directory to sys.path to allow imports
sys.path.append(os.getcwd())

from app.core.db import async_session_maker
from app.modules.auth.models import User, LearnerProfile, UserRole
from sqlalchemy import select

async def check():
    try:
        async with async_session_maker() as session:
            users_result = await session.execute(select(User))
            users = users_result.scalars().all()
            print('\n--- Users ---')
            for u in users:
                print(f"ID: {u.id} | Username: {u.username} | Email: {u.email} | Role: {u.role} | ParentID: {u.parent_id}")
            
            profiles_result = await session.execute(select(LearnerProfile))
            profiles = profiles_result.scalars().all()
            print('\n--- Profiles ---')
            for p in profiles:
                print(f"ID: {p.id} | UserID: {p.user_id} | Name: {p.first_name}")
                
            print('\n--- Relationship Check ---')
            for u in users:
                if u.role == UserRole.LEARNER:
                    # Explicitly check for profile
                    profile_res = await session.execute(select(LearnerProfile).where(LearnerProfile.user_id == u.id))
                    profile = profile_res.scalar_one_or_none()
                    if profile:
                        print(f"Child {u.username} has profile {profile.first_name}")
                    else:
                        print(f"Child {u.username} MISSING PROFILE!")
                        
    except Exception as e:
        print(f"Error during check: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check())
