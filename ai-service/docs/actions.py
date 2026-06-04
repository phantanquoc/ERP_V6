"""File action detection and structured data extraction."""

import unicodedata
from typing import Optional

# Entity mapping: intent keywords -> action metadata.
# Keep keywords ordered from specific to generic so "yêu cầu báo giá" wins
# over the shorter "báo giá" match.
FILE_ACTION_MAP = {
    "yêu cầu báo giá": {
        "action": "create_quotation_request",
        "tool": "create_quotation_request",
        "required_fields": ["customerId", "employeeId", "items"],
        "document_type": "quotation_request",
    },
    "yeu cau bao gia": {
        "action": "create_quotation_request",
        "tool": "create_quotation_request",
        "required_fields": ["customerId", "employeeId", "items"],
        "document_type": "quotation_request",
    },
    "ycbg": {
        "action": "create_quotation_request",
        "tool": "create_quotation_request",
        "required_fields": ["customerId", "employeeId", "items"],
        "document_type": "quotation_request",
    },
    "rfq": {
        "action": "create_quotation_request",
        "tool": "create_quotation_request",
        "required_fields": ["customerId", "employeeId", "items"],
        "document_type": "quotation_request",
    },
    "request for quotation": {
        "action": "create_quotation_request",
        "tool": "create_quotation_request",
        "required_fields": ["customerId", "employeeId", "items"],
        "document_type": "quotation_request",
    },
    "báo giá": {
        "action": "create_quotation",
        "tool": "create_quotation",
        "required_fields": ["quotationRequestId"],
        "document_type": "quotation",
    },
    "bao gia": {
        "action": "create_quotation",
        "tool": "create_quotation",
        "required_fields": ["quotationRequestId"],
        "document_type": "quotation",
    },
    "quotation": {
        "action": "create_quotation",
        "tool": "create_quotation",
        "required_fields": ["quotationRequestId"],
        "document_type": "quotation",
    },
    "quote": {
        "action": "create_quotation",
        "tool": "create_quotation",
        "required_fields": ["quotationRequestId"],
        "document_type": "quotation",
    },
    "quy trình": {
        "action": "create_process",
        "tool": "create_process",
        "required_fields": ["tenQuyTrinh", "maQuyTrinh", "noiDung"],
        "document_type": "process",
    },
    "process": {
        "action": "create_process",
        "tool": "create_process",
        "required_fields": ["tenQuyTrinh", "maQuyTrinh", "noiDung"],
        "document_type": "process",
    },
    "khách hàng": {
        "action": "create_customer",
        "tool": "create_customer",
        "required_fields": ["tenCongTy", "phanLoaiDiaLy"],
        "document_type": "customer",
    },
    "customer": {
        "action": "create_customer",
        "tool": "create_customer",
        "required_fields": ["tenCongTy", "phanLoaiDiaLy"],
        "document_type": "customer",
    },
    "nhà cung cấp": {
        "action": "create_supplier",
        "tool": "create_supplier",
        "required_fields": ["tenNhaCungCap", "loaiNhaCungCap"],
        "document_type": "supplier",
    },
    "supplier": {
        "action": "create_supplier",
        "tool": "create_supplier",
        "required_fields": ["tenNhaCungCap", "loaiNhaCungCap"],
        "document_type": "supplier",
    },
    "sản phẩm": {
        "action": "create_product",
        "tool": "create_product",
        "required_fields": ["tenSanPham", "loaiSanPham", "donViTinh"],
        "document_type": "product",
    },
    "product": {
        "action": "create_product",
        "tool": "create_product",
        "required_fields": ["tenSanPham", "loaiSanPham", "donViTinh"],
        "document_type": "product",
    },
    "yêu cầu mua": {
        "action": "create_purchase_request",
        "tool": "create_purchase_request",
        "required_fields": ["tenHangHoa", "soLuong", "donViTinh"],
        "document_type": "purchase_request",
    },
    "purchase": {
        "action": "create_purchase_request",
        "tool": "create_purchase_request",
        "required_fields": ["tenHangHoa", "soLuong", "donViTinh"],
        "document_type": "purchase_request",
    },
    "nhiệm vụ": {
        "action": "create_task",
        "tool": "create_task",
        "required_fields": ["tieuDe", "noiDung", "nguoiNhan"],
        "document_type": "task",
    },
    "task": {
        "action": "create_task",
        "tool": "create_task",
        "required_fields": ["tieuDe", "noiDung", "nguoiNhan"],
        "document_type": "task",
    },
}


def _normalize_text(value: str) -> str:
    """Lowercase and strip accents so filenames like bao_gia.xlsx still match."""
    normalized = unicodedata.normalize("NFD", value or "")
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return without_accents.lower().replace("_", " ").replace("-", " ")


def detect_file_action(message: str) -> Optional[str]:
    """Detect if user wants to create/update an entity from file."""
    info = detect_file_action_info(message)
    return info["action"] if info else None


def detect_file_action_info(message: str) -> Optional[dict]:
    """Detect file action and return tool metadata for extraction."""
    msg_lower = message.lower()
    msg_normalized = _normalize_text(message)
    action_keywords = [
        "tạo", "create", "thêm", "add", "nhập", "import", "cập nhật", "update",
        "tao", "them", "nhap", "cap nhat", "xu ly", "xử lý",
    ]
    if not any(kw in msg_lower or _normalize_text(kw) in msg_normalized for kw in action_keywords):
        return None
    for keyword, info in FILE_ACTION_MAP.items():
        if keyword in msg_lower or _normalize_text(keyword) in msg_normalized:
            return dict(info)
    return None


def get_entity_info(action: str) -> Optional[dict]:
    """Get entity info for an action."""
    for info in FILE_ACTION_MAP.values():
        if info["action"] == action:
            return dict(info)
    return None
