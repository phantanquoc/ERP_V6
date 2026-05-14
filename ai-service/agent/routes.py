"""Agent API endpoint — /agent/stream."""

import datetime
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from config import logger
from agent.models import AgentRequest
from agent.classifier import classify_intent
from agent.executor import execute_stream, execute_confirmed
from chat.routes import chat_stream
from chat.models import ChatRequest

router = APIRouter(prefix="/agent")


@router.post("/stream")
async def agent_stream(req: AgentRequest, request: Request):
    """
    Main agent endpoint. Routes to:
    - Confirmed execution (if confirm_tool is set)
    - Action execution (if intent=action)
    - RAG chatbot (if intent=rag)
    """
    jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    today = datetime.date.today().isoformat()

    # Handle confirmation execution
    if req.confirm_tool:
        logger.info(f"Agent: executing confirmed tool '{req.confirm_tool}'")

        async def _confirmed():
            for chunk in execute_confirmed(req.confirm_tool, req.confirm_params, jwt_token):
                yield chunk

        return StreamingResponse(_confirmed(), media_type="text/plain; charset=utf-8")

    # Classify intent
    intent_result = classify_intent(req.message)
    intent = intent_result.get("intent", "rag")
    logger.info(f"Agent: intent={intent} category={intent_result.get('category')} msg='{req.message[:50]}'")

    # Route to RAG for guidance questions
    if intent == "rag":
        chat_req = ChatRequest(
            message=req.message,
            history=req.history,
            department=req.department,
            role=req.role,
        )
        return await chat_stream(chat_req)

    # Route to action executor
    if intent == "action":
        async def _action():
            for chunk in execute_stream(req.message, req.history, req.role, jwt_token, today):
                yield chunk

        return StreamingResponse(_action(), media_type="text/plain; charset=utf-8")

    # Ambiguous — ask for clarification
    async def _ambiguous():
        yield "Tôi chưa rõ bạn muốn:\n"
        yield "1. **Hỏi hướng dẫn** (cách sử dụng, quy trình)\n"
        yield "2. **Thực hiện thao tác** (xem dữ liệu, tạo mới, xuất file)\n\n"
        yield "Vui lòng nói rõ hơn để tôi hỗ trợ bạn."

    return StreamingResponse(_ambiguous(), media_type="text/plain; charset=utf-8")
