from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Transcript related models
class TranscriptRequest(BaseModel):
    url: str

class OutlinePoint(BaseModel):
    text: str
    start: float

class OutlineResponse(BaseModel):
    points: List[OutlinePoint]

class FinalizedOutlinePoint(BaseModel):
    text: str
    start: float
    duration: float

class FinalizedOutlineResponse(BaseModel):
    points: List[FinalizedOutlinePoint]

# Quiz related models
class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correctAnswer: int

class QuizGenerationRequest(BaseModel):
    transcript: List[Dict[str, Any]]

# Vector DB related models
class VectorDBUpload(BaseModel):
    text: str
    metadata: dict = None
