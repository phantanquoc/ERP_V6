"""Faithfulness check — verify answer is grounded in context."""

import re
from config import logger, OPENROUTER_API_KEY, OPENROUTER_MODEL

_FAITHFULNESS_PROMPT = """Bạn là một hệ thống kiểm tra tính trung thực. KHÔNG suy nghĩ, trả lời ngay một từ duy nhất.

CONTEXT:
{context}

CÂU TRẢ LỜI CẦN KIỂM TRA:
{answer}

Câu trả lời có BỊA ĐẶT thông tin sai lệch hoặc MÂU THUẪN trực tiếp với CONTEXT không?
- PASS: nhất quán với context. Cho phép diễn đạt lại, tóm tắt, bổ sung hướng dẫn điều hướng (sidebar, menu, nút) miễn không mâu thuẫn.
- FAIL: bịa đặt dữ liệu cụ thể (tên trường, giá trị, quy trình) KHÔNG hề có trong context, hoặc nói ngược lại.

Trả lời MỘT TỪ DUY NHẤT: PASS hoặc FAIL"""

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


def faithfulness_check(answer: str, chunks: list[dict]) -> bool:
    """
    Dùng OpenRouter (DeepSeek) để kiểm tra answer có faithful với context không.
    Trả về True nếu PASS. Fallback True nếu check lỗi.
    """
    if not OPENROUTER_API_KEY:
        return True

    try:
        from openai import OpenAI
        context_short = "\n\n".join(c["text"][:500] for c in chunks[:5])
        prompt = _FAITHFULNESS_PROMPT.format(
            context=context_short,
            answer=answer[:500],
        )
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        resp = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=50,
        )
        raw = resp.choices[0].message.content or ""
        # Strip <think> tags (DeepSeek reasoning)
        verdict = _THINK_RE.sub("", raw).strip().upper()
        if "PASS" in verdict:
            passed = True
        elif "FAIL" in verdict:
            passed = False
        else:
            # Ambiguous — default to PASS (lenient)
            logger.warning(f"Faithfulness ambiguous verdict: {raw[:100]}")
            passed = True
        if not passed:
            logger.warning(f"Faithfulness FAIL — verdict: {verdict[:50]}")
            logger.warning(f"Faithfulness rejected answer: {answer[:200]}")
        return passed
    except Exception as e:
        logger.warning(f"Faithfulness check skipped: {e}")
        return True
