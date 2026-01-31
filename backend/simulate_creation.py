import asyncio
import sys
import os
import uuid

# Add parent directory to sys.path to allow imports
sys.path.append(os.getcwd())

from app.core.db import async_session_maker
from app.modules.auth.models import User, LearnerProfile, UserRole
from app.modules.auth.service import UserManager, UserDatabase
from app.modules.auth.schemas import UserCreate
from fastapi_users.password import PasswordHelper

async def simulate_creation():
    async with async_session_maker() as session:
        user_db = UserDatabase(session, User)
        user_manager = UserManager(user_db)
        
        # Find the parent user
        from sqlalchemy import select
        res = await session.execute(select(User).where(User.email == "michaelschal@gmail.com"))
        parent = res.scalar_one_or_none()
        
        if not parent:
            print("Parent user not found!")
            return

        print(f"Found parent: {parent.email} (ID: {parent.id})")
        
        # Simulation data like in the frontend
        first_name = "Léo"
        username = first_name.lower().replace(" ", "")
        email = f"{username}@reviflow.app"
        
        print(f"Attempting to create child: {username} with email {email}")
        
        try:
            # Create user
            child_user = await user_manager.create(
                UserCreate(
                    email=email,
                    password="1234",
                    username=username,
                    first_name=first_name,
                    role=UserRole.LEARNER,
                    parent_id=parent.id
                )
            )
            print(f"Child user created: {child_user.id}")
            
            # Create profile
            new_profile = LearnerProfile(
                user_id=child_user.id,
                first_name=first_name,
                avatar_url="http://example.com/avatar.png"
            )
            session.add(new_profile)
            await session.commit()
            print("Profile created and committed successfully!")
            
        except Exception as e:
            print(f"FAILURE: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(simulate_creation())
