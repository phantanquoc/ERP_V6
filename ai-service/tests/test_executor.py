"""Test agent/executor.py — ReAct loop with mocked Groq + httpx."""

import sys
import os
import json
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _make_groq_response(content: str = "", tool_calls=None):
    choice = MagicMock()
    choice.message.content = content
    choice.message.tool_calls = tool_calls or []
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _make_tool_call(name: str, arguments: dict, call_id: str = "call_1"):
    tc = MagicMock()
    tc.id = call_id
    tc.function.name = name
    tc.function.arguments = json.dumps(arguments)
    return tc


def _collect(gen) -> str:
    """Thu thập tất cả chunks từ generator thành string."""
    return "".join(list(gen))


# ─── Test helper functions (pure logic) ───────────────────────────────────────

class TestGetWeekRange:
    def test_thursday_returns_mon_to_sun(self):
        from agent.executor import _get_week_range
        mon, sun = _get_week_range("2026-05-14")
        assert mon == "2026-05-11"
        assert sun == "2026-05-17"

    def test_monday_returns_same_day_as_start(self):
        from agent.executor import _get_week_range
        mon, sun = _get_week_range("2026-05-11")
        assert mon == "2026-05-11"
        assert sun == "2026-05-17"

    def test_sunday_returns_same_week(self):
        from agent.executor import _get_week_range
        mon, sun = _get_week_range("2026-05-17")
        assert mon == "2026-05-11"
        assert sun == "2026-05-17"


class TestGetWeekdayName:
    def test_thursday(self):
        from agent.executor import _get_weekday_name
        assert _get_weekday_name("2026-05-14") == "Năm"

    def test_tuesday(self):
        from agent.executor import _get_weekday_name
        assert _get_weekday_name("2026-05-12") == "Ba"


class TestCoerceParams:
    def test_string_to_integer(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "month", "type": "integer"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, {"month": "5"})
        assert result["month"] == 5

    def test_string_to_number(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "amount", "type": "number"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, {"amount": "12.5"})
        assert result["amount"] == 12.5

    def test_already_correct_type(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "month", "type": "integer"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, {"month": 5})
        assert result["month"] == 5

    def test_invalid_integer_keeps_string(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "month", "type": "integer"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, {"month": "abc"})
        assert result["month"] == "abc"

    def test_none_params_returns_empty_dict(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "page", "type": "integer"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, None)
        assert result == {}

    def test_empty_dict_returns_empty_dict(self):
        from agent.executor import _coerce_params
        tool = {"query_params": [{"name": "page", "type": "integer"}], "path_params": [], "body_params": []}
        result = _coerce_params(tool, {})
        assert result == {}

    def test_string_to_array_valid_json(self):
        """JSON string → parsed list (e.g. items field from Groq)."""
        from agent.executor import _coerce_params
        tool = {"query_params": [], "path_params": [], "body_params": [
            {"name": "items", "type": "array"}
        ]}
        items_json = '[{"tenHangHoa": "Mít tươi", "soLuong": 500}]'
        result = _coerce_params(tool, {"items": items_json})
        assert isinstance(result["items"], list)
        assert result["items"][0]["tenHangHoa"] == "Mít tươi"
        assert result["items"][0]["soLuong"] == 500

    def test_string_to_array_invalid_json_splits_comma(self):
        """Invalid JSON string → split by comma into array."""
        from agent.executor import _coerce_params
        tool = {"query_params": [], "path_params": [], "body_params": [
            {"name": "items", "type": "array"}
        ]}
        result = _coerce_params(tool, {"items": "id1,id2,id3"})
        assert result["items"] == ["id1", "id2", "id3"]

    def test_string_to_array_single_value(self):
        """Single value string → array with one element."""
        from agent.executor import _coerce_params
        tool = {"query_params": [], "path_params": [], "body_params": [
            {"name": "items", "type": "array"}
        ]}
        result = _coerce_params(tool, {"items": "single_id"})
        assert result["items"] == ["single_id"]

    def test_array_already_list_unchanged(self):
        """Already a list → no conversion needed."""
        from agent.executor import _coerce_params
        tool = {"query_params": [], "path_params": [], "body_params": [
            {"name": "items", "type": "array"}
        ]}
        items = [{"tenHangHoa": "Mít tươi", "soLuong": 500}]
        result = _coerce_params(tool, {"items": items})
        assert result["items"] == items


