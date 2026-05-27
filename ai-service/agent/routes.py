"""Agent API endpoint — /agent/stream (ReAct loop)."""

import os
import uuid
import asyncio
import datetime
import time

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from config import logger, OPENROUTER_MODEL
from agent.models import AgentRequest
from agent.executor import execute_stream, execute_confirmed
from agent.validation import validate_message

router = APIRouter(prefix="/agent")

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://backend:5000")


async def _validate_jwt(token: str) -> bool:
    """Quick JWT validation by probing backend /api/users/profile."""
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{BACKEND_API_URL}/api/users/profile",
                headers={"Authorization": f"Bearer {token}"},
            )
        return resp.status_code == 200
    except Exception:
        return False


async def _stream_sync_generator(gen_fn, *args, **kwargs):
    """Run a synchronous generator in a thread and yield chunks via asyncio.Queue."""
    q: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def _run():
        try:
            for chunk in gen_fn(*args, **kwargs):
                loop.call_soon_threadsafe(q.put_nowait, chunk)
        except Exception as e:
            loop.call_soon_threadsafe(q.put_nowait, e)
        finally:
            loop.call_soon_threadsafe(q.put_nowait, None)

    loop.run_in_executor(None, _run)

    while True:
        item = await asyncio.wait_for(q.get(), timeout=120)
        if item is None:
            break
        if isinstance(item, Exception):
            yield f"Lỗi: {item}"
            break
        yield item


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

    # Early JWT validation — avoid wasting LLM tokens on expired sessions
    if not await _validate_jwt(jwt_token):
        async def _auth_error():
            yield "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
        return StreamingResponse(_auth_error(), media_type="text/plain; charset=utf-8")

    # Handle confirmation execution (second turn)
    if req.confirm_tool:
        logger.info(f"[{request_id}] Agent: executing confirmed tool '{req.confirm_tool}'")

        async def _confirmed():
            start = time.time()
            async for chunk in _stream_sync_generator(
                execute_confirmed,
                req.confirm_tool, req.confirm_params, jwt_token, request_id,
                confirm_context=req.confirm_context,
            ):
                yield chunk
            duration_ms = int((time.time() - start) * 1000)
            logger.info(f"[{request_id}] METRICS: type=confirm tool={req.confirm_tool} duration={duration_ms}ms")

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
        start = time.time()
        async for chunk in _stream_sync_generator(
            execute_stream,
            message=req.message,
            history=req.history,
            role=req.role,
            jwt_token=jwt_token,
            today=today,
            department=req.department,
            secondary_departments=req.secondary_departments,
            request_id=request_id,
        ):
            yield chunk
        duration_ms = int((time.time() - start) * 1000)
        logger.info(
            f"[{request_id}] METRICS: type=react duration={duration_ms}ms "
            f"model={OPENROUTER_MODEL} msg_len={len(req.message)} history_len={len(req.history)}"
        )

    return StreamingResponse(_react(), media_type="text/plain; charset=utf-8")
