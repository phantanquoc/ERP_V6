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
    "list_employees",
    "export_employees_excel",
}


class TestGetToolsForRole:
    def test_admin_nhan_tat_ca_tools(self):
        tools = get_tools_for_role("ADMIN")
        assert len(tools) == len(TOOLS) == 18

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
