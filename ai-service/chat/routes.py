"""Chat API endpoints — /chat, /chat/stream, /chat/feedback."""

import json
import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from config import logger
from chat.models import ChatRequest, ChatResponse, FeedbackRequest
from chat.indexer import init_rag
import chat.indexer as indexer
from chat.retrieval import build_retrieval, sem_cache_lookup, sem_cache_put
from chat.llm import expand_query, rewrite_query, call_llm, stream_llm, build_messages
from chat.faithfulness import faithfulness_check

router = APIRouter(prefix="/chat")

_FEEDBACK_FILE = Path("/app/chroma_data/feedback.jsonl")


@router.post("", response_model=ChatResponse)
def chat(req: ChatRequest):
    """RAG chatbot: semantic cache + hybrid search + confidence gate + reranking + faithfulness."""
    if not indexer.rag_ready:
        init_rag()
        if not indexer.rag_ready:
            raise HTTPException(status_code=503, detail="RAG not ready, please retry")

    try:
        query_text = expand_query(req.message)
        rewritten = rewrite_query(query_text)
        query_emb = indexer.embedder.encode([rewritten], normalize_embeddings=True).tolist()[0]

        # Semantic cache lookup
        if not req.history:
            _scope = f"{req.department}:{req.role}"
            cached = sem_cache_lookup(query_emb, scope=_scope)
            if cached:
                return ChatResponse(answer=cached[0], sources=cached[1])

        # Retrieval
        chunks, confident = build_retrieval(rewritten, req.message, req.department, req.role)

        if not confident or not chunks:
            return ChatResponse(
                answer="Tôi không tìm thấy thông tin liên quan trong tài liệu ERP. Vui lòng thử hỏi theo cách khác hoặc liên hệ quản trị viên.",
                sources=[]
            )

        sources = []
        context_texts = []
        for c in chunks:
            meta = c.get("metadata", {})
            label = f"{meta.get('filename', '')} - {meta.get('section', '')}".strip(" -")
            if label and label not in sources:
                sources.append(label)
            context_texts.append(c["text"])

        # Generate
        messages = build_messages(req, chunks)
        answer = call_llm(messages)

        # Faithfulness check
        if not faithfulness_check(answer, chunks):
            logger.warning(f"Faithfulness rejected answer: {answer[:200]}")
            answer = (
                "Xin lỗi, tôi không thể đưa ra câu trả lời chắc chắn dựa trên tài liệu hiện có. "
                "Vui lòng liên hệ quản trị viên hoặc trưởng phòng để được hỗ trợ."
            )
            return ChatResponse(answer=answer, sources=sources, context_texts=context_texts)

        # Cache kết quả
        if not req.history:
            sem_cache_put(query_emb, answer, sources, scope=_scope)

        return ChatResponse(answer=answer, sources=sources, context_texts=context_texts)

    except Exception as e:
        if "DAILY_LIMIT_REACHED" in str(e):
            return ChatResponse(
                answer="Hệ thống trợ lý đang tạm quá tải. Vui lòng thử lại sau 30 phút hoặc liên hệ quản trị viên.",
                sources=[]
            )
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """Streaming RAG: semantic cache + hybrid search + confidence gate + reranking."""
    if not indexer.rag_ready:
        init_rag()
        if not indexer.rag_ready:
            raise HTTPException(status_code=503, detail="RAG not ready, please retry")

    query_text = expand_query(req.message)
    rewritten = rewrite_query(query_text)
    query_emb = indexer.embedder.encode([rewritten], normalize_embeddings=True).tolist()[0]
    _scope = f"{req.department}:{req.role}"

    # Semantic cache
    if not req.history:
        cached = sem_cache_lookup(query_emb, scope=_scope)
        if cached:
            async def _from_cache():
                yield cached[0]
            return StreamingResponse(_from_cache(), media_type="text/plain; charset=utf-8")

    chunks, confident = build_retrieval(rewritten, req.message, req.department)

    if not confident or not chunks:
        async def _no_info():
            yield "Tôi không tìm thấy thông tin liên quan trong tài liệu ERP. Vui lòng thử hỏi theo cách khác hoặc liên hệ quản trị viên."
        return StreamingResponse(_no_info(), media_type="text/plain; charset=utf-8")

    messages = build_messages(req, chunks)

    collected: list[str] = []
    sources = []
    for c in chunks:
        meta = c.get("metadata", {})
        label = f"{meta.get('filename', '')} - {meta.get('section', '')}".strip(" -")
        if label and label not in sources:
            sources.append(label)

    async def _generate():
        import asyncio
        import queue as _queue

        token_queue: _queue.Queue = _queue.Queue()
        loop = asyncio.get_event_loop()

        def _sync_stream():
            try:
                for token in stream_llm(messages):
                    token_queue.put(token)
            finally:
                token_queue.put(None)

        loop.run_in_executor(None, _sync_stream)

        while True:
            try:
                token = await loop.run_in_executor(None, lambda: token_queue.get(timeout=300))
            except Exception:
                break
            if token is None:
                break
            collected.append(token)
            yield token

        if not req.history and collected:
            sem_cache_put(query_emb, "".join(collected), sources, scope=_scope)

    return StreamingResponse(_generate(), media_type="text/plain; charset=utf-8")


@router.post("/feedback")
def chat_feedback(req: FeedbackRequest):
    """Lưu feedback 👍/👎 từ user vào JSONL file."""
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "message_id": req.message_id,
        "question": req.question,
        "answer": req.answer[:500],
        "rating": req.rating,
        "comment": req.comment,
        "department": req.department,
        "role": req.role,
    }
    try:
        _FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        logger.info(f"Feedback saved: rating={req.rating} dept={req.department} q='{req.question[:40]}'")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Feedback save error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")


@router.get("/feedback/stats")
def chat_feedback_stats():
    """Thống kê feedback: tổng, positive, negative."""
    if not _FEEDBACK_FILE.exists():
        return {"total": 0, "positive": 0, "negative": 0, "recent": []}
    lines = _FEEDBACK_FILE.read_text(encoding="utf-8").strip().split("\n")
    entries = [json.loads(l) for l in lines if l.strip()]
    positive = sum(1 for e in entries if e.get("rating", 0) > 0)
    negative = sum(1 for e in entries if e.get("rating", 0) < 0)
    recent = entries[-10:][::-1]
    return {"total": len(entries), "positive": positive, "negative": negative, "recent": recent}
