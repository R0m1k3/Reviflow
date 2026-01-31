"""Ingest module router for image analysis."""
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.modules.ingest.schemas import AnalyzeRequest, AnalyzeResponse, AnalyzeError
from app.modules.ingest.service import analyze_documents
from app.modules.auth.service import current_active_user
from typing import Optional
from app.modules.auth.models import User, UserRole

from app.core.db import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings

router = APIRouter()

async def get_effective_api_key(user: User, db: AsyncSession) -> Optional[str]:
    """Retrieve the API key from user, parent, or global settings."""
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
            
    # 3. Global settings key
    if settings.OPENROUTER_API_KEY:
        return settings.OPENROUTER_API_KEY
        
    return None


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        400: {"model": AnalyzeError, "description": "Invalid request"},
        401: {"model": AnalyzeError, "description": "No API key configured"},
        500: {"model": AnalyzeError, "description": "AI service error"}
    }
)
async def analyze_image_endpoint(
    request: AnalyzeRequest,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Analyze an image using AI Vision to extract lesson content.
    
    Requires a valid OpenRouter API key configured in user settings.
    """
    # Determine which API key to use
    api_key = await get_effective_api_key(user, db)
        
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="No OpenRouter API key configured. Please add your API key in Settings or contact your administrator."
        )
    
    if not request.images_base64:
        raise HTTPException(
            status_code=400,
            detail="No images provided"
        )
    
    try:
        result, math_safety_triggered = await analyze_documents(
            request.images_base64,
            api_key
        )
        
        # Update usage
        usage = result.get("usage", {})
        user.total_tokens_used += usage.get("total_tokens", 0)
        # Approximate cost (0.1$ / 1M tokens for Flash)
        user.total_cost_usd += usage.get("total_tokens", 0) * 0.0000001
        
        db.add(user)
        await db.commit()
        
        return AnalyzeResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )


@router.post("/analyze-stream")
async def analyze_image_stream(
    request: AnalyzeRequest,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Analyze an image with Server-Sent Events for progress updates.
    
    Streams progress events: uploading -> reading -> analyzing -> complete
    """
    # Determine which API key to use
    api_key = await get_effective_api_key(user, db)
        
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="No OpenRouter API key configured. Please add your API key in Settings or contact your administrator."
        )
    
    if not request.images_base64:
        raise HTTPException(
            status_code=400,
            detail="No images provided"
        )
    
    async def event_generator():
        try:
            # Step 1: Uploading
            yield f"data: {json.dumps({'step': 'uploading', 'message': 'Téléchargement...', 'progress': 10})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 2: Reading (OCR)
            msg = {'step': 'reading', 'message': "Lecture des documents...", 'progress': 30}
            yield f"data: {json.dumps(msg)}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 3: Analyzing
            yield f"data: {json.dumps({'step': 'analyzing', 'message': 'Analyse IA en cours...', 'progress': 50})}\n\n"
            
            # Actually perform the analysis
            result, math_safety_triggered = await analyze_documents(
                request.images_base64,
                api_key
            )
            
            # Update usage
            usage = result.get("usage", {})
            user.total_tokens_used += usage.get("total_tokens", 0)
            user.total_cost_usd += usage.get("total_tokens", 0) * 0.0000001
            
            db.add(user)
            await db.commit()
            
            # Step 4: Synthesizing
            yield f"data: {json.dumps({'step': 'synthesizing', 'message': 'Génération de la synthèse...', 'progress': 80})}\n\n"
            await asyncio.sleep(0.1)
            
            # Step 5: Complete
            yield f"data: {json.dumps({'step': 'complete', 'message': 'Terminé!', 'progress': 100, 'result': result})}\n\n"
            
        except Exception as e:
            import traceback
            error_msg = f"Error in analyze_image_stream: {str(e)}\n{traceback.format_exc()}"
            print(error_msg)  # Log to console
            yield f"data: {json.dumps({'step': 'error', 'message': str(e), 'progress': 0})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

