"""Intent classifier — route user message to RAG or Agent action."""

import json
from groq import Groq

from config import logger, GROQ_API_KEY, GROQ_GRADER_MODEL

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

CLASSIFIER_PROMPT = """Bạn là bộ phân loại intent cho hệ thống ERP. Phân loại câu hỏi nhân viên:

- "rag": hỏi hướng dẫn sử dụng, quy trình, cách làm, chính sách công ty
- "action": yêu cầu thực hiện hành động (xem dữ liệu, tạo mới, duyệt, xuất file, tra cứu)
- "ambiguous": không rõ ràng, cần hỏi lại

Ví dụ:
- "hướng dẫn tạo đơn nghỉ phép" → rag
- "xem chấm công tuần này" → action
- "tạo đơn nghỉ phép ngày mai" → action
- "xuất excel nhân viên" → action
- "quy trình duyệt đơn hàng" → rag
- "xin chào" → ambiguous

Trả về JSON duy nhất: {"intent":"rag|action|ambiguous","category":"attendance|leave|customer|order|task|employee|notification|supplier|purchase|payroll|quotation|general"}
Không giải thích gì thêm."""


def classify_intent(message: str) -> dict:
    """
    Classify user message intent.
    Returns: {"intent": "rag"|"action"|"ambiguous", "category": "..."}
    """
    if not _client:
        logger.warning("Groq client not available, defaulting to rag")
        return {"intent": "rag", "category": "general"}

    try:
        resp = _client.chat.completions.create(
            model=GROQ_GRADER_MODEL,
            messages=[
                {"role": "system", "content": CLASSIFIER_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.0,
            max_tokens=100,
        )
        text = resp.choices[0].message.content.strip()
        # Parse JSON from response
        if "{" in text:
            json_str = text[text.index("{"):text.rindex("}") + 1]
            result = json.loads(json_str)
            if result.get("intent") in ("rag", "action", "ambiguous"):
                return result
        return {"intent": "ambiguous", "category": "general"}
    except Exception as e:
        logger.error(f"Classifier error: {e}")
        return {"intent": "rag", "category": "general"}
