from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class QuizRequest(BaseModel):
    text_content: str
    title: Optional[str] = None
    subject: Optional[str] = None
    difficulty: str = "medium"
    learner_id: Optional[uuid.UUID] = None # To link revision
    synthesis: Optional[str] = None
    study_tips: Optional[List[str]] = None

class Question(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_answer: int  # Index of the correct option (0-3)
    explanation: str

class QuizResponse(BaseModel):
    topic: str
    questions: List[Question]
    revision_id: Optional[uuid.UUID] = None

class QuestionResult(BaseModel):
    question: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    original_content: Optional[str] = None # To trace back to source text

class ScoreCreate(BaseModel):
    topic: str
    score: int
    total_questions: int
    learner_id: Optional[uuid.UUID] = None
    details: List[QuestionResult] = []
    revision_id: Optional[uuid.UUID] = None

class ScoreResponse(BaseModel):
    id: uuid.UUID
    topic: str
    score: int
    total_questions: int
    created_at: datetime
    learner_id: Optional[uuid.UUID] = None
    new_badges: List[str] = []
    revision_id: Optional[uuid.UUID] = None
