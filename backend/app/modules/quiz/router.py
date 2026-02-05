from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid
import json as import_json
from datetime import datetime
from app.core.db import get_async_session
from app.modules.auth.service import current_active_user
from app.modules.auth.models import User
from app.modules.quiz.schemas import QuizRequest, QuizResponse, ScoreCreate, ScoreResponse
from pydantic import BaseModel, Field as PydanticField
from typing import Any
from app.modules.quiz.models import Score
from app.modules.quiz.service import generate_quiz
from sqlmodel import select, delete

from app.config import settings

router = APIRouter()

async def get_effective_api_key(user: User, db: AsyncSession) -> Optional[str]:
    """Retrieve the API key from user, parent, or global settings."""
    # 1. User specific key
    if user.openrouter_api_key:
        return user.openrouter_api_key
    
    # 2. Parent's key (if learner)
    if user.parent_id:
        # Use simple select for Parent
        statement = select(User).where(User.id == user.parent_id)
        result = await db.execute(statement)
        parent = result.scalar_one_or_none()
        if parent and parent.openrouter_api_key:
            return parent.openrouter_api_key
            
    # 3. Global settings key
    if settings.OPENROUTER_API_KEY:
        return settings.OPENROUTER_API_KEY
        
    return None

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz_endpoint(
    request: QuizRequest,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Generates a quiz from the provided text content."""
    # Determine which API key to use
    api_key = await get_effective_api_key(user, db)

    if not api_key:
        raise HTTPException(
            status_code=401, 
            detail="No OpenRouter API key configured. Please add your API key in Settings or contact your administrator."
        )

    try:
        data = await generate_quiz(request.text_content, api_key, request.difficulty)
        
        # Save Revision
        from app.modules.quiz.models import Revision
        revision = Revision(
            learner_id=request.learner_id, # Optional
            topic=request.title if request.title else data["quiz"]["topic"],
            subject=request.subject,
            text_content=request.text_content,
            synthesis=request.synthesis,
            study_tips=import_json.dumps(request.study_tips) if request.study_tips else None,
            quiz_data=import_json.dumps(data["quiz"]), # Save as JSON string
            created_at=datetime.utcnow(),
            total_series=data.get("meta", {}).get("total_series", 1)
        )
        db.add(revision)
        
        # Update usage
        usage = data.get("usage", {})
        user.total_tokens_used += usage.get("total_tokens", 0)
        user.total_cost_usd += usage.get("total_tokens", 0) * 0.0000001
        
        db.add(user)
        await db.commit()
        await db.refresh(revision)
        
        response_quiz = data["quiz"]
        response_quiz["revision_id"] = revision.id # Add revision_id to response
        response_quiz["series_info"] = {
            "current": 1,
            "total": revision.total_series
        }
        
        return response_quiz
    except Exception as e:
        import traceback
        print(f"Error in generate_quiz_endpoint: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/score", response_model=ScoreResponse)
async def save_score(
    score_data: ScoreCreate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Saves a quiz score."""
    from app.modules.quiz.models import RemediationQueue

    score = Score(
        user_id=user.id,
        topic=score_data.topic,
        score=score_data.score,
        total_questions=score_data.total_questions,
        learner_id=score_data.learner_id,
        revision_id=score_data.revision_id # Link to revision
    )
    db.add(score)
    
    # --- Streak Logic ---
    if score_data.learner_id:
        from app.modules.auth.models import LearnerProfile
        from datetime import datetime, timedelta
        
        learner = await db.get(LearnerProfile, score_data.learner_id)
        if learner:
            today = datetime.utcnow().date()
            last_activity = learner.last_activity_date.date() if learner.last_activity_date else None
            
            if last_activity == today:
                pass # Already active today
            elif last_activity == today - timedelta(days=1):
                learner.streak_current += 1
            else:
                learner.streak_current = 1 # Reset or first time
            
            if learner.streak_current > learner.streak_max:
                learner.streak_max = learner.streak_current
                
            # XP and Level Logic
            # 1 XP per point scored? Or fixed amount per quiz?
            # Let's say XP = Score achieved.
            xp_gained = score_data.score
            learner.xp += xp_gained
            
            # Level Formula: Level = 1 + floor(sqrt(XP / 50))
            # Level 1: 0-49 XP
            # Level 2: 50-199 XP
            # Level 3: 200-449 XP
            # ...
            import math
            new_level = 1 + math.floor(math.sqrt(learner.xp / 50))
            if new_level > learner.level:
                # Level Up! We could notify frontend here too via new_badges or similar
                learner.level = int(new_level)
            
            learner.last_activity_date = datetime.utcnow()
            db.add(learner)
            
            # --- Badge Logic ---
            # Define badge constants
            BADGE_FIRST_STEPS = "FIRST_STEPS" # First quiz completed
            BADGE_NIGHT_OWL = "NIGHT_OWL"     # Quiz after 8 PM (20:00)
            BADGE_MATH_CHAMP = "MATH_CHAMP"   # Score > 80% in Math
            BADGE_ON_FIRE = "ON_FIRE"         # Streak >= 3
            
            # Get existing badges
            from app.modules.auth.models import LearnerBadge
            result = await db.execute(select(LearnerBadge.badge_code).where(LearnerBadge.learner_id == learner.id))
            existing_badges = result.scalars().all()
            
            new_badges_list = []
            
            async def award_badge(code: str):
                if code not in existing_badges:
                    badge = LearnerBadge(learner_id=learner.id, badge_code=code)
                    db.add(badge)
                    new_badges_list.append(code)
            
            # Check conditions
            await award_badge(BADGE_FIRST_STEPS)
            
            if datetime.utcnow().hour >= 20: # Simple logic for Night Owl (UTC based for now, ideally TZ aware)
                await award_badge(BADGE_NIGHT_OWL)
                
            if "math" in score_data.topic.lower() and (score_data.score / score_data.total_questions) >= 0.8:
                await award_badge(BADGE_MATH_CHAMP)
                
            if learner.streak_current >= 3:
                await award_badge(BADGE_ON_FIRE)
            # -------------------
            
            # --- Remediation Logic ---
            # 1. If this IS a remediation quiz (detected by topic), close old pending errors
            # Robust check: case insensitive, check for 'remedia' or 'correct'
            topic_lower = score_data.topic.lower()
            if "remedia" in topic_lower or "correct" in topic_lower:
                # Mark pending items for this revision/topic as REVIEWED
                # We assume that taking the quiz counts as reviewing them.
                # If they fail again, the code below (step 2) will add new items.
                update_stmt = select(RemediationQueue).where(
                    RemediationQueue.learner_id == learner.id,
                    RemediationQueue.status == "PENDING"
                )
                if score_data.revision_id:
                     update_stmt = update_stmt.where(RemediationQueue.revision_id == score_data.revision_id)
                
                # Fetch and update
                pending_results = await db.execute(update_stmt)
                pending_items = pending_results.scalars().all()
                for item in pending_items:
                    item.status = "REVIEWED"
                    db.add(item)

            # 2. Add NEW errors to queue
            if score_data.details:
                for detail in score_data.details:
                    if not detail.is_correct:
                        # Add to remediation queue
                        remediation_item = RemediationQueue(
                            learner_id=learner.id,
                            original_content=detail.original_content or score_data.topic, # Use topic if context missing
                            question=detail.question,
                            wrong_answer=detail.user_answer,
                            correct_answer=detail.correct_answer,
                            topic=score_data.topic,
                            revision_id=score_data.revision_id # Link error to specific revision
                        )
                        db.add(remediation_item)
            # -------------------------
            
    await db.commit()
    await db.refresh(score)

    # --- Series Status Update ---
    if score_data.revision_id:
        from app.modules.quiz.models import Revision
        revision = await db.get(Revision, score_data.revision_id)
        if revision:
            # Mark current series as completed
            if revision.current_series > revision.completed_series:
                 revision.completed_series = revision.current_series
            
            # Check if this was the last series
            if revision.completed_series >= revision.total_series:
                revision.status = "COMPLETED"
            
            db.add(revision)
            await db.commit()

            # Fix: Clear progress state as the series is finished
            # This prevents the specific bug where "Resuming" loads the old progress instead of showing the ResultCard
            if revision.progress_state:
                revision.progress_state = None
                db.add(revision)
                await db.commit()
    # ----------------------------
    # ----------------------------
    
    # Prepare response
    response = ScoreResponse(
        id=score.id,
        topic=score.topic,
        score=score.score,
        total_questions=score.total_questions,
        created_at=score.created_at,
        learner_id=score.learner_id,
        new_badges=new_badges_list if score_data.learner_id else [],
        revision_id=score.revision_id
    )
    
    return response

class ProgressUpdate(BaseModel):
    revision_id: uuid.UUID
    current_index: int
    answers: List[Any]
    score: int

@router.post("/progress/save")
async def save_progress(
    data: ProgressUpdate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Saves the current progress of a revision quiz."""
    from app.modules.quiz.models import Revision
    revision = await db.get(Revision, data.revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
        
    # Save state as JSON
    state = {
        "current_index": data.current_index,
        "answers": data.answers,
        "score": data.score,
        "timestamp": str(datetime.utcnow())
    }
    
    revision.progress_state = import_json.dumps(state)
    revision.status = "IN_PROGRESS"
    
    db.add(revision)
    await db.commit()
    
    return {"status": "success"}

@router.post("/next-series")
async def start_next_series(
    revision_id: uuid.UUID = Body(..., embed=True),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Generates and loads the NEXT series of questions for a revision."""
    api_key = await get_effective_api_key(user, db)
    if not api_key:
         raise HTTPException(status_code=401, detail="No API Key")

    from app.modules.quiz.models import Revision
    revision = await db.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
        
    if revision.current_series >= revision.total_series:
        raise HTTPException(status_code=400, detail="Already at the last series.")
        
    # Increment Series
    next_series = revision.current_series + 1
    
    try:
        # Generate new quiz for the next series
        data = await generate_quiz(
            revision.text_content, 
            api_key, 
            series_index=next_series
        )
        
        # Update Revision
        revision.current_series = next_series
        revision.quiz_data = import_json.dumps(data["quiz"])
        revision.progress_state = None # Clear previous progress
        revision.status = "IN_PROGRESS"
        
        db.add(revision)
        await db.commit()
        await db.refresh(revision)
        
        # Return new quiz
        response_quiz = data["quiz"]
        response_quiz["revision_id"] = revision.id
        # Add meta for frontend to know series state
        response_quiz["series_info"] = {
            "current": next_series,
            "total": revision.total_series
        }
        
        return response_quiz
        
    except Exception as e:
        import traceback
        print(f"Error in next_series: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate next series.")

@router.get("/review/{revision_id}")
async def get_revision(
    revision_id: uuid.UUID,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Retrieves a full revision (content + quiz) by ID."""
    from app.modules.quiz.models import Revision
    revision = await db.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
        
    return revision

@router.get("/revisions")
async def list_revisions(
    learner_id: Optional[uuid.UUID] = None,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Lists all revisions for a learner, with pending error counts."""
    from app.modules.quiz.models import Revision, RemediationQueue
    from sqlalchemy import func
    
    # 1. Base query for revisions
    stmt = select(Revision).where(Revision.learner_id == learner_id).order_by(Revision.created_at.desc())
    result = await db.execute(stmt)
    revisions = result.scalars().all()
    
    # 2. Add pending error counts
    # Fetch all pending error counts in one go for efficiency
    remed_stmt = select(
        RemediationQueue.revision_id,
        func.count(RemediationQueue.id)
    ).where(
        RemediationQueue.learner_id == learner_id,
        RemediationQueue.status == "PENDING",
        RemediationQueue.revision_id.isnot(None)
    ).group_by(RemediationQueue.revision_id)
    
    remed_result = await db.execute(remed_stmt)
    remed_map = {row[0]: row[1] for row in remed_result.all()}
    
    final_list = []
    for rev in revisions:
        rev_dict = rev.model_dump() # SQLModel uses model_dump() in newer versions or dict()
        # For safety across versions
        if hasattr(rev, "model_dump"):
            rev_dict = rev.model_dump()
        else:
            rev_dict = rev.dict()
            
        rev_dict['pending_errors'] = remed_map.get(rev.id, 0)
        # Ensure dates are serialized if needed, but FastAPI handles this
        final_list.append(rev_dict)
        
    return final_list

@router.get("/history", response_model=List[ScoreResponse])
async def get_history(
    learner_id: Optional[uuid.UUID] = None,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Retrieves user score history."""
    # Filter by user_id AND learner_id (if provided or None for main profile)
    statement = select(Score).where(
        Score.user_id == user.id,
        Score.learner_id == learner_id
    ).order_by(Score.created_at.desc())
    
    result = await db.execute(statement)
    return result.scalars().all()

@router.get("/remediation/count")
async def get_remediation_count(
    learner_id: uuid.UUID,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Returns number of pending remediation items."""
    from app.modules.quiz.models import RemediationQueue
    # Verify learner belongs to user (or is user) - simple check
    # In full app we'd check if learner_id in user.learner_profiles
    
    statement = select(RemediationQueue).where(
        RemediationQueue.learner_id == learner_id,
        RemediationQueue.status == "PENDING"
    )
    result = await db.execute(statement)
    items = result.scalars().all()
    return {"count": len(items)}

@router.post("/remediation/generate", response_model=QuizResponse)
async def generate_remediation_quiz(
    learner_id: uuid.UUID = Body(..., embed=True),
    revision_id: Optional[uuid.UUID] = Body(None, embed=True),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Generates a quiz based on pending errors."""
    # Determine which API key to use
    api_key = await get_effective_api_key(user, db)

    if not api_key:
        raise HTTPException(
            status_code=401, 
            detail="No OpenRouter API key configured. Please add your API key in Settings or contact your administrator."
        )

    from app.modules.quiz.models import RemediationQueue
    
    # 1. Fetch pending items
    conditions = [
        RemediationQueue.learner_id == learner_id,
        RemediationQueue.status == "PENDING"
    ]
    if revision_id:
        conditions.append(RemediationQueue.revision_id == revision_id)

    # Fetch a pool of recent errors (e.g. 20) then randomize selection
    statement = select(RemediationQueue).where(*conditions).order_by(RemediationQueue.created_at.desc()).limit(20)
    
    result = await db.execute(statement)
    items = result.scalars().all()
    
    # Convert to list to shuffle
    items = list(items)
    import random
    random.shuffle(items)
    
    # Review ALL fetched items (up to limit), not just 5.
    # items = items[:5] 
    
    if len(items) < 1:
        raise HTTPException(status_code=400, detail="Not enough errors to generate a quiz.")
        
    # 2. Build context
    remediation_context = [
        {
            "question": item.question,
            "wrong_answer": item.wrong_answer,
            "correct_answer": item.correct_answer,
            "context": item.original_content
        } for item in items
    ]
    
    # 3. Fetch source text if Revision ID is explicitly provided
    source_text = None
    if revision_id:
        from app.modules.quiz.models import Revision
        rev = await db.get(Revision, revision_id)
        if rev:
            source_text = rev.text_content

    # 4. Generate Quiz
    try:
        # We need to expose a generic generate function or specific one
        from app.modules.quiz.service import generate_remediation_quiz_service
        data = await generate_remediation_quiz_service(remediation_context, api_key, source_text=source_text)
        
        # Update usage
        usage = data.get("usage", {})
        user.total_tokens_used += usage.get("total_tokens", 0)
        user.total_cost_usd += usage.get("total_tokens", 0) * 0.0000001
        
        db.add(user)
        await db.commit()
        
        quiz_content = data["quiz"]
        
        # Force topic to indicate remediation/revision for reliable detection downstream
        topic_lower = quiz_content.get("topic", "").lower()
        if "remedia" not in topic_lower and "correct" not in topic_lower:
            original_topic = quiz_content.get("topic", "Révision")
            quiz_content["topic"] = f"{original_topic} (Correction)"

        # Inject revision_id if present so it persists through the quiz lifecycle
        if revision_id:
            quiz_content["revision_id"] = str(revision_id)
            
        return quiz_content
    except Exception as e:
        import traceback
        print(f"Error in generate_remediation_quiz: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/mastery")
async def get_mastery_stats(
    learner_id: uuid.UUID,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Calculates mastery level per topic."""
    try:
        from app.modules.quiz.models import RemediationQueue
        
        # 1. Get all scores
        scores_stmt = select(Score).where(Score.learner_id == learner_id)
        result = await db.execute(scores_stmt)
        scores = result.scalars().all()
        
        if not scores:
            return []

        # 2. Group by Normalized Topic
        # We want to merge "Maths" and "Maths (Remediation)" into "Maths"
        # And we want to prioritize RECENT scores.
        
        topic_map = {}
        
        for s in scores:
            if not s.topic: continue
            # Normalize topic
            clean_topic = s.topic.replace(" (Remediation)", "").replace(" (Correction)", "").replace(" (Remédiation)", "").replace(" (Révision)", "").strip()
            
            if clean_topic not in topic_map:
                topic_map[clean_topic] = []
            
            topic_map[clean_topic].append(s)
            
        # 3. Calculate Mastery per Topic using Weighted Average of last 5 attempts
        mastery_list = []
        
        # Pre-fetch errors to avoid N+1 queries
        errors_stmt = select(RemediationQueue).where(
            RemediationQueue.learner_id == learner_id, 
            RemediationQueue.status == "PENDING"
        )
        result = await db.execute(errors_stmt)
        errors = result.scalars().all()
        
        error_counts = {}
        for e in errors:
            if not e.topic: continue
            # Also clean topic for errors if needed, or rely on exact match? 
            # Ideally errors should also be grouped by clean topic.
            t_key = e.topic.replace(" (Remediation)", "").replace(" (Correction)", "").replace(" (Remédiation)", "").replace(" (Révision)", "").strip()
            error_counts[t_key] = error_counts.get(t_key, 0) + 1

        for topic, topic_scores in topic_map.items():
            if not topic_scores: continue
            
            # Sort by date asc (oldest first)
            topic_scores.sort(key=lambda x: x.created_at)
            
            # Take last 5 scores
            recent_scores = topic_scores[-5:]
            
            # Calculate Weighted Average
            # Example: [50, 60, 70] -> (50*1 + 60*2 + 70*3) / (1+2+3)
            total_weight = 0
            weighted_sum = 0
            
            for i, s in enumerate(recent_scores):
                weight = i + 1
                # Percentage for this quiz
                pct = (s.score / s.total_questions) * 100 if s.total_questions > 0 else 0
                weighted_sum += pct * weight
                total_weight += weight
                
            base_mastery = weighted_sum / total_weight if total_weight > 0 else 0
            
            # Apply penalty for pending errors
            pending_errors = error_counts.get(topic, 0)
            penalty = pending_errors * 3 # Reduced penalty from 5 to 3
            
            final_mastery = max(0, min(100, base_mastery - penalty))
            
            status = "LEARNING"
            if final_mastery >= 80:
                status = "MASTERED"
            elif final_mastery >= 50:
                status = "REVIEWING"
                
            # Safely get last activity
            last_activity = topic_scores[-1].created_at if topic_scores else datetime.utcnow()
            
            # Find the latest revision for this topic to get synthesis and tips
            latest_revision = None
            try:
                from app.modules.quiz.models import Revision
                rev_stmt = select(Revision).where(
                    Revision.learner_id == learner_id,
                    Revision.topic == topic
                ).order_by(Revision.created_at.desc()).limit(1)
                rev_result = await db.execute(rev_stmt)
                latest_revision = rev_result.scalar_one_or_none()
            except Exception:
                pass # Ignore revision fetch errors

            mastery_list.append({
                "topic": topic,
                "mastery_score": int(final_mastery),
                "quizzes_count": len(topic_scores),
                "pending_errors": pending_errors,
                "status": status,
                "last_activity": last_activity,
                "synthesis": latest_revision.synthesis if latest_revision else None,
                "study_tips": latest_revision.study_tips if latest_revision else None
            })
            
        # Sort by last activity
        mastery_list.sort(key=lambda x: x['last_activity'], reverse=True)
        
        return mastery_list
    except Exception as e:
        import traceback
        print(f"ERROR get_mastery_stats: {str(e)}\n{traceback.format_exc()}")
        # Return empty list instead of 500 to keep dashboard alive
        return []

@router.get("/stats/activity")
async def get_activity_stats(
    learner_id: Optional[uuid.UUID] = None,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Returns aggregated activity stats:
    - Summary: Total minutes today, this week.
    - History: Daily breakdown of activities (Revisions + Quizzes).
    """
    from app.modules.quiz.models import Revision
    from datetime import timedelta
    
    # helper to format date
    def to_date_str(dt):
        return dt.strftime("%Y-%m-%d")

    # Fetch Revisions
    revisions_stmt = select(Revision).where(Revision.learner_id == learner_id).order_by(Revision.created_at.desc())
    revisions = (await db.execute(revisions_stmt)).scalars().all()
    
    # Fetch Scores (Quizzes)
    scores_stmt = select(Score).where(Score.learner_id == learner_id).order_by(Score.created_at.desc())
    scores = (await db.execute(scores_stmt)).scalars().all()
    
    # Fetch Pending Remediation Counts per Revision
    from app.modules.quiz.models import RemediationQueue
    from sqlalchemy import func
    
    remediation_stmt = select(
        RemediationQueue.revision_id,
        func.count(RemediationQueue.id)
    ).where(
        RemediationQueue.learner_id == learner_id,
        RemediationQueue.status == "PENDING",
        RemediationQueue.revision_id.isnot(None)
    ).group_by(RemediationQueue.revision_id)
    
    remediation_counts_result = await db.execute(remediation_stmt)
    remediation_map = {row[0]: row[1] for row in remediation_counts_result.all()}
    
    activities = []
    
    # Assumption: 
    # - 1 Revision = 5 minutes
    # - 1 Quiz (Score) = 3 minutes
    TIME_PER_REVISION = 5
    TIME_PER_QUIZ = 3
    
    for r in revisions:
        pending_errors = remediation_map.get(r.id, 0)
        activities.append({
            "type": "REVISION",
            "id": r.id,
            "topic": r.topic,
            "subject": r.subject, # Add subject
            "created_at": r.created_at,
            "minutes": TIME_PER_REVISION,
            "details": "Révision de cours",
            "pending_errors": pending_errors, # Add pending errors count
            "current_series": r.current_series,
            "total_series": r.total_series,
            "completed_series": r.completed_series,
            "status": r.status # Add status
        })
        
    for s in scores:
        activities.append({
            "type": "QUIZ",
            "id": s.id,
            "revision_id": s.revision_id,
            "topic": s.topic,
            "created_at": s.created_at,
            "minutes": TIME_PER_QUIZ,
            "details": f"Quiz ({s.score}/{s.total_questions})"
        })
        
    # Sort all by date desc
    activities.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Group by Date
    history = {}
    today_str = to_date_str(datetime.utcnow())
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    summary = {
        "today_minutes": 0,
        "week_minutes": 0,
        "total_quizzes": len(scores),
        "total_revisions": len(revisions)
    }
    
    for act in activities:
        date_key = to_date_str(act["created_at"])
        if date_key not in history:
            history[date_key] = {
                "date": date_key,
                "total_minutes": 0,
                "items": []
            }
        
        history[date_key]["items"].append(act)
        history[date_key]["total_minutes"] += act["minutes"]
        
        # Summary Aggregation
        if date_key == today_str:
            summary["today_minutes"] += act["minutes"]
            
        if act["created_at"] >= week_ago:
            summary["week_minutes"] += act["minutes"]
            
    return {
        "summary": summary,
        "history": list(history.values())
    }

@router.post("/reset", response_model=QuizResponse)
async def reset_revision(
    revision_id: uuid.UUID = Body(..., embed=True),
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Resets a revision to Series 1 to allow starting over."""
    api_key = await get_effective_api_key(user, db)
    if not api_key:
         raise HTTPException(status_code=401, detail="No API Key")

    from app.modules.quiz.models import Revision
    revision = await db.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
        
    # Reset State
    revision.current_series = 1
    revision.completed_series = 0
    revision.status = "IN_PROGRESS"
    revision.progress_state = None
    
    try:
        # Generate new quiz for Series 1
        data = await generate_quiz(
            revision.text_content, 
            api_key, 
            series_index=1
        )
        
        revision.quiz_data = import_json.dumps(data["quiz"])
        revision.updated_at = datetime.utcnow()
        
        db.add(revision)
        await db.commit()
        await db.refresh(revision)
        
        response_quiz = data["quiz"]
        response_quiz["revision_id"] = revision.id
        response_quiz["series_info"] = {
            "current": 1,
            "total": revision.total_series
        }
        
        return response_quiz
        
    except Exception as e:
        import traceback
        print(f"Error in reset_revision: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset revision.")

@router.delete("/revision/{revision_id}")
async def delete_revision(
    revision_id: uuid.UUID,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Deletes a revision and its related data (Scores, RemediationQueue)."""
    from app.modules.quiz.models import Revision, Score, RemediationQueue
    
    revision = await db.get(Revision, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
        
    # Cascade deletes
    stmt_remed = delete(RemediationQueue).where(RemediationQueue.revision_id == revision_id)
    await db.execute(stmt_remed)
    
    stmt_score = delete(Score).where(Score.revision_id == revision_id)
    await db.execute(stmt_score)
    
    await db.delete(revision)
    await db.commit()
    
    return {"status": "success", "deleted_id": str(revision_id)}
