"""Intent classifier — keyword-based mapping of user messages to tool categories.

Reduces token usage by only sending relevant tools to the LLM instead of all 65.
"""

import re
from typing import List, Set

# Category keyword mapping: category → set of Vietnamese/English keywords
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "attendance": [
        "chấm công", "điểm danh", "check in", "check out", "vào ca", "ra ca",
        "giờ làm", "đi muộn", "về sớm", "attendance",
    ],
    "leave": [
        "nghỉ phép", "xin nghỉ", "đơn nghỉ", "leave", "phép năm",
        "nghỉ ốm", "nghỉ thai sản", "duyệt đơn", "từ chối đơn",
    ],
    "customer": [
        "khách hàng", "khách", "customer", "nội địa", "quốc tế",
        "đối tác", "client",
    ],
    "order": [
        "đơn hàng", "order", "đặt hàng", "giao hàng", "vận chuyển",
    ],
    "task": [
        "công việc", "nhiệm vụ", "task", "giao việc", "deadline",
        "tiến độ", "hoàn thành",
    ],
    "employee": [
        "nhân viên", "nhân sự", "employee", "profile", "thông tin cá nhân",
        "hồ sơ", "danh sách nv",
    ],
    "notification": [
        "thông báo", "notification", "tin nhắn",
    ],
    "supplier": [
        "nhà cung cấp", "supplier", "ncc", "cung cấp", "nguyên vật liệu",
    ],
    "purchase": [
        "mua hàng", "yêu cầu mua", "purchase", "đề xuất mua",
    ],
    "payroll": [
        "lương", "bảng lương", "payroll", "thu nhập", "salary",
    ],
    "quotation": [
        "báo giá", "quotation", "ycbg", "yêu cầu báo giá", "quote",
    ],
    "product": [
        "sản phẩm", "product", "hàng hóa", "mít sấy", "trái cây sấy",
    ],
    "production": [
        "sản xuất", "production", "chất lượng", "qc", "nguyên liệu",
        "thành phẩm", "mẻ sấy", "sấy", "định mức", "quy trình sx",
        "vận hành", "kiểm tra nội bộ", "tiêu chí",
    ],
    "warehouse": [
        "kho hàng", "warehouse", "nhập kho", "xuất kho", "lô hàng", "lot",
        "tồn kho", "phiếu nhập", "phiếu xuất", "nghiệm thu", "bàn giao",
        r"\bkho\b",
    ],
    "maintenance": [
        "máy móc", "thiết bị", "sửa chữa", "bảo trì", "repair",
        "machine", "hư hỏng", "lỗi máy", "hệ thống máy",
    ],
    "finance": [
        "hóa đơn", "invoice", "công nợ", "debt", "chi phí", "tài chính",
        "thuế", "tax", "xuất khẩu chi phí", "giá thành", "tính giá",
    ],
    "planning": [
        "kế hoạch", "plan", "tăng ca", "overtime", "lịch làm",
    ],
    "report": [
        "báo cáo", "report", "báo cáo ngày", "daily report",
    ],
    "hr": [
        "phòng ban", "department", "ca làm", "shift", "đánh giá nhân viên",
        "kpi", "evaluation",
    ],
    "feedback": [
        "phản hồi", "feedback", "khiếu nại", "góp ý",
    ],
    "knowledge": [
        "hướng dẫn", "quy trình", "sop", "cách", "làm sao", "how to",
        "guide", "tài liệu", "help",
    ],
    "supply": [
        "cung ứng", "vật tư", "supply", "yêu cầu cung ứng",
    ],
}

# Short keywords (≤4 chars) that need word-boundary matching to avoid false positives
_SHORT_KEYWORDS: set[str] = {"kho", "ncc", "qc", "lot", "kpi", "sop", "tax"}

# Categories that are always included (utility tools)
_ALWAYS_INCLUDE: Set[str] = {"employee", "knowledge"}

# Related categories: when one is detected, also include these
_RELATED: dict[str, list[str]] = {
    "quotation": ["customer", "product"],
    "purchase": ["supplier"],
    "order": ["customer"],
    "feedback": ["customer"],
    "supply": ["supplier"],
    "leave": ["employee"],
    "task": ["employee"],
    "report": ["employee"],
}


def classify_intent(message: str) -> Set[str]:
    """Classify user message into relevant tool categories.

    Returns a set of category names. Always includes 'employee' and 'knowledge'
    as utility categories. If no specific intent is detected, returns all categories
    (fallback to full tool set).
    """
    msg_lower = message.lower()
    matched: Set[str] = set()

    for category, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw.startswith(r"\b"):
                # Pre-built regex pattern
                if re.search(kw, msg_lower):
                    matched.add(category)
                    break
            elif kw in _SHORT_KEYWORDS:
                # Word-boundary match for short keywords
                if re.search(rf"\b{re.escape(kw)}\b", msg_lower):
                    matched.add(category)
                    break
            else:
                if kw in msg_lower:
                    matched.add(category)
                    break

    # If nothing matched, return empty → caller should use all tools
    if not matched:
        return set()

    # Add always-included categories
    matched.update(_ALWAYS_INCLUDE)

    # Add related categories
    for cat in list(matched):
        if cat in _RELATED:
            matched.update(_RELATED[cat])

    return matched


def filter_tools_by_intent(tools: List[dict], message: str) -> List[dict]:
    """Filter tools list based on classified intent from user message.

    If intent classification returns empty (no keywords matched),
    returns all tools unchanged (safe fallback).
    """
    categories = classify_intent(message)

    # Fallback: no intent detected → use all tools
    if not categories:
        return tools

    return [t for t in tools if t.get("category") in categories]