class TestSlimResponse:
    def test_slim_employee_list(self):
        """Employee list → chỉ giữ fields quan trọng."""
        from agent.executor import _slim_response
        result = {
            "data": [
                {
                    "id": "uuid-1",
                    "userId": "user-1",
                    "employeeCode": "NV001",
                    "fullName": "Nguyễn Văn A",
                    "departmentName": "Kế toán",
                    "positionName": "Nhân viên",
                    "status": "active",
                    "email": "a@test.com",
                    "createdAt": "2024-01-01",
                    "updatedAt": "2024-06-01",
                    "positionId": "pos-1",
                    "positionLevelId": "lvl-1",
                    "subDepartmentId": None,
                    "user": {"firstName": "A", "lastName": "Nguyễn Văn", "email": "a@test.com"},
                    "position": {"name": "Nhân viên kế toán"},
                }
            ],
            "pagination": {"total": 1, "page": 1},
        }
        slimmed = _slim_response(result)
        assert "total" in slimmed
        assert len(slimmed["data"]) == 1
        item = slimmed["data"][0]
        # Giữ lại fields quan trọng
        assert item["fullName"] == "Nguyễn Văn A"
        assert item["employeeCode"] == "NV001"
        assert item["departmentName"] == "Kế toán"
        # Giữ id cho agent dùng, bỏ fields kỹ thuật khác
        assert "id" in item  # agent cần id để tạo task, leave request, etc.
        assert "userId" not in item
        assert "createdAt" not in item

    def test_slim_builds_fullname_from_user(self):
        """Nếu không có fullName nhưng có user.firstName/lastName → build fullName."""
        from agent.executor import _slim_response
        result = {
            "data": [
                {
                    "employeeCode": "NV002",
                    "status": "active",
                    "departmentName": "Kinh doanh",
                    "user": {"firstName": "Bình", "lastName": "Trần"},
                }
            ],
            "pagination": {"total": 1},
        }
        slimmed = _slim_response(result)
        assert slimmed["data"][0]["fullName"] == "Trần Bình"

    def test_slim_empty_data_returns_original(self):
        """data rỗng → trả nguyên."""
        from agent.executor import _slim_response
        result = {"data": [], "pagination": {"total": 0}}
        assert _slim_response(result) == result

    def test_slim_no_data_key_returns_original(self):
        """Không có key 'data' → trả nguyên."""
        from agent.executor import _slim_response
        result = {"success": True, "message": "OK"}
        assert _slim_response(result) == result

    def test_slim_non_dict_returns_original(self):
        """Input không phải dict → trả nguyên."""
        from agent.executor import _slim_response
        assert _slim_response("hello") == "hello"
        assert _slim_response(None) is None

    def test_slim_fallback_when_too_few_fields(self):
        """Khi slim chỉ có <3 fields → fallback giữ nhiều hơn nhưng bỏ heavy fields."""
        from agent.executor import _slim_response
        result = {
            "data": [
                {
                    "id": "uuid-1",
                    "userId": "user-1",
                    "createdAt": "2024-01-01",
                    "updatedAt": "2024-06-01",
                    "customField": "value",
                    "anotherField": 123,
                }
            ],
        }
        slimmed = _slim_response(result)
        item = slimmed["data"][0]
        assert "customField" in item
        assert "anotherField" in item
        assert "id" in item  # id giữ lại cho agent
        assert "userId" not in item
        assert "createdAt" not in item

    def test_slim_position_from_nested_object(self):
        """position.name → positionName."""
        from agent.executor import _slim_response
        result = {
            "data": [
                {
                    "employeeCode": "NV003",
                    "fullName": "Test",
                    "departmentName": "IT",
                    "status": "active",
                    "position": {"name": "Senior Dev", "id": "pos-1"},
                }
            ],
        }
        slimmed = _slim_response(result)
        assert slimmed["data"][0]["positionName"] == "Senior Dev"


class TestStripThinkTags:
    def test_removes_think_block(self):
        from agent.executor import _strip_think_tags
        text = "<think>User muốn xem chấm công hôm nay</think>Đây là kết quả chấm công."
        assert _strip_think_tags(text) == "Đây là kết quả chấm công."

    def test_removes_multiple_think_blocks(self):
        from agent.executor import _strip_think_tags
        text = "<think>Phân tích 1</think>Kết quả 1. <think>Phân tích 2</think>Kết quả 2."
        assert _strip_think_tags(text) == "Kết quả 1. Kết quả 2."

    def test_no_think_tags_returns_unchanged(self):
        from agent.executor import _strip_think_tags
        text = "Bạn muốn xem chấm công ngày nào?"
        assert _strip_think_tags(text) == text

    def test_empty_string(self):
        from agent.executor import _strip_think_tags
        assert _strip_think_tags("") == ""

    def test_multiline_think(self):
        from agent.executor import _strip_think_tags
        text = "<think>\nUser hỏi lương tháng 5.\nCần gọi get_my_payroll.\n</think>Lương tháng 5 của bạn là 12tr."
        assert _strip_think_tags(text) == "Lương tháng 5 của bạn là 12tr."


