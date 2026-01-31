from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class Score(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True)
    topic: str
    score: int
    total_questions: int
    learner_id: Optional[uuid.UUID] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revision_id: Optional[uuid.UUID] = Field(default=None, index=True)

class RemediationQueue(SQLModel, table=True):
    __tablename__ = "remediation_queue"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    learner_id: uuid.UUID = Field(index=True)
    original_content: str # Context or snippet
    question: str
    wrong_answer: str
    correct_answer: str
    topic: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="PENDING") # PENDING, REVIEWED, MASTERED
    revision_id: Optional[uuid.UUID] = Field(default=None, index=True)

class Revision(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    learner_id: Optional[uuid.UUID] = Field(index=True)
    topic: str
    subject: Optional[str] = None # Added for categorization
    text_content: str  # The full lesson text
    synthesis: Optional[str] = None # AI Summary
    study_tips: Optional[str] = None # JSON string of tips list
    quiz_data: Optional[str] = None     # JSON string of current/last quiz
    progress_state: Optional[str] = None # JSON string: {index, answers, score}
    
    # Session / Series Management
    status: str = Field(default="NEW") # NEW, IN_PROGRESS, COMPLETED
    current_series: int = Field(default=1)
    completed_series: int = Field(default=0) # Track how many parts are finished
    total_series: int = Field(default=1)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
