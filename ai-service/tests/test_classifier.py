"""Tests for agent/classifier.py — intent-based tool filtering."""

import pytest
from agent.classifier import classify_intent, filter_tools_by_intent


class TestClassifyIntent:
    """Test keyword-based intent classification."""

    def test_attendance_keywords(self):
        cats = classify_intent("xem chấm công hôm nay")
        assert "attendance" in cats

    def test_leave_keywords(self):
        cats = classify_intent("tôi muốn xin nghỉ phép ngày mai")
        assert "leave" in cats
        assert "employee" in cats  # always included

    def test_customer_keywords(self):
        cats = classify_intent("danh sách khách hàng quốc tế")
        assert "customer" in cats

    def test_quotation_includes_related(self):
        """Quotation intent should also include customer + product."""
        cats = classify_intent("tạo yêu cầu báo giá")
        assert "quotation" in cats
        assert "customer" in cats
        assert "product" in cats

    def test_purchase_includes_supplier(self):
        cats = classify_intent("tạo yêu cầu mua hàng")
        assert "purchase" in cats
        assert "supplier" in cats

    def test_production_keywords(self):
        cats = classify_intent("báo cáo chất lượng sản phẩm sấy")
        assert "production" in cats

    def test_warehouse_keywords(self):
        cats = classify_intent("kiểm tra tồn kho")
        assert "warehouse" in cats

    def test_maintenance_keywords(self):
        cats = classify_intent("máy sấy bị hỏng cần sửa chữa")
        assert "maintenance" in cats

    def test_finance_keywords(self):
        cats = classify_intent("xem hóa đơn tháng này")
        assert "finance" in cats

    def test_payroll_keywords(self):
        cats = classify_intent("xem bảng lương tháng 5")
        assert "payroll" in cats

    def test_knowledge_keywords(self):
        cats = classify_intent("hướng dẫn tạo đơn hàng")
        assert "knowledge" in cats

    def test_task_keywords(self):
        cats = classify_intent("giao việc cho nhân viên")
        assert "task" in cats
        assert "employee" in cats  # related

    def test_no_match_returns_empty(self):
        """Unknown intent returns empty set → fallback to all tools."""
        cats = classify_intent("xin chào")
        assert cats == set()

    def test_multiple_intents(self):
        """Message with multiple keywords matches multiple categories."""
        cats = classify_intent("xem chấm công và đơn nghỉ phép")
        assert "attendance" in cats
        assert "leave" in cats

    def test_always_includes_employee_knowledge(self):
        """When any intent is matched, employee + knowledge are always included."""
        cats = classify_intent("xem hóa đơn")
        assert "employee" in cats
        assert "knowledge" in cats

    def test_supply_keywords(self):
        cats = classify_intent("yêu cầu cung ứng vật tư")
        assert "supply" in cats
        assert "supplier" in cats  # related

    def test_report_keywords(self):
        cats = classify_intent("báo cáo công việc hôm nay")
        assert "report" in cats

    def test_feedback_keywords(self):
        cats = classify_intent("khách hàng khiếu nại")
        assert "feedback" in cats
        assert "customer" in cats  # related


class TestFilterToolsByIntent:
    """Test tool filtering based on classified intent."""

    @pytest.fixture
    def sample_tools(self):
        return [
            {"name": "get_attendance", "category": "attendance"},
            {"name": "list_customers", "category": "customer"},
            {"name": "get_my_profile", "category": "employee"},
            {"name": "search_knowledge", "category": "knowledge"},
            {"name": "list_invoices", "category": "finance"},
            {"name": "create_leave_request", "category": "leave"},
            {"name": "list_products", "category": "product"},
            {"name": "create_quotation_request", "category": "quotation"},
        ]

    def test_filters_to_relevant_categories(self, sample_tools):
        result = filter_tools_by_intent(sample_tools, "xem chấm công")
        names = [t["name"] for t in result]
        assert "get_attendance" in names
        assert "get_my_profile" in names  # always included
        assert "search_knowledge" in names  # always included
        assert "list_invoices" not in names

    def test_fallback_returns_all_on_no_match(self, sample_tools):
        """When no intent detected, return all tools."""
        result = filter_tools_by_intent(sample_tools, "xin chào bạn")
        assert len(result) == len(sample_tools)

    def test_quotation_includes_customer_product(self, sample_tools):
        result = filter_tools_by_intent(sample_tools, "tạo báo giá")
        names = [t["name"] for t in result]
        assert "create_quotation_request" in names
        assert "list_customers" in names
        assert "list_products" in names

    def test_reduces_tool_count(self, sample_tools):
        """Filtered result should be smaller than full set."""
        result = filter_tools_by_intent(sample_tools, "xem lương")
        assert len(result) < len(sample_tools)

    def test_leave_intent(self, sample_tools):
        result = filter_tools_by_intent(sample_tools, "xin nghỉ phép")
        names = [t["name"] for t in result]
        assert "create_leave_request" in names
        assert "get_my_profile" in names
        assert "list_invoices" not in names
