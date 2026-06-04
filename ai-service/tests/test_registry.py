"""Test agent/registry.py — pure logic, không cần mock."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent.registry import (
    TOOLS,
    get_tools_for_role,
    get_tool_by_name,
    to_groq_tools,
)

# Tên các tool chỉ dành cho role cao (không có trong EMPLOYEE)
RESTRICTED_TOOLS = {
    "approve_leave_request",
    "create_customer",
    "create_order_from_quotation",
    "create_quotation",
    "list_employees",
    "export_employees_excel",
}


class TestGetToolsForRole:
    def test_admin_nhan_tat_ca_tools(self):
        tools = get_tools_for_role("ADMIN")
        assert len(tools) == len(TOOLS) == 72

    def test_admin_case_insensitive(self):
        tools_upper = get_tools_for_role("ADMIN")
        tools_lower = get_tools_for_role("admin")
        assert len(tools_upper) == len(tools_lower)

    def test_employee_khong_co_tool_restricted(self):
        tools = get_tools_for_role("EMPLOYEE")
        names = {t["name"] for t in tools}
        for restricted in RESTRICTED_TOOLS:
            assert restricted not in names, f"{restricted} không được phép với EMPLOYEE"

    def test_employee_co_cac_tool_chung(self):
        tools = get_tools_for_role("EMPLOYEE")
        names = {t["name"] for t in tools}
        expected_public = {
            "get_attendance_by_date",
            "export_attendance_excel",
            "list_leave_requests",
            "create_leave_request",
            "list_orders",
            "list_my_tasks",
            "list_notifications",
            "list_suppliers",
            "list_purchase_requests",
            "get_my_payroll",
            "list_quotation_requests",
            "list_customers",
            "list_products",
            "create_quotation_request",
        }
        for tool_name in expected_public:
            assert tool_name in names, f"{tool_name} phải có với EMPLOYEE"

    def test_department_head_co_approve_leave(self):
        tools = get_tools_for_role("DEPARTMENT_HEAD")
        names = {t["name"] for t in tools}
        assert "approve_leave_request" in names
        assert "list_employees" in names

    def test_role_rong_chi_tra_tool_khong_restricted(self):
        tools = get_tools_for_role("")
        names = {t["name"] for t in tools}
        for restricted in RESTRICTED_TOOLS:
            assert restricted not in names


class TestGetToolByName:
    def test_tim_tool_ton_tai(self):
        tool = get_tool_by_name("get_attendance_by_date")
        assert tool is not None
        assert tool["name"] == "get_attendance_by_date"
        assert tool["method"] == "GET"
        assert tool["category"] == "attendance"

    def test_tim_tool_khong_ton_tai_tra_none(self):
        result = get_tool_by_name("nonexistent_tool")
        assert result is None

    def test_tim_tool_chuoi_rong_tra_none(self):
        result = get_tool_by_name("")
        assert result is None

    def test_tim_create_leave_request(self):
        tool = get_tool_by_name("create_leave_request")
        assert tool is not None
        assert tool["is_write"] is True
        assert tool["method"] == "POST"

    def test_tim_export_attendance_excel(self):
        tool = get_tool_by_name("export_attendance_excel")
        assert tool is not None
        assert tool["is_export"] is True

    def test_tim_get_my_profile(self):
        tool = get_tool_by_name("get_my_profile")
        assert tool is not None
        assert tool["method"] == "GET"
        assert tool["path"] == "/api/users/profile"
        assert tool["is_write"] is False

    def test_tim_create_purchase_request(self):
        tool = get_tool_by_name("create_purchase_request")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        # Verify items param is array type
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "items" in body_params
        assert body_params["items"]["type"] == "array"
        assert body_params["items"]["required"] is True
        # Verify required employee fields
        assert body_params["employeeId"]["required"] is True
        assert body_params["maNhanVien"]["required"] is True

    def test_tim_list_products(self):
        tool = get_tool_by_name("list_products")
        assert tool is not None
        assert tool["method"] == "GET"
        assert tool["path"] == "/api/international-products"
        assert tool["category"] == "product"

    def test_tim_create_quotation_request(self):
        tool = get_tool_by_name("create_quotation_request")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        assert tool["required_roles"] == []
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "customerId" in body_params
        assert body_params["customerId"]["required"] is True
        assert "employeeId" in body_params
        assert "items" in body_params
        assert body_params["items"]["type"] == "array"

    def test_tim_create_quotation(self):
        tool = get_tool_by_name("create_quotation")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["path"] == "/api/quotations"
        assert tool["is_write"] is True
        assert tool["required_roles"] == ["ADMIN", "DEPARTMENT_HEAD"]
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert body_params["quotationRequestId"]["required"] is True
        assert body_params["items"]["type"] == "array"

    def test_tim_create_order_from_quotation(self):
        tool = get_tool_by_name("create_order_from_quotation")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["path"] == "/api/orders/from-quotation"
        assert tool["is_write"] is True
        assert tool["required_roles"] == ["ADMIN", "DEPARTMENT_HEAD"]
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert body_params["quotationId"]["required"] is True

    def test_tim_quotation_calculator_write_tools(self):
        upsert = get_tool_by_name("upsert_quotation_calculator")
        create = get_tool_by_name("create_quotation_from_calculator")
        assert upsert is not None
        assert upsert["method"] == "POST"
        assert upsert["path"] == "/api/quotation-calculators"
        assert upsert["category"] == "quotation"
        upsert_body = {p["name"]: p for p in upsert["body_params"]}
        assert upsert_body["quotationRequestId"]["required"] is True
        assert upsert_body["products"]["type"] == "array"
        assert create is not None
        assert create["path"] == "/api/quotation-calculators/quotation-request/{quotationRequestId}/create-quotation"
        path_params = {p["name"]: p for p in create["path_params"]}
        assert path_params["quotationRequestId"]["required"] is True

    def test_approve_leave_request_co_approvedBy(self):
        tool = get_tool_by_name("approve_leave_request")
        assert tool is not None
        assert tool["method"] == "PATCH"
        assert tool["is_write"] is True
        assert tool["path"] == "/api/leave-requests/{id}/approve"
        # path param id
        path_params = {p["name"]: p for p in tool["path_params"]}
        assert "id" in path_params
        # body param approvedBy
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "approvedBy" in body_params
        assert body_params["approvedBy"]["required"] is True

    def test_tim_create_task(self):
        tool = get_tool_by_name("create_task")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        assert tool["path"] == "/api/tasks"
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "nguoiNhan" in body_params
        assert body_params["nguoiNhan"]["required"] is True
        assert body_params["nguoiNhan"]["type"] == "array"
        assert "noiDung" in body_params
        assert "thoiHanHoanThanh" in body_params

    def test_tim_create_supplier(self):
        tool = get_tool_by_name("create_supplier")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        assert tool["path"] == "/api/suppliers"
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "tenNhaCungCap" in body_params
        assert body_params["tenNhaCungCap"]["required"] is True

    def test_tim_create_daily_work_report(self):
        tool = get_tool_by_name("create_daily_work_report")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        assert tool["path"] == "/api/daily-work-reports"
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "employeeId" in body_params
        assert "reportDate" in body_params
        assert "workDescription" in body_params

    def test_tim_create_repair_request(self):
        tool = get_tool_by_name("create_repair_request")
        assert tool is not None
        assert tool["method"] == "POST"
        assert tool["is_write"] is True
        assert tool["path"] == "/api/repair-requests"
        body_params = {p["name"]: p for p in tool["body_params"]}
        assert "tenHeThong" in body_params
        assert body_params["tenHeThong"]["required"] is True
        assert "noiDungLoi" in body_params
        assert "loaiLoi" in body_params

    def test_all_write_tools_have_body_params(self):
        """Tất cả write tools (trừ internal) phải có ít nhất 1 body_param."""
        tools = get_tools_for_role("ADMIN")
        for tool in tools:
            if tool["is_write"] and tool["method"] in ("POST", "PUT"):
                assert len(tool["body_params"]) > 0, (
                    f"Write tool '{tool['name']}' has no body_params"
                )


class TestToGroqTools:
    def test_format_dung_cau_truc_groq(self):
        tools = get_tools_for_role("ADMIN")
        groq_tools = to_groq_tools(tools)
        assert len(groq_tools) == len(tools)

        for gt in groq_tools:
            assert gt["type"] == "function"
            assert "function" in gt
            fn = gt["function"]
            assert "name" in fn
            assert "description" in fn
            assert "parameters" in fn
            params = fn["parameters"]
            assert params["type"] == "object"
            assert "properties" in params
            assert "required" in params

    def test_get_attendance_by_date_co_required_params(self):
        tool = get_tool_by_name("get_attendance_by_date")
        groq_tools = to_groq_tools([tool])
        fn = groq_tools[0]["function"]
        assert "startDate" in fn["parameters"]["required"]
        assert "endDate" in fn["parameters"]["required"]
        assert "startDate" in fn["parameters"]["properties"]
        assert "endDate" in fn["parameters"]["properties"]

    def test_list_leave_requests_khong_co_required(self):
        tool = get_tool_by_name("list_leave_requests")
        groq_tools = to_groq_tools([tool])
        fn = groq_tools[0]["function"]
        # Tất cả params đều optional
        assert fn["parameters"]["required"] == []

    def test_approve_leave_request_co_path_param_id(self):
        tool = get_tool_by_name("approve_leave_request")
        groq_tools = to_groq_tools([tool])
        fn = groq_tools[0]["function"]
        assert "id" in fn["parameters"]["properties"]
        assert "id" in fn["parameters"]["required"]

    def test_danh_sach_rong_tra_danh_sach_rong(self):
        result = to_groq_tools([])
        assert result == []

    def test_all_params_use_string_type(self):
        """Tất cả params phải dùng type=string để tránh Groq validation error."""
        tools = get_tools_for_role("ADMIN")
        groq_tools = to_groq_tools(tools)
        for gt in groq_tools:
            fn = gt["function"]
            for prop_name, prop_def in fn["parameters"]["properties"].items():
                assert prop_def["type"] == "string", (
                    f"Tool '{fn['name']}' param '{prop_name}' has type '{prop_def['type']}' "
                    f"but should be 'string' to avoid Groq validation errors"
                )

    def test_integer_params_declared_as_string(self):
        """Params có type=integer trong registry vẫn phải thành string trong Groq schema."""
        tool = get_tool_by_name("get_my_payroll")
        groq_tools = to_groq_tools([tool])
        fn = groq_tools[0]["function"]
        # month và year là integer trong registry nhưng string trong Groq schema
        assert fn["parameters"]["properties"]["month"]["type"] == "string"
        assert fn["parameters"]["properties"]["year"]["type"] == "string"
