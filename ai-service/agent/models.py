"""Pydantic models for the agent module."""

from typing import List, Optional, Any
from pydantic import BaseModel
from chat.models import ChatMessage


class AgentRequest(BaseModel):
    message: str = ""
    history: List[ChatMessage] = []
    department: str = ""
    role: str = ""
    # Confirmation execution fields
    confirm_tool: str = ""
    confirm_params: dict = {}


class AgentAction(BaseModel):
    type: str  # "confirm" | "export" | "error"
    tool: str = ""
    params: dict = {}
    message: str = ""
    url: str = ""
    filename: str = ""
