"""File action detection and structured data extraction."""

from typing import Optional

# Entity mapping: intent keywords -> (action, tool_name, required_fields)
FILE_ACTION_MAP = {
    "quy trình": ("create_process", "create_process", ["tenQuyTrinh", "maQuyTrinh", "noiDung"]),
    "process": ("create_process", "create_process", ["tenQuyTrinh", "maQuyTrinh", "noiDung"]),
    "khách hàng": ("create_customer", "create_customer", ["tenCongTy", "phanLoaiDiaLy"]),
    "customer": ("create_customer", "create_customer", ["tenCongTy", "phanLoaiDiaLy"]),
    "nhà cung cấp": ("create_supplier", "create_supplier", ["tenNhaCungCap", "loaiNhaCungCap"]),
    "supplier": ("create_supplier", "create_supplier", ["tenNhaCungCap", "loaiNhaCungCap"]),
    "sản phẩm": ("create_product", "create_product", ["tenSanPham", "loaiSanPham", "donViTinh"]),
    "product": ("create_product", "create_product", ["tenSanPham", "loaiSanPham", "donViTinh"]),
    "yêu cầu mua": ("create_purchase_request", "create_purchase_request", ["tenHangHoa", "soLuong", "donViTinh"]),
    "purchase": ("create_purchase_request", "create_purchase_request", ["tenHangHoa", "soLuong", "donViTinh"]),
    "nhiệm vụ": ("create_task", "create_task", ["tieuDe", "noiDung", "nguoiNhan"]),
    "task": ("create_task", "create_task", ["tieuDe", "noiDung", "nguoiNhan"]),
}


def detect_file_action(message: str) -> Optional[str]:
    """Detect if user wants to create/update an entity from file."""
    msg_lower = message.lower()
    action_keywords = ["tạo", "create", "thêm", "add", "nhập", "import", "cập nhật", "update"]
    if not any(kw in msg_lower for kw in action_keywords):
        return None
    for keyword, (action, _, _) in FILE_ACTION_MAP.items():
        if keyword in msg_lower:
            return action
    return None


def get_entity_info(action: str) -> Optional[dict]:
    """Get entity info for an action."""
    for _, (act, tool, fields) in FILE_ACTION_MAP.items():
        if act == action:
            return {"action": action, "tool": tool, "required_fields": fields}
    return None
