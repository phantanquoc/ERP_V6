"""Tool registry — curated list of ERP API tools for the agent."""

from typing import List

TOOLS: List[dict] = [
    # ─── Attendance ──────────────────────────────────────────────────────────
    {
        "name": "get_attendance_by_date",
        "description": "Xem danh sách chấm công theo khoảng thời gian",
        "method": "GET",
        "path": "/api/attendances/date-range",
        "path_params": [],
        "query_params": [
            {"name": "startDate", "type": "string", "required": True, "description": "Ngày bắt đầu (YYYY-MM-DD)"},
            {"name": "endDate", "type": "string", "required": True, "description": "Ngày kết thúc (YYYY-MM-DD)"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "attendance",
    },
    {
        "name": "export_attendance_excel",
        "description": "Xuất file Excel chấm công theo khoảng thời gian",
        "method": "GET",
        "path": "/api/attendances/export/excel",
        "path_params": [],
        "query_params": [
            {"name": "startDate", "type": "string", "required": False, "description": "Ngày bắt đầu (YYYY-MM-DD)"},
            {"name": "endDate", "type": "string", "required": False, "description": "Ngày kết thúc (YYYY-MM-DD)"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": True,
        "required_roles": [],
        "category": "attendance",
    },
    # ─── Leave Requests ──────────────────────────────────────────────────────
    {
        "name": "list_leave_requests",
        "description": "Xem danh sách đơn nghỉ phép",
        "method": "GET",
        "path": "/api/leave-requests",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "status", "type": "string", "required": False, "description": "Trạng thái: pending (chờ duyệt), approved (đã duyệt), rejected (từ chối)", "enum": ["pending", "approved", "rejected"]},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "leave",
    },
    {
        "name": "create_leave_request",
        "description": "Tạo đơn xin nghỉ phép mới",
        "method": "POST",
        "path": "/api/leave-requests",
        "path_params": [],
        "query_params": [],
        "body_params": [
            {"name": "loaiNghiPhep", "type": "string", "required": True, "description": "Loại nghỉ phép: nghỉ phép năm/nghỉ ốm/nghỉ không lương"},
            {"name": "ngayBatDau", "type": "string", "required": True, "description": "Ngày bắt đầu (YYYY-MM-DD)"},
            {"name": "ngayKetThuc", "type": "string", "required": True, "description": "Ngày kết thúc (YYYY-MM-DD)"},
            {"name": "lyDo", "type": "string", "required": True, "description": "Lý do nghỉ phép"},
        ],
        "body_params_placeholder": [],
        "is_write": True,
        "is_export": False,
        "required_roles": [],
        "category": "leave",
    },
    {
        "name": "approve_leave_request",
        "description": "Duyệt đơn nghỉ phép",
        "method": "PATCH",
        "path": "/api/leave-requests/{id}/approve",
        "path_params": [{"name": "id", "type": "string", "required": True, "description": "ID đơn nghỉ phép"}],
        "query_params": [],
        "body_params": [],
        "is_write": True,
        "is_export": False,
        "required_roles": ["ADMIN", "DEPARTMENT_HEAD", "TEAM_LEAD"],
        "category": "leave",
    },
    # ─── Customers ──────────────────────────────────────────────────────────
    {
        "name": "list_customers",
        "description": "Xem danh sách khách hàng quốc tế",
        "method": "GET",
        "path": "/api/international-customers",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "search", "type": "string", "required": False, "description": "Tìm kiếm theo tên"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "customer",
    },
    {
        "name": "create_customer",
        "description": "Tạo khách hàng quốc tế mới",
        "method": "POST",
        "path": "/api/international-customers",
        "path_params": [],
        "query_params": [],
        "body_params": [
            {"name": "tenCongTy", "type": "string", "required": True, "description": "Tên công ty"},
            {"name": "nguoiLienHe", "type": "string", "required": True, "description": "Người liên hệ"},
            {"name": "loaiKhachHang", "type": "string", "required": True, "description": "Loại: Nhập khẩu/Xuất khẩu/Cả hai"},
        ],
        "body_params_placeholder": [],
        "is_write": True,
        "is_export": False,
        "required_roles": ["ADMIN", "DEPARTMENT_HEAD"],
        "category": "customer",
    },
    # ─── Orders ─────────────────────────────────────────────────────────────
    {
        "name": "list_orders",
        "description": "Xem danh sách đơn hàng",
        "method": "GET",
        "path": "/api/orders",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "status", "type": "string", "required": False, "description": "Trạng thái đơn hàng"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "order",
    },
    {
        "name": "get_order_detail",
        "description": "Xem chi tiết một đơn hàng",
        "method": "GET",
        "path": "/api/orders/{id}",
        "path_params": [{"name": "id", "type": "string", "required": True, "description": "ID đơn hàng"}],
        "query_params": [],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "order",
    },
    {
        "name": "export_orders_excel",
        "description": "Xuất file Excel danh sách đơn hàng",
        "method": "GET",
        "path": "/api/orders/export/excel",
        "path_params": [],
        "query_params": [
            {"name": "startDate", "type": "string", "required": False, "description": "Ngày bắt đầu (YYYY-MM-DD)"},
            {"name": "endDate", "type": "string", "required": False, "description": "Ngày kết thúc (YYYY-MM-DD)"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": True,
        "required_roles": [],
        "category": "order",
    },
    # ─── Tasks ──────────────────────────────────────────────────────────────
    {
        "name": "list_my_tasks",
        "description": "Xem danh sách công việc của tôi",
        "method": "GET",
        "path": "/api/tasks/my-tasks",
        "path_params": [],
        "query_params": [
            {"name": "status", "type": "string", "required": False, "description": "Trạng thái: pending/in_progress/completed"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "task",
    },
    # ─── Employees ──────────────────────────────────────────────────────────
    {
        "name": "list_employees",
        "description": "Xem danh sách nhân viên",
        "method": "GET",
        "path": "/api/employees",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "search", "type": "string", "required": False, "description": "Tìm kiếm theo tên"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": ["ADMIN", "DEPARTMENT_HEAD", "TEAM_LEAD"],
        "category": "employee",
    },
    {
        "name": "export_employees_excel",
        "description": "Xuất file Excel danh sách nhân viên",
        "method": "GET",
        "path": "/api/employees/export/excel",
        "path_params": [],
        "query_params": [],
        "body_params": [],
        "is_write": False,
        "is_export": True,
        "required_roles": ["ADMIN", "DEPARTMENT_HEAD", "TEAM_LEAD"],
        "category": "employee",
    },
    # ─── Notifications ──────────────────────────────────────────────────────
    {
        "name": "list_notifications",
        "description": "Xem danh sách thông báo",
        "method": "GET",
        "path": "/api/notifications",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "notification",
    },
    # ─── Suppliers ──────────────────────────────────────────────────────────
    {
        "name": "list_suppliers",
        "description": "Xem danh sách nhà cung cấp",
        "method": "GET",
        "path": "/api/suppliers",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "search", "type": "string", "required": False, "description": "Tìm kiếm theo tên"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "supplier",
    },
    # ─── Purchase Requests ──────────────────────────────────────────────────
    {
        "name": "list_purchase_requests",
        "description": "Xem danh sách yêu cầu mua hàng",
        "method": "GET",
        "path": "/api/purchase-requests",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "status", "type": "string", "required": False, "description": "Trạng thái"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "purchase",
    },
    # ─── Payroll ────────────────────────────────────────────────────────────
    {
        "name": "get_my_payroll",
        "description": "Xem bảng lương của tôi",
        "method": "GET",
        "path": "/api/payrolls",
        "path_params": [],
        "query_params": [
            {"name": "month", "type": "integer", "required": False, "description": "Tháng (1-12)"},
            {"name": "year", "type": "integer", "required": False, "description": "Năm"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "payroll",
    },
    # ─── Quotation Requests ─────────────────────────────────────────────────
    {
        "name": "list_quotation_requests",
        "description": "Xem danh sách yêu cầu báo giá",
        "method": "GET",
        "path": "/api/quotation-requests",
        "path_params": [],
        "query_params": [
            {"name": "page", "type": "integer", "required": False, "description": "Số trang"},
            {"name": "limit", "type": "integer", "required": False, "description": "Số lượng mỗi trang"},
            {"name": "status", "type": "string", "required": False, "description": "Trạng thái"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "required_roles": [],
        "category": "quotation",
    },
    # ─── Knowledge Base (RAG) ──────────────────────────────────────────────
    {
        "name": "search_knowledge",
        "description": "Tìm kiếm hướng dẫn sử dụng, quy trình, SOP trong knowledge base ERP. Dùng khi user hỏi cách làm, hướng dẫn, quy trình, hoặc cần thông tin về cách sử dụng hệ thống.",
        "method": "INTERNAL",
        "path": "",
        "path_params": [],
        "query_params": [
            {"name": "query", "type": "string", "required": True, "description": "Câu hỏi cần tìm trong knowledge base"},
        ],
        "body_params": [],
        "is_write": False,
        "is_export": False,
        "is_internal": True,
        "required_roles": [],
        "category": "knowledge",
    },
]


# ─── Helper Functions ───────────────────────────────────────────────────────

def get_tools_for_role(role: str) -> List[dict]:
    """Filter tools theo role của user. Trả về tools mà user có quyền dùng."""
    role_upper = role.upper() if role else ""
    return [
        t for t in TOOLS
        if not t["required_roles"] or role_upper in t["required_roles"]
    ]


def get_tool_by_name(name: str) -> dict | None:
    """Tìm tool theo tên."""
    for t in TOOLS:
        if t["name"] == name:
            return t
    return None


def to_groq_tools(tools: List[dict]) -> List[dict]:
    """Convert registry tools → Groq function calling format."""
    groq_tools = []
    for t in tools:
        properties = {}
        required = []

        for p in t.get("path_params", []):
            prop = {"type": p["type"], "description": p["description"]}
            if p.get("enum"):
                prop["enum"] = p["enum"]
            properties[p["name"]] = prop
            if p.get("required"):
                required.append(p["name"])

        for p in t.get("query_params", []):
            prop = {"type": p["type"], "description": p["description"]}
            if p.get("enum"):
                prop["enum"] = p["enum"]
            properties[p["name"]] = prop
            if p.get("required"):
                required.append(p["name"])

        for p in t.get("body_params", []):
            prop = {"type": p["type"], "description": p["description"]}
            if p.get("enum"):
                prop["enum"] = p["enum"]
            properties[p["name"]] = prop
            if p.get("required"):
                required.append(p["name"])

        groq_tools.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            },
        })
    return groq_tools
