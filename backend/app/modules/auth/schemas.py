import uuid
from typing import Optional, List
from datetime import datetime
from fastapi_users import schemas
from pydantic import BaseModel, Field
from .models import UserRole

# Learner Profile Schemas
class LearnerProfileBase(BaseModel):
    first_name: str = Field(..., min_length=1)
    avatar_url: Optional[str] = None

class LearnerProfileCreate(LearnerProfileBase):
    pass

class LearnerProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    avatar_url: Optional[str] = None


class BadgeRead(BaseModel):
    id: uuid.UUID
    badge_code: str
    earned_at: datetime
    
    class Config:
        from_attributes = True

class LearnerProfileRead(LearnerProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    streak_current: int = 0
    streak_max: int = 0
    xp: int = 0
    level: int = 1
    badges: List[BadgeRead] = []
    
    class Config:
        from_attributes = True

# User Schemas
class UserRead(schemas.BaseUser[uuid.UUID]):
    first_name: Optional[str] = None
    username: Optional[str] = None
    role: UserRole
    openrouter_api_key: Optional[str] = None
    total_tokens_used: int = 0
    total_cost_usd: float = 0.0
    learner_profile: Optional[LearnerProfileRead] = None
    parent_id: Optional[uuid.UUID] = None
    parental_pin: Optional[str] = None
    
    @property
    def has_parental_pin(self) -> bool:
        return self.parental_pin is not None

class UserCreate(schemas.BaseUserCreate):
    first_name: Optional[str] = None
    username: Optional[str] = None
    role: UserRole = UserRole.PARENT
    parent_id: Optional[uuid.UUID] = None

class UserUpdate(schemas.BaseUserUpdate):
    first_name: Optional[str] = None
    username: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    role: Optional[UserRole] = None
    parent_id: Optional[uuid.UUID] = None
    parental_pin: Optional[str] = None
