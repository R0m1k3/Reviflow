"""Resolution of the OpenRouter API key, with a daily quota on the global key."""
import uuid
from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import Field, SQLModel, select

from app.config import settings
from app.modules.auth.models import User


class GlobalKeyUsage(SQLModel, table=True):
    """Daily counter of AI requests made with the global OPENROUTER_API_KEY."""
    __tablename__ = "global_key_usage"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # Family owner: the parent account (children count against their parent)
    owner_user_id: uuid.UUID = Field(index=True)
    day: date = Field(index=True)
    count: int = Field(default=0)


async def _consume_global_quota(user: User, db: AsyncSession) -> None:
    quota = settings.GLOBAL_API_KEY_DAILY_QUOTA
    if quota <= 0:
        return

    owner_id = user.parent_id or user.id
    today = date.today()
    result = await db.execute(
        select(GlobalKeyUsage).where(
            GlobalKeyUsage.owner_user_id == owner_id,
            GlobalKeyUsage.day == today,
        )
    )
    usage = result.scalar_one_or_none()
    if usage is None:
        usage = GlobalKeyUsage(owner_user_id=owner_id, day=today, count=0)

    if usage.count >= quota:
        raise HTTPException(
            status_code=429,
            detail=(
                "Quota quotidien de la clé OpenRouter partagée atteint. "
                "Réessayez demain ou ajoutez votre propre clé API dans les Paramètres."
            ),
        )

    usage.count += 1
    db.add(usage)
    await db.commit()


async def get_effective_api_key(user: User, db: AsyncSession) -> Optional[str]:
    """Retrieve the API key from user, parent, or global settings.

    Using the global key consumes one unit of the family's daily quota
    (raises HTTP 429 when exhausted).
    """
    # 1. User specific key
    if user.openrouter_api_key:
        return user.openrouter_api_key

    # 2. Parent's key (if learner)
    if user.parent_id:
        statement = select(User).where(User.id == user.parent_id)
        result = await db.execute(statement)
        parent = result.scalar_one_or_none()
        if parent and parent.openrouter_api_key:
            return parent.openrouter_api_key

    # 3. Global settings key (rate limited per family and per day)
    if settings.OPENROUTER_API_KEY:
        await _consume_global_quota(user, db)
        return settings.OPENROUTER_API_KEY

    return None
