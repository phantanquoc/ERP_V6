"""Input validation & sanitization for agent requests."""

import re
from config import logger

# Max message length (chars)
MAX_MESSAGE_LENGTH = 2000

# Patterns that indicate prompt injection attempts
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(a|an)\s+", re.IGNORECASE),
    re.compile(r"(system|admin)\s*:\s*", re.IGNORECASE),
    re.compile(r"<\s*system\s*>", re.IGNORECASE),
    re.compile(r"forget\s+(everything|all|your)\s+(you|instructions|rules)", re.IGNORECASE),
    re.compile(r"new\s+instructions?\s*:", re.IGNORECASE),
    re.compile(r"override\s+(previous|system|all)", re.IGNORECASE),
    re.compile(r"disregard\s+(all|previous|your)", re.IGNORECASE),
    # Vietnamese injection patterns
    re.compile(r"bỏ\s+qua\s+(tất\s+cả\s+)?(hướng\s+dẫn|quy\s+tắc|lệnh)", re.IGNORECASE),
    re.compile(r"quên\s+(tất\s+cả|hướng\s+dẫn|quy\s+tắc)", re.IGNORECASE),
    re.compile(r"hướng\s+dẫn\s+mới\s*:", re.IGNORECASE),
    re.compile(r"bây\s+giờ\s+bạn\s+là\s+", re.IGNORECASE),
    re.compile(r"giả\s+vờ\s+(bạn\s+là|như\s+là)\s+", re.IGNORECASE),
    re.compile(r"đóng\s+vai\s+(là\s+)?", re.IGNORECASE),
    re.compile(r"hãy\s+bỏ\s+qua\s+", re.IGNORECASE),
    re.compile(r"không\s+cần\s+tuân\s+theo", re.IGNORECASE),
]


def validate_message(message: str, request_id: str = "") -> tuple[bool, str]:
    """
    Validate user message. Returns (is_valid, error_message).
    If valid, error_message is empty string.
    """
    if not message or not message.strip():
        return False, "Vui lòng nhập câu hỏi hoặc yêu cầu."

    if len(message) > MAX_MESSAGE_LENGTH:
        logger.warning(f"[{request_id}] Message too long: {len(message)} chars")
        return False, f"Tin nhắn quá dài (tối đa {MAX_MESSAGE_LENGTH} ký tự). Vui lòng rút gọn."

    # Check for injection patterns
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(message):
            logger.warning(f"[{request_id}] Potential prompt injection detected: {message[:100]}")
            return False, "Xin lỗi, tôi không thể xử lý yêu cầu này."

    return True, ""