class TestBuildReactMessages:
    def test_includes_system_and_user(self):
        from agent.executor import _build_react_messages
        messages = _build_react_messages("xem chấm công", [], "2026-05-14")
        assert messages[0]["role"] == "system"
        assert "2026-05-14" in messages[0]["content"]
        assert messages[-1]["role"] == "user"
        assert messages[-1]["content"] == "xem chấm công"

    def test_system_has_date_info(self):
        from agent.executor import _build_react_messages
        messages = _build_react_messages("test", [], "2026-05-14")
        system = messages[0]["content"]
        assert "2026-05-11" in system  # Monday
        assert "2026-05-17" in system  # Sunday
        assert "2026-05-15" in system  # Tomorrow

    def test_history_included(self):
        from agent.executor import _build_react_messages
        h1 = MagicMock()
        h1.role = "user"
        h1.content = "previous question"
        messages = _build_react_messages("new question", [h1], "2026-05-14")
        contents = [m.get("content", "") for m in messages]
        assert "previous question" in contents


# ─── Test ReAct loop ──────────────────────────────────────────────────────────

class TestExecuteStreamReAct:
    def test_text_response_yields_directly(self):
        """Model trả text thuần → yield text, kết thúc."""
        groq_resp = _make_groq_response(content="Bạn muốn xem chấm công ngày nào?")

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Bạn muốn xem chấm công ngày nào?" in output

    def test_think_tags_stripped_from_text_response(self):
        """Model trả <think>...</think> kèm text → think bị strip."""
        groq_resp = _make_groq_response(
            content="<think>User hỏi chấm công nhưng không nói ngày nào, cần hỏi lại.</think>Bạn muốn xem chấm công ngày nào?"
        )

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Bạn muốn xem chấm công ngày nào?" in output
        assert "<think>" not in output
        assert "User hỏi chấm công" not in output

    def test_write_action_returns_confirm(self):
        """Write tool → yield confirm sentinel, không execute."""
        tc = _make_tool_call("create_leave_request", {
            "employeeId": "emp-123",
            "leaveType": "nghỉ phép năm",
            "startDate": "2026-05-15",
            "endDate": "2026-05-15",
            "reason": "việc gia đình",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("tạo đơn nghỉ phép", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_leave_request"

    def test_export_action_returns_url(self):
        """Export tool → yield export sentinel with URL."""
        tc = _make_tool_call("export_employees_excel", {})
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xuất excel nhân viên", [], "ADMIN", "jwt", "2026-05-14"))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "export"
        assert "url" in action

    def test_read_action_loops_then_answers(self):
        """Read tool → execute API → model sees result → yields final text."""
        # First call: model calls tool
        tc = _make_tool_call("list_notifications", {})
        first_resp = _make_groq_response(tool_calls=[tc])
        # Second call: model answers with text
        second_resp = _make_groq_response(content="Bạn không có thông báo nào.")

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": []}

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._http_client") as mock_http:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp]
            mock_http.get.return_value = mock_http_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("xem thông báo", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "không có thông báo" in output.lower()
        # Verify Groq was called twice (tool call + final answer)
        assert mock_client.chat.completions.create.call_count == 2

    def test_rag_tool_calls_knowledge_base(self):
        """search_knowledge tool → calls RAG pipeline."""
        tc = _make_tool_call("search_knowledge", {"query": "cách tạo YCBG"})
        first_resp = _make_groq_response(tool_calls=[tc])
        second_resp = _make_groq_response(content="Để tạo YCBG, vào menu Kinh doanh...")

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._call_rag_search") as mock_rag:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp]
            mock_rag.return_value = {"found": True, "results": [{"text": "Vào menu KD...", "source": "guide.md", "section": "YCBG"}]}

            from agent.executor import execute_stream
            output = _collect(execute_stream("hướng dẫn tạo YCBG", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "YCBG" in output or "Kinh doanh" in output
        mock_rag.assert_called_once()

    def test_multi_tool_chain(self):
        """Agent chains 2 tools before answering."""
        # First call: tool 1
        tc1 = _make_tool_call("get_my_payroll", {"month": 5, "year": 2026}, "call_1")
        first_resp = _make_groq_response(tool_calls=[tc1])
        # Second call: tool 2
        tc2 = _make_tool_call("search_knowledge", {"query": "cách đọc bảng lương"}, "call_2")
        second_resp = _make_groq_response(tool_calls=[tc2])
        # Third call: final answer
        third_resp = _make_groq_response(content="Lương tháng 5: 12tr. Cách đọc: ...")

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"luongCoBan": 12000000}}

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._http_client") as mock_http, \
             patch("agent.executor._call_rag_search") as mock_rag:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp, third_resp]
            mock_http.get.return_value = mock_http_resp
            mock_rag.return_value = {"found": True, "results": [{"text": "Bảng lương gồm...", "source": "hr.md", "section": "Lương"}]}

            from agent.executor import execute_stream
            output = _collect(execute_stream("xem lương tháng này và hướng dẫn đọc", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "12tr" in output or "Lương" in output
        assert mock_client.chat.completions.create.call_count == 3

    def test_groq_error_yields_error_message(self):
        """Groq API exception → yield friendly error."""
        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Rate limit")
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))
        assert "thử lại" in output.lower()

    def test_no_client_yields_config_error(self):
        """_openrouter_client is None → yield config error."""
        with patch("agent.executor._openrouter_client", None):
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))
        assert "OPENROUTER_API_KEY" in output


class TestPurchaseRequestFlow:
    """Test create_purchase_request write action with array items."""

    def test_create_purchase_request_returns_confirm(self):
        """create_purchase_request (is_write) → yield confirm with items array."""
        items_json = json.dumps([
            {"phanLoai": "Nguyên liệu", "tenHangHoa": "Mít tươi", "soLuong": "500", "donViTinh": "kg", "giaDuKien": "25000"}
        ])
        tc = _make_tool_call("create_purchase_request", {
            "employeeId": "emp-123",
            "maNhanVien": "NV001",
            "tenNhanVien": "Nguyễn Văn A",
            "mucDichYeuCau": "Mua nguyên liệu sản xuất mít sấy",
            "mucDoUuTien": "Cao",
            "ghiChu": "",
            "items": items_json,
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("tạo yêu cầu mua 500kg mít tươi", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_purchase_request"
        # items should be coerced to list
        assert isinstance(action["params"]["items"], list)
        assert action["params"]["items"][0]["tenHangHoa"] == "Mít tươi"

    def test_get_my_profile_then_create_purchase_request(self):
        """Agent chains: get_my_profile → create_purchase_request (confirm)."""
        # First call: agent calls get_my_profile
        tc1 = _make_tool_call("get_my_profile", {}, "call_1")
        first_resp = _make_groq_response(tool_calls=[tc1])

        # Second call: agent calls create_purchase_request with profile info
        items_json = json.dumps([{"phanLoai": "Nguyên liệu", "tenHangHoa": "Mít tươi", "soLuong": "500", "donViTinh": "kg", "giaDuKien": "25000"}])
        tc2 = _make_tool_call("create_purchase_request", {
            "employeeId": "emp-456",
            "maNhanVien": "NV002",
            "tenNhanVien": "Trần Văn B",
            "mucDichYeuCau": "Mua nguyên liệu",
            "mucDoUuTien": "Trung bình",
            "ghiChu": "",
            "items": items_json,
        }, "call_2")
        second_resp = _make_groq_response(tool_calls=[tc2])

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {
            "data": {
                "id": "emp-456",
                "employeeCode": "NV002",
                "fullName": "Trần Văn B",
                "departmentName": "Sản xuất",
            }
        }

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._http_client") as mock_http:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp]
            mock_http.get.return_value = mock_http_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("tạo yêu cầu mua 500kg mít tươi", [], "EMPLOYEE", "jwt", "2026-05-14"))

        # Should return confirm (not execute)
        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_purchase_request"
        # Verify get_my_profile was called first
        assert mock_client.chat.completions.create.call_count == 2


class TestRetryWithBackoff:
    def test_retries_on_rate_limit_then_succeeds(self):
        """Transient 429 error → retry → succeed on 2nd attempt."""
        groq_resp = _make_groq_response(content="OK")

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor.time.sleep"):  # skip actual sleep
            mock_client.chat.completions.create.side_effect = [
                Exception("429 Rate limit exceeded"),
                groq_resp,
            ]
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "OK" in output
        assert mock_client.chat.completions.create.call_count == 2

    def test_non_transient_error_no_retry(self):
        """Non-transient error (e.g. invalid request) → no retry, fail immediately."""
        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Invalid model specified")
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert mock_client.chat.completions.create.call_count == 1
        assert "thử lại" in output.lower()

    def test_max_retries_exhausted(self):
        """All retries fail → yield friendly error."""
        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor.time.sleep"):
            mock_client.chat.completions.create.side_effect = Exception("503 Service Unavailable")
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))

        # 1 initial + 2 retries = 3 calls
        assert mock_client.chat.completions.create.call_count == 3
        assert "quá tải" in output.lower() or "thử lại" in output.lower()


class TestFriendlyError:
    def test_rate_limit(self):
        from agent.executor import _friendly_error
        assert "bận" in _friendly_error(Exception("429 rate limit"))

    def test_timeout(self):
        from agent.executor import _friendly_error
        assert "thời gian" in _friendly_error(Exception("timeout"))

    def test_unauthorized(self):
        from agent.executor import _friendly_error
        assert "đăng nhập" in _friendly_error(Exception("401 unauthorized"))

    def test_generic(self):
        from agent.executor import _friendly_error
        assert "thử lại" in _friendly_error(Exception("something weird"))


class TestExecuteConfirmed:
    def test_success(self):
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "new-123"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp

            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_leave_request", {"lyDo": "test"}, "jwt"))

        assert "thành công" in output.lower()

    def test_invalid_tool(self):
        from agent.executor import execute_confirmed
        output = _collect(execute_confirmed("nonexistent", {}, "jwt"))
        assert "Lỗi" in output


class TestLLMFallbackChain:
    """Test OpenRouter LLM with retry."""

    def test_openrouter_success(self):
        """OpenRouter responds OK."""
        resp = _make_groq_response(content="OpenRouter OK")
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = resp

        with patch("agent.executor._openrouter_client", new=mock_client):
            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "OpenRouter OK" in output

    def test_openrouter_transient_error_retries(self):
        """OpenRouter 429 → retries and succeeds."""
        resp = _make_groq_response(content="Retry OK")
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = [
            Exception("429 Rate limit"),
            resp,
        ]

        with patch("agent.executor._openrouter_client", new=mock_client), \
             patch("agent.executor.time.sleep"):
            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Retry OK" in output
        assert mock_client.chat.completions.create.call_count == 2

    def test_openrouter_all_retries_fail(self):
        """OpenRouter fails all retries → friendly error."""
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("429 Rate limit")

        with patch("agent.executor._openrouter_client", new=mock_client), \
             patch("agent.executor.time.sleep"):
            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "bận" in output.lower() or "thử lại" in output.lower()

    def test_no_client_yields_config_error(self):
        """No client configured → config error."""
        with patch("agent.executor._openrouter_client", new=None):
            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "OPENROUTER_API_KEY" in output


class TestApproveLeaveRequestFlow:
    """Test approve_leave_request write action with path + body params."""

    def test_approve_returns_confirm_with_approvedBy(self):
        """approve_leave_request (is_write) → yield confirm with id + approvedBy."""
        tc = _make_tool_call("approve_leave_request", {
            "id": "leave-req-123",
            "approvedBy": "user-456",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("duyệt đơn nghỉ phép", [], "DEPARTMENT_HEAD", "jwt", "2026-05-14"))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "approve_leave_request"
        assert action["params"]["id"] == "leave-req-123"
        assert action["params"]["approvedBy"] == "user-456"

    def test_approve_confirmed_calls_patch(self):
        """execute_confirmed for approve_leave_request → PATCH with path param."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "leave-req-123", "status": "APPROVED"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.patch.return_value = mock_http_resp

            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed(
                "approve_leave_request",
                {"id": "leave-req-123", "approvedBy": "user-456"},
                "jwt",
            ))

        assert "thành công" in output.lower()
        # Verify PATCH was called with correct URL (id in path)
        mock_client.patch.assert_called_once()
        call_args = mock_client.patch.call_args
        assert "leave-req-123" in call_args[0][0]  # URL contains the id


class TestCreateTaskFlow:
    """Test create_task write action."""

    def test_create_task_returns_confirm(self):
        """create_task (is_write) → yield confirm."""
        tc = _make_tool_call("create_task", {
            "nguoiNhan": '["user-002"]',
            "noiDung": "Kiểm tra chất lượng mít sấy",
            "thoiHanHoanThanh": "2026-05-20",
            "mucDoUuTien": "CAO",
            "ghiChu": "",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("tạo nhiệm vụ kiểm tra chất lượng", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_task"
        assert action["params"]["noiDung"] == "Kiểm tra chất lượng mít sấy"


# ─── Test Friendly Confirm Messages ──────────────────────────────────────────

class TestBuildConfirmMessage:
    """Test _build_confirm_message friendly messages and display_exclude."""

    def test_leave_request_friendly_message(self):
        """create_leave_request → friendly Vietnamese confirm message."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("create_leave_request")
        params = {
            "employeeId": "emp-123",
            "leaveType": "ANNUAL",
            "startDate": "2026-05-19",
            "endDate": "2026-05-20",
            "reason": "Đi du lịch",
        }
        msg = _build_confirm_message(tool, params)
        assert "tạo đơn xin nghỉ phép" in msg
        assert "Bạn xác nhận thực hiện không?" in msg
        # employeeId should be excluded from display
        assert "employeeId" not in msg.split("__AGENT_ACTION__")[0]
        # But actual params should show
        assert "ANNUAL" in msg
        assert "Đi du lịch" in msg

    def test_create_task_friendly_message(self):
        """create_task → 'giao nhiệm vụ' in confirm."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("create_task")
        params = {
            "nguoiNhan": ["user-002"],
            "noiDung": "Kiểm tra chất lượng",
            "thoiHanHoanThanh": "2026-05-20",
        }
        msg = _build_confirm_message(tool, params)
        assert "giao nhiệm vụ" in msg
        assert "Kiểm tra chất lượng" in msg

    def test_create_supplier_friendly_message(self):
        """create_supplier → 'thêm nhà cung cấp mới'."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("create_supplier")
        params = {
            "tenNhaCungCap": "Công ty ABC",
            "soDienThoai": "0901234567",
        }
        msg = _build_confirm_message(tool, params)
        assert "thêm nhà cung cấp mới" in msg
        assert "Công ty ABC" in msg

    def test_display_exclude_hides_internal_params(self):
        """Internal params (employeeId, maNhanVien, etc.) hidden from display."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("create_purchase_request")
        params = {
            "employeeId": "emp-123",
            "maNhanVien": "NV001",
            "tenNhanVien": "Nguyễn Văn A",
            "mucDichYeuCau": "Mua nguyên liệu",
            "mucDoUuTien": "Cao",
            "items": [{"tenHangHoa": "Mít", "soLuong": 100}],
        }
        msg = _build_confirm_message(tool, params)
        display_part = msg.split("__AGENT_ACTION__")[0]
        assert "employeeId" not in display_part
        assert "maNhanVien" not in display_part
        assert "tenNhanVien" not in display_part
        # But visible params should show
        assert "Mua nguyên liệu" in display_part

    def test_approve_leave_hides_approvedBy(self):
        """approvedBy hidden from display in approve_leave_request."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("approve_leave_request")
        params = {"id": "leave-123", "approvedBy": "user-456"}
        msg = _build_confirm_message(tool, params)
        display_part = msg.split("__AGENT_ACTION__")[0]
        assert "approvedBy" not in display_part
        assert "duyệt đơn nghỉ phép" in msg

    def test_action_json_contains_all_params(self):
        """__AGENT_ACTION__ JSON still contains ALL params (including hidden ones)."""
        from agent.executor import _build_confirm_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("create_leave_request")
        params = {
            "employeeId": "emp-123",
            "leaveType": "SICK",
            "startDate": "2026-05-19",
            "endDate": "2026-05-19",
            "reason": "Ốm",
        }
        msg = _build_confirm_message(tool, params)
        action_json = msg.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        # All params preserved in action for execution
        assert action["params"]["employeeId"] == "emp-123"
        assert action["params"]["leaveType"] == "SICK"


# ─── Test Execute Confirmed (multiple tools) ─────────────────────────────────

class TestExecuteConfirmedMultipleTools:
    """Test execute_confirmed for various write tools."""

    def test_create_task_success(self):
        """create_task confirmed → friendly success message."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "task-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_task", {
                "nguoiNhan": ["user-002"],
                "noiDung": "Test task",
                "thoiHanHoanThanh": "2026-05-20",
            }, "jwt"))

        assert "Nhiệm vụ đã được giao thành công" in output
        assert "🎉" in output

    def test_create_supplier_success(self):
        """create_supplier confirmed → friendly success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "sup-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_supplier", {
                "tenNhaCungCap": "Công ty XYZ",
            }, "jwt"))

        assert "Nhà cung cấp mới đã được thêm thành công" in output

    def test_create_customer_success(self):
        """create_customer confirmed → friendly success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "cust-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_customer", {
                "tenKhachHang": "Khách hàng ABC",
            }, "jwt"))

        assert "Khách hàng mới đã được thêm thành công" in output

    def test_create_quotation_request_success(self):
        """create_quotation_request confirmed → friendly success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "quot-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_quotation_request", {
                "customerId": "cust-1",
                "employeeId": "emp-1",
                "items": [{"productId": "prod-1", "quantity": 10}],
            }, "jwt"))

        assert "Yêu cầu báo giá đã được tạo thành công" in output

    def test_create_repair_request_success(self):
        """create_repair_request confirmed → friendly success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "rep-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_repair_request", {
                "tenHeThong": "Máy sấy #3",
                "noiDungLoi": "Không hoạt động",
                "loaiLoi": "Cơ khí",
            }, "jwt"))

        assert "Yêu cầu sửa chữa đã được tạo thành công" in output

    def test_create_daily_work_report_success(self):
        """create_daily_work_report confirmed → friendly success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "rpt-new"}}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_daily_work_report", {
                "employeeId": "emp-1",
                "reportDate": "2026-05-14",
                "workDescription": "Kiểm tra chất lượng",
            }, "jwt"))

        assert "Báo cáo công việc đã được ghi nhận" in output

    def test_confirmed_api_error_yields_friendly_message(self):
        """API returns error → friendly error message (not technical)."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 500
        mock_http_resp.text = "Internal Server Error"
        mock_http_resp.json.return_value = {"success": False, "error": "API error 500: Internal Server Error"}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_task", {
                "nguoiNhan": ["user-1"],
                "noiDung": "Test",
            }, "jwt"))

        assert "😔" in output
        assert "thử lại" in output.lower()
        # Should NOT show technical error details
        assert "500" not in output
        assert "Internal Server Error" not in output

    def test_confirmed_unknown_tool_yields_error(self):
        """Unknown tool name → error message."""
        from agent.executor import execute_confirmed
        output = _collect(execute_confirmed("nonexistent_tool", {}, "jwt"))
        assert "Lỗi" in output
        assert "nonexistent_tool" in output

    def test_confirmed_no_success_key_treated_as_failure(self):
        """API returns dict without 'success' key → treated as failure (C1 fix)."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        # No 'success' key — old code defaulted to True (bug), new code treats as failure
        mock_http_resp.json.return_value = {"error": "Something went wrong"}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_task", {
                "nguoiNhan": ["user-1"],
                "noiDung": "Test",
            }, "jwt"))

        # Should NOT say "thành công" (success) — error message may say "không thành công"
        assert "😔" in output or "thử lại" in output.lower()

    def test_confirmed_success_false_yields_error(self):
        """API returns success=False → error message, not success."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 400
        mock_http_resp.json.return_value = {"success": False, "message": "Validation failed"}

        with patch("agent.executor._http_client") as mock_client:
            mock_client.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed("create_leave_request", {
                "leaveType": "ANNUAL",
                "startDate": "2026-05-19",
                "endDate": "2026-05-19",
                "reason": "Test",
            }, "jwt"))

        assert "😔" in output or "thử lại" in output.lower()


# ─── Test Build Export Message ────────────────────────────────────────────────

class TestBuildExportMessage:
    """Test _build_export_message generates correct download URL."""

    def test_export_attendance_excel(self):
        """export_attendance_excel → correct URL with query params."""
        from agent.executor import _build_export_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("export_attendance_excel")
        params = {"startDate": "2026-05-01", "endDate": "2026-05-31"}
        msg = _build_export_message(tool, params, "2026-05-14")
        assert "__AGENT_ACTION__" in msg
        action_json = msg.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "export"
        assert "startDate=2026-05-01" in action["url"]
        assert "endDate=2026-05-31" in action["url"]
        assert action["filename"].endswith(".xlsx")

    def test_export_employees_excel(self):
        """export_employees_excel → correct URL."""
        from agent.executor import _build_export_message
        from agent.registry import get_tool_by_name
        tool = get_tool_by_name("export_employees_excel")
        params = {}
        msg = _build_export_message(tool, params, "2026-05-14")
        action_json = msg.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "export"
        assert "export_employees_excel" in action["filename"]


# ─── Test Multi-Step Chaining ─────────────────────────────────────────────────

class TestMultiStepChaining:
    """Test execute_confirmed with context resumes ReAct loop for chaining."""

    def test_confirm_action_includes_context(self):
        """Write action confirm includes context for chaining."""
        tc = _make_tool_call("create_customer", {
            "tenKhachHang": "Khách hàng mới",
            "soDienThoai": "0901234567",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                "tạo báo giá cho khách hàng mới ABC sản phẩm XYZ",
                [], "EMPLOYEE", "jwt", "2026-05-14"
            ))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        # Context should be present for chaining
        assert action["context"] is not None
        assert action["context"]["message"] == "tạo báo giá cho khách hàng mới ABC sản phẩm XYZ"
        assert action["context"]["role"] == "EMPLOYEE"
        assert action["context"]["today"] == "2026-05-14"

    def test_confirmed_with_context_resumes_loop(self):
        """execute_confirmed with context → resumes ReAct loop → yields next action."""
        # Step 1: create_customer succeeds
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "cust-new-123", "tenKhachHang": "ABC"}}

        # Step 2: resumed loop → agent calls create_product (another write)
        tc = _make_tool_call("create_product", {
            "tenSanPham": "Sản phẩm XYZ",
            "giaBan": "50000",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._http_client") as mock_http, \
             patch("agent.executor._openrouter_client") as mock_groq:
            mock_http.post.return_value = mock_http_resp
            mock_groq.chat.completions.create.return_value = groq_resp

            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed(
                "create_customer",
                {"tenKhachHang": "ABC", "soDienThoai": "0901234567"},
                "jwt",
                "req-1",
                confirm_context={
                    "message": "tạo báo giá cho khách hàng mới ABC sản phẩm XYZ",
                    "role": "EMPLOYEE",
                    "department": "",
                    "today": "2026-05-14",
                },
            ))

        # Should contain success for step 1
        assert "Khách hàng mới đã được thêm thành công" in output
        # Should also contain next confirm (step 2)
        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_product"

    def test_confirmed_without_context_no_resume(self):
        """execute_confirmed without context → just returns success, no resume."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "cust-1"}}

        with patch("agent.executor._http_client") as mock_http:
            mock_http.post.return_value = mock_http_resp
            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed(
                "create_customer",
                {"tenKhachHang": "Test"},
                "jwt",
            ))

        assert "thành công" in output.lower()
        # No chaining — no __AGENT_ACTION__
        assert "__AGENT_ACTION__" not in output

    def test_confirmed_chain_final_text_response(self):
        """Chaining ends when agent returns text (no more writes)."""
        # Step 1: create_customer succeeds
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "cust-new"}}

        # Resumed loop: agent returns final text (done, no more writes)
        groq_resp = _make_groq_response(content="Đã tạo xong khách hàng ABC. Bạn cần gì thêm không?")

        with patch("agent.executor._http_client") as mock_http, \
             patch("agent.executor._openrouter_client") as mock_groq:
            mock_http.post.return_value = mock_http_resp
            mock_groq.chat.completions.create.return_value = groq_resp

            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed(
                "create_customer",
                {"tenKhachHang": "ABC"},
                "jwt",
                "req-1",
                confirm_context={
                    "message": "tạo khách hàng ABC",
                    "role": "EMPLOYEE",
                    "department": "",
                    "today": "2026-05-14",
                },
            ))

        # Success message + final text from agent
        assert "thành công" in output.lower()
        assert "Bạn cần gì thêm không?" in output


