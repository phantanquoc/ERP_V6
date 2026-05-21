"""Pydantic models for chat endpoints."""

from typing import List
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    department: str = ""
    role: str = ""
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    context_texts: List[str] = []


class FeedbackRequest(BaseModel):
    message_id: str = ""
    question: str
    answer: str
    rating: int  # 1 = 👍, -1 = 👎
    comment: str = ""
    department: str = ""
    role: str = ""
