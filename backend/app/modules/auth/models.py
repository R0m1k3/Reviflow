from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import ConfigDict

class UserRole(str, Enum):
    PARENT = "parent"
    LEARNER = "learner"

class LearnerProfile(SQLModel, table=True):
    __tablename__ = "learner_profiles"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, unique=True) # Linked to the SPECIFIC learner user account
    first_name: str
    avatar_url: Optional[str] = Field(default=None)
    
    # Gamification
    streak_current: int = Field(default=0)
    streak_max: int = Field(default=0)
    last_activity_date: Optional[datetime] = Field(default=None)
    xp: int = Field(default=0)
    level: int = Field(default=1)
    
    # Relationship back to the specific user account
    user: "User" = Relationship(back_populates="learner_profile")
    
    # Badges
    # Badges
    badges: List["LearnerBadge"] = Relationship(
        back_populates="learner",
        sa_relationship_kwargs={"lazy": "selectin"}
    )

class LearnerBadge(SQLModel, table=True):
    __tablename__ = "learner_badges"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    learner_id: uuid.UUID = Field(foreign_key="learner_profiles.id", index=True)
    badge_code: str = Field(index=True) # e.g. "FIRST_STEPS", "MATH_CHAMP"
    earned_at: datetime = Field(default_factory=datetime.utcnow)
    
    learner: LearnerProfile = Relationship(back_populates="badges")

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: Optional[str] = Field(default=None, unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    is_superuser: bool = Field(default=False)
    is_verified: bool = Field(default=False)

    # Additional fields
    first_name: Optional[str] = Field(default=None)
    role: UserRole = Field(default=UserRole.PARENT)
    openrouter_api_key: Optional[str] = Field(default=None)
    total_tokens_used: int = Field(default=0)
    total_cost_usd: float = Field(default=0.0)
    parental_pin: Optional[str] = Field(default=None)
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    
    # Relationships
    learner_profile: Optional[LearnerProfile] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "uselist": False,
            "lazy": "selectin"
        }
    )
    
    children: List["User"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={
             "cascade": "all, delete-orphan",
             "lazy": "selectin",
             "single_parent": True
        }
    )
    
    parent: Optional["User"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={
            "remote_side": "User.id",
            "lazy": "selectin"
        }
    )
    
    model_config = ConfigDict(arbitrary_types_allowed=True)
