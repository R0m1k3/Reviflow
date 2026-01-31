import uuid
from typing import Optional
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from app.config import settings
from app.core.db import get_async_session
from app.modules.auth.models import User, UserRole

# 1. Database Adaptor
class UserDatabase(SQLAlchemyUserDatabase):
    async def get_by_username(self, username: str) -> Optional[User]:
        from sqlalchemy import select
        statement = select(User).where(User.username == username)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

async def get_user_db(session=Depends(get_async_session)):
    yield UserDatabase(session, User)

# 2. User Manager (Business Logic)
class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered as {user.role}.")
        # If learner, ensure they have a profile
        if user.role == UserRole.LEARNER:
             # This will be handled in the custom creation endpoint mostly, 
             # but good to have a safeguard
             pass

    async def validate_password(self, password: str, user: Optional[User] = None) -> None:
        """Relax validation to allow 4-digit PINs."""
        if len(password) < 4:
            from fastapi_users.exceptions import InvalidPasswordException
            raise InvalidPasswordException("Password must be at least 4 characters long")

    async def authenticate(self, credentials):
        """Override authenticate to check both email and username."""
        if isinstance(credentials, dict):
            username = credentials.get("username")
            password = credentials.get("password")
        else:
            username = getattr(credentials, "username", None)
            password = getattr(credentials, "password", None)
            
        if not username or not password:
            return None

        # Try finding by email (Standard)
        try:
            user = await self.get_by_email(username)
            if user and self.password_helper.verify_and_update(password, user.hashed_password)[0]:
                return user
        except Exception:
            pass

        # Try finding by username (Learner)
        try:
            # We use a custom query for username as BaseUserManager doesn't have get_by_username
            user = await self.user_db.get_by_username(username)
            if user and self.password_helper.verify_and_update(password, user.hashed_password)[0]:
                return user
        except Exception:
            pass
        
        return None

    async def on_after_update(self, user: User, update_dict: dict, request: Optional[Request] = None):
        if "parental_pin" in update_dict and update_dict["parental_pin"]:
            # We don't hash it here because FastAPI Users doesn't automatically call a hook BEFORE update for custom fields easily without overriding update()
            pass

    async def update(self, user_update, user, safe=True, request=None):
        # Hash parental_pin if it's being updated
        if hasattr(user_update, "parental_pin") and user_update.parental_pin is not None:
            user_update.parental_pin = self.password_helper.hash(user_update.parental_pin)
        return await super().update(user_update, user, safe=safe, request=request)

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

# 3. Authentication Backend (Cookie/JWT)
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600*24) # 24h Session

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# 4. FastAPI Users Instance
fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)