# ─── Test H1: Malformed JSON tool arguments ───────────────────────────────────

class TestMalformedToolArguments:
    """H1: json.loads wrapped in try/except for malformed LLM output."""

    def test_malformed_json_args_does_not_crash(self):
        """LLM returns malformed JSON in tool arguments → agent recovers gracefully."""
        tc = MagicMock()
        tc.id = "call_bad"
        tc.function.name = "list_notifications"
        tc.function.arguments = "{invalid json here"  # malformed

        first_resp = _make_groq_response(tool_calls=[tc])
        second_resp = _make_groq_response(content="Xin lỗi, không thể xử lý yêu cầu.")

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": []}

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._http_client") as mock_http:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp]
            mock_http.get.return_value = mock_http_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("xem thông báo", [], "EMPLOYEE", "jwt", "2026-05-14"))

        # Should not raise, should produce some output
        assert output != ""

    def test_empty_tool_arguments_uses_empty_dict(self):
        """Empty tool arguments string → treated as empty dict, not crash."""
        tc = MagicMock()
        tc.id = "call_empty"
        tc.function.name = "list_notifications"
        tc.function.arguments = ""  # empty

        first_resp = _make_groq_response(tool_calls=[tc])
        second_resp = _make_groq_response(content="Không có thông báo.")

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": []}

        with patch("agent.executor._openrouter_client") as mock_client, \
             patch("agent.executor._http_client") as mock_http:
            mock_client.chat.completions.create.side_effect = [first_resp, second_resp]
            mock_http.get.return_value = mock_http_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("xem thông báo", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "thông báo" in output.lower()


# ─── Test H2: _extract_employee_names scans user messages ────────────────────

class TestExtractEmployeeNames:
    """H2: _extract_employee_names should scan both tool and user messages."""

    def test_extracts_from_tool_messages(self):
        from agent.executor import _extract_employee_names
        messages = [
            {
                "role": "tool",
                "content": json.dumps({
                    "data": [
                        {"id": "emp-001", "fullName": "Nguyễn Văn A"},
                        {"id": "emp-002", "fullName": "Trần Thị B"},
                    ]
                })
            }
        ]
        names = _extract_employee_names(messages)
        assert names["emp-001"] == "Nguyễn Văn A"
        assert names["emp-002"] == "Trần Thị B"

    def test_extracts_from_user_messages(self):
        """H2 fix: user messages with JSON data also scanned."""
        from agent.executor import _extract_employee_names
        messages = [
            {
                "role": "user",
                "content": json.dumps({
                    "data": [
                        {"id": "emp-003", "fullName": "Lê Văn C"},
                    ]
                })
            }
        ]
        names = _extract_employee_names(messages)
        assert names["emp-003"] == "Lê Văn C"

    def test_skips_assistant_messages(self):
        """assistant messages are not scanned."""
        from agent.executor import _extract_employee_names
        messages = [
            {
                "role": "assistant",
                "content": json.dumps({
                    "data": [{"id": "emp-999", "fullName": "Should Not Appear"}]
                })
            }
        ]
        names = _extract_employee_names(messages)
        assert "emp-999" not in names

    def test_handles_non_json_content_gracefully(self):
        from agent.executor import _extract_employee_names
        messages = [
            {"role": "tool", "content": "not json at all"},
            {"role": "user", "content": "xem danh sách nhân viên"},
        ]
        names = _extract_employee_names(messages)
        assert names == {}

    def test_empty_messages(self):
        from agent.executor import _extract_employee_names
        assert _extract_employee_names([]) == {}


# ─── Test L2: think tags stripped before history append ──────────────────────

class TestThinkTagsNotInHistory:
    """L2: <think> tags should not appear in messages appended to history."""

    def test_text_response_no_think_in_output(self):
        """Final text response should never contain <think> tags."""
        resp = _make_groq_response(
            content="<think>Phân tích câu hỏi...</think>Chấm công hôm nay của bạn: 08:00 - 17:00."
        )
        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.return_value = resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "<think>" not in output
        assert "Chấm công hôm nay" in output

    def test_think_only_response_retries(self):
        """Model returns only <think> (stripped to empty) → retries, not yields empty."""
        think_only = _make_groq_response(content="<think>Đang suy nghĩ...</think>")
        final_resp = _make_groq_response(content="Đây là câu trả lời.")

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.side_effect = [think_only, final_resp]
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Đây là câu trả lời." in output
        assert "<think>" not in output
        assert mock_client.chat.completions.create.call_count == 2

    def test_stalling_response_retries_without_think(self):
        """Stalling response with <think> → retry, output has no <think>."""
        stalling = _make_groq_response(
            content="<think>Cần gọi tool</think>Để tôi kiểm tra cho bạn."
        )
        final_resp = _make_groq_response(content="Đây là kết quả.")

        with patch("agent.executor._openrouter_client") as mock_client:
            mock_client.chat.completions.create.side_effect = [stalling, final_resp]
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "<think>" not in output
        assert "Đây là kết quả." in output


