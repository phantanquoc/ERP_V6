"""Faithfulness check — verify answer is grounded in context."""

from config import logger, GROQ_API_KEY, GROQ_GRADER_MODEL

_FAITHFULNESS_PROMPT = """Bạn là một hệ thống kiểm tra tính trung thực.

CONTEXT:
{context}

CÂU TRẢ LỜI CẦN KIỂM TRA:
{answer}

Hãy đánh giá: Câu trả lời có mâu thuẫn hoặc bịa đặt thông tin KHÔNG có trong CONTEXT không?
Chỉ trả lời một trong hai: PASS hoặc FAIL
- PASS: câu trả lời dựa trên context, không bịa đặt
- FAIL: câu trả lời có thông tin không có trong context hoặc mâu thuẫn với context"""


def faithfulness_check(answer: str, chunks: list[dict]) -> bool:
    """
    Dùng Groq (model nhỏ) để kiểm tra answer có faithful với context không.
    Trả về True nếu PASS. Fallback True nếu check lỗi.
    """
    if not GROQ_API_KEY:
        return True

    try:
        from groq import Groq
        context_short = "\n\n".join(c["text"][:300] for c in chunks[:3])
        prompt = _FAITHFULNESS_PROMPT.format(
            context=context_short,
            answer=answer[:500],
        )
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_GRADER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=10,
        )
        verdict = resp.choices[0].message.content.strip().upper()
        passed = "PASS" in verdict
        if not passed:
            logger.warning(f"Faithfulness FAIL — verdict: {verdict[:50]}")
        return passed
    except Exception as e:
        logger.warning(f"Faithfulness check skipped: {e}")
        return True
