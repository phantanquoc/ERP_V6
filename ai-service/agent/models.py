"""Pydantic models for the agent module."""

from typing import List, Optional, Any
from pydantic import BaseModel
from chat.models import ChatMessage


class AgentRequest(BaseModel):
    message: str = ""
    history: List[ChatMessage] = []
    department: str = ""
    secondary_departments: List[str] = []
    role: str = ""
    # Confirmation execution fields
    confirm_tool: str = ""
    confirm_params: dict = {}
    confirm_context: Optional[dict] = None  # Context to resume ReAct loop after confirm


class AgentAction(BaseModel):
    type: str  # "confirm" | "export" | "error"
    tool: str = ""
    params: dict = {}
    message: str = ""
    url: str = ""
    filename: str = ""
    context: Optional[dict] = None  # Context for chaining: {message, role, department, today}
    display: dict = {}  # Maps param keys to display-friendly values (e.g. CUID → employee name)
