from pydantic import BaseModel
from typing import Optional, List

class AnalyzeRequest(BaseModel):
    images_base64: list[str]  # List of base64 encoded image data

class AnalyzeResponse(BaseModel):
    title: str
    subject: str
    raw_text: str
    synthesis: str
    study_tips: List[str] = []
    is_math_content: bool = False
    math_safety_triggered: bool = False
    usage: Optional[dict] = None

class AnalyzeError(BaseModel):
    error: str
    detail: Optional[str] = None
