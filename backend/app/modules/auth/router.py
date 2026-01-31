from fastapi import APIRouter, Depends, HTTPException
import httpx
from app.modules.auth.service import auth_backend, fastapi_users, current_active_user
from app.modules.auth.schemas import UserRead, UserCreate, UserUpdate
from app.modules.auth.models import User, UserRole, LearnerProfile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.core.db import get_async_session

router = APIRouter()

# /auth/jwt/login
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/jwt",
    tags=["auth"],
)

# /auth/register
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    tags=["auth"],
)

# /users/me
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# API Key Validation
@router.get("/validate-api-key", tags=["auth"])
async def validate_api_key(user: User = Depends(current_active_user)):
    """Validate the user's OpenRouter API key by making a test request."""
    if not user.openrouter_api_key:
        return {"valid": False, "error": "No API key configured"}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {user.openrouter_api_key}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {"valid": True}
            elif response.status_code == 401:
                return {"valid": False, "error": "Invalid API key"}
            else:
                return {"valid": False, "error": f"API error: {response.status_code}"}
    except httpx.TimeoutException:
        return {"valid": False, "error": "Connection timeout"}
    except Exception as e:
        return {"valid": False, "error": str(e)}

@router.post("/verify-parental-gate", tags=["auth"])
async def verify_parental_gate(
    payload: dict,
    user: User = Depends(current_active_user),
    user_manager = Depends(fastapi_users.get_user_manager)
):
    """Verify if the provided PIN or Password is correct to grant parental access."""
    pin = payload.get("pin")
    password = payload.get("password")
    
    if pin:
        if user.parental_pin:
            valid, _ = user_manager.password_helper.verify_and_update(pin, user.parental_pin)
            if valid:
                return {"success": True}
        return {"success": False, "error": "Invalid PIN"}
            
    if password:
        valid, _ = user_manager.password_helper.verify_and_update(password, user.hashed_password)
        if valid:
            return {"success": True}
        return {"success": False, "error": "Invalid Password"}
            
    raise HTTPException(status_code=400, detail="PIN or Password required")

@router.get("/children", response_model=list[UserRead], tags=["auth"])
async def list_children(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List all children accounts linked to this parent."""
    if user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can list children")
    
    # Re-fetch user with relationships to avoid lazy-loading issues
    statement = select(User).where(User.id == user.id).options(
        selectinload(User.children)
    )
    result = await db.execute(statement)
    full_user = result.scalar_one()
    
    return full_user.children

@router.get("/profiles", response_model=list[dict], tags=["auth"])
async def list_profiles(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    If parent: list all children's profiles.
    If learner: return own profile.
    """
    # Re-fetch user with relationships to avoid lazy-loading issues
    statement = select(User).where(User.id == user.id).options(
        selectinload(User.learner_profile),
        selectinload(User.children).selectinload(User.learner_profile)
    )
    result = await db.execute(statement)
    full_user = result.scalar_one()

    if full_user.role == UserRole.LEARNER:
        if not full_user.learner_profile:
            return []
        return [{
            "id": str(full_user.learner_profile.id),
            "first_name": full_user.learner_profile.first_name,
            "avatar_url": full_user.learner_profile.avatar_url
        }]
    
    # Parent view: collect profiles from all children
    profiles = []
    for child in full_user.children:
        if child.learner_profile:
            profiles.append({
                "id": str(child.learner_profile.id),
                "first_name": child.learner_profile.first_name,
                "avatar_url": child.learner_profile.avatar_url,
                "username": child.username,
                "xp": child.learner_profile.xp,
                "level": child.learner_profile.level,
                "streak_current": child.learner_profile.streak_current,
                "streak_max": child.learner_profile.streak_max,
            })
    return profiles

@router.patch("/profiles/me", tags=["auth"])
async def update_my_profile(
    profile_data: dict,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Allow a learner to update their own profile (e.g. avatar)."""
    if user.role != UserRole.LEARNER:
        raise HTTPException(status_code=403, detail="Only learners can update their learner profile directly")
    
    # Fetch profile with selectinload to ensure it's available
    statement = select(User).where(User.id == user.id).options(selectinload(User.learner_profile))
    result = await db.execute(statement)
    full_user = result.scalar_one()
    
    if not full_user.learner_profile:
        raise HTTPException(status_code=404, detail="Learner profile not found")
        
    profile = full_user.learner_profile
    if "first_name" in profile_data:
        profile.first_name = profile_data["first_name"]
    if "avatar_url" in profile_data:
        profile.avatar_url = profile_data["avatar_url"]
        
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    
    return {
        "id": str(profile.id),
        "first_name": profile.first_name,
        "avatar_url": profile.avatar_url
    }

@router.post("/select-profile/{learner_id}", tags=["auth"])
async def select_profile(
    learner_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Validate that the learner profile belongs to the user."""
    statement = select(User).where(User.id == user.id).options(
        selectinload(User.learner_profile),
        selectinload(User.children).selectinload(User.learner_profile)
    )
    result = await db.execute(statement)
    full_user = result.scalar_one()

    profile = None
    if full_user.role == UserRole.LEARNER:
        if full_user.learner_profile and str(full_user.learner_profile.id) == learner_id:
            profile = full_user.learner_profile
    else:
        # Parent view: check if any child has this profile
        for child in full_user.children:
            if child.learner_profile and str(child.learner_profile.id) == learner_id:
                profile = child.learner_profile
                break
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found or access denied")
    
    return {"success": True, "profile": {
        "id": str(profile.id),
        "first_name": profile.first_name,
        "avatar_url": profile.avatar_url
    }}

@router.post("/profiles", tags=["auth"])
async def create_child_account(
    profile_data: dict,
    user: User = Depends(current_active_user),
    user_manager = Depends(fastapi_users.get_user_manager),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new learner user and their associated profile."""
    print(f"DEBUG: create_child_account hit by user {user.email}")
    print(f"DEBUG: profile_data: {profile_data}")
    if user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can create child accounts")
    
    
    username = profile_data.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required for child account")
    
    # Create the user entity for the child
    try:
        child_user = await user_manager.create(
            UserCreate(
                email=f"{username}@reviflow.app",
                password=profile_data.get("password", "1234"), # Default PIN if not provided
                username=username,
                first_name=profile_data.get("first_name"),
                role=UserRole.LEARNER,
                parent_id=user.id
            )
        )
        
        # Create the learner profile
        new_profile = LearnerProfile(
            user_id=child_user.id,
            first_name=profile_data.get("first_name", username),
            avatar_url=profile_data.get("avatar_url")
        )
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
        
        return {"success": True, "user": {
            "id": str(child_user.id),
            "username": child_user.username,
            "profile_id": str(new_profile.id)
        }}
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        detail = str(e)
        if hasattr(e, "reason"): detail = e.reason
        print(f"DEBUG: Child creation failed: {detail}")
        raise HTTPException(status_code=400, detail=f"Échec de la création du compte enfant : {detail}")
