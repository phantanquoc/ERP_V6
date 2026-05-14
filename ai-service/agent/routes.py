"""Agent API endpoint — /agent/stream (ReAct loop)."""

import uuid
import asyncio
import datetime
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from config import logger
from agent.models import AgentRequest
from agent.executor import execute_stream, execute_confirmed
from agent.validation import validate_message

router = APIRouter(prefix="/agent")


@router.post("/stream")
async def agent_stream(req: AgentRequest, request: Request):
    """
    Main agent endpoint. ReAct loop handles all intents:
    - Data queries (attendance, payroll, employees, etc.)
    - Knowledge base search (guides, SOPs, processes)
    - Write actions with confirmation
    - Export actions with download URL
    """
    request_id = str(uuid.uuid4())[:8]
    jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    today = datetime.date.today().isoformat()

    # Handle confirmation execution (second turn)
    if req.confirm_tool:
        logger.info(f"[{request_id}] Agent: executing confirmed tool '{req.confirm_tool}'")

        async def _confirmed():
            chunks = await asyncio.to_thread(
                lambda: list(execute_confirmed(req.confirm_tool, req.confirm_params, jwt_token, request_id))
            )
            for chunk in chunks:
                yield chunk

        return StreamingResponse(_confirmed(), media_type="text/plain; charset=utf-8")

    # All other requests → ReAct agent loop
    logger.info(f"[{request_id}] Agent: msg='{req.message[:50]}' role={req.role} dept={req.department}")

    # Validate input
    is_valid, error_msg = validate_message(req.message, request_id)
    if not is_valid:
        async def _error():
            yield error_msg
        return StreamingResponse(_error(), media_type="text/plain; charset=utf-8")

    async def _react():
        chunks = await asyncio.to_thread(
            lambda: list(execute_stream(
                message=req.message,
                history=req.history,
                role=req.role,
                jwt_token=jwt_token,
                today=today,
                department=req.department,
                request_id=request_id,
            ))
        )
        for chunk in chunks:
            yield chunk

    return StreamingResponse(_react(), media_type="text/plain; charset=utf-8")
