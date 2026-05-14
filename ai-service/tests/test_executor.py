"""Test agent/executor.py — mock Groq và httpx."""

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


def _make_tool_call(name: str, arguments: dict):
    tc = MagicMock()
    tc.function.name = name
    tc.function.arguments = json.dumps(arguments)
    return tc


def _collect(gen) -> str:
    """Thu thập tất cả chunks từ generator thành string."""
    return "".join(list(gen))


class TestFormatApiResult:
    def test_list_data_hien_thi_so_ket_qua(self):
        from agent.executor import _format_api_result
        data = {"success": True, "data": [{"id": 1}, {"id": 2}]}
        result = _format_api_result("get_attendance_by_date", data)
        assert "2" in result
        assert "Tìm thấy" in result

    def test_list_rong_tra_khong_co_du_lieu(self):
        from agent.executor import _format_api_result
        data = {"success": True, "data": []}
        result = _format_api_result("get_attendance_by_date", data)
        assert "Không có dữ liệu" in result

    def test_list_nhieu_hon_5_co_suffix(self):
        from agent.executor import _format_api_result
        items = [{"id": i} for i in range(8)]
        data = {"success": True, "data": items}
        result = _format_api_result("list_orders", data)
        assert "3 mục khác" in result

    def test_dict_data_tra_json_block(self):
        from agent.executor import _format_api_result
        data = {"success": True, "data": {"id": "abc", "name": "Test"}}
        result = _format_api_result("get_order_detail", data)
        assert "```json" in result
        assert "abc" in result

    def test_error_response_tra_thong_bao_loi(self):
        from agent.executor import _format_api_result
        data = {"success": False, "error": "Not found"}
        result = _format_api_result("get_order_detail", data)
        assert "Lỗi" in result
        assert "Not found" in result

    def test_data_la_string_tra_string(self):
        from agent.executor import _format_api_result
        data = {"data": "simple string"}
        result = _format_api_result("any_tool", data)
        assert result == "simple string"


class TestExecuteStream:
    def test_write_action_tra_confirm_sentinel(self):
        """create_leave_request (is_write=True) → phải yield __AGENT_ACTION__ confirm."""
        tool_call = _make_tool_call("create_leave_request", {
            "loaiNghiPhep": "nghỉ phép năm",
            "ngayBatDau": "2026-05-20",
            "ngayKetThuc": "2026-05-21",
            "lyDo": "Nghỉ mát",
        })
        groq_resp = _make_groq_response(tool_calls=[tool_call])

        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="tạo đơn nghỉ phép ngày mai",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))

        assert "__AGENT_ACTION__" in output
        # Parse action JSON từ output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "confirm"
        assert action["tool"] == "create_leave_request"

    def test_export_action_tra_export_sentinel(self):
        """export_attendance_excel (is_export=True) → phải yield __AGENT_ACTION__ export với URL."""
        tool_call = _make_tool_call("export_attendance_excel", {
            "startDate": "2026-05-01",
            "endDate": "2026-05-14",
        })
        groq_resp = _make_groq_response(tool_calls=[tool_call])

        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="xuất excel chấm công tháng này",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))

        assert "__AGENT_ACTION__" in output
        action_json = output.split("__AGENT_ACTION__\n")[1].strip()
        action = json.loads(action_json)
        assert action["type"] == "export"
        assert action["tool"] == "export_attendance_excel"
        assert "url" in action
        assert action["url"] != ""

    def test_read_action_goi_backend_api(self):
        """get_attendance_by_date (read) → gọi backend API và yield kết quả."""
        tool_call = _make_tool_call("get_attendance_by_date", {
            "startDate": "2026-05-01",
            "endDate": "2026-05-14",
        })
        groq_resp = _make_groq_response(tool_calls=[tool_call])

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {
            "success": True,
            "data": [{"date": "2026-05-01", "status": "present"}],
        }

        with patch("agent.executor._client") as mock_client, \
             patch("agent.executor.httpx.Client") as mock_httpx:
            mock_client.chat.completions.create.return_value = groq_resp
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.get.return_value = mock_http_resp
            mock_httpx.return_value = mock_ctx

            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="xem chấm công tuần này",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))

        assert "__AGENT_ACTION__" not in output
        assert "Tìm thấy" in output or "```json" in output

    def test_backend_api_500_tra_thong_bao_loi(self):
        """Backend trả 500 → executor yield thông báo lỗi."""
        tool_call = _make_tool_call("get_attendance_by_date", {
            "startDate": "2026-05-01",
            "endDate": "2026-05-14",
        })
        groq_resp = _make_groq_response(tool_calls=[tool_call])

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 500
        mock_http_resp.text = "Internal Server Error"

        with patch("agent.executor._client") as mock_client, \
             patch("agent.executor.httpx.Client") as mock_httpx:
            mock_client.chat.completions.create.return_value = groq_resp
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.get.return_value = mock_http_resp
            mock_httpx.return_value = mock_ctx

            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="xem chấm công",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))

        assert "Lỗi" in output or "500" in output

    def test_groq_loi_tra_thong_bao_loi(self):
        """Groq API ném exception → yield thông báo lỗi."""
        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Connection refused")
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="xem chấm công",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))
        assert "Lỗi" in output

    def test_client_none_tra_loi_cau_hinh(self):
        """Khi _client là None → yield lỗi cấu hình."""
        with patch("agent.executor._client", None):
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="test",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))
        assert "GROQ_API_KEY" in output or "Lỗi" in output

    def test_model_tra_text_khong_tool_call(self):
        """Model trả text thuần (hỏi thêm thông tin) → yield text đó."""
        groq_resp = _make_groq_response(content="Bạn muốn xem chấm công từ ngày nào?")

        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream(
                message="xem chấm công",
                history=[],
                role="EMPLOYEE",
                jwt_token="test-jwt",
                today="2026-05-14",
            ))
        assert "Bạn muốn xem chấm công từ ngày nào?" in output


class TestExecuteConfirmed:
    def test_confirmed_write_thanh_cong(self):
        """execute_confirmed với tool hợp lệ và API trả 200."""
        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"success": True, "data": {"id": "new-123"}}

        with patch("agent.executor.httpx.Client") as mock_httpx:
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=mock_ctx)
            mock_ctx.__exit__ = MagicMock(return_value=False)
            mock_ctx.post.return_value = mock_http_resp
            mock_httpx.return_value = mock_ctx

            from agent.executor import execute_confirmed
            output = _collect(execute_confirmed(
                tool_name="create_leave_request",
                params={
                    "loaiNghiPhep": "nghỉ phép năm",
                    "ngayBatDau": "2026-05-20",
                    "ngayKetThuc": "2026-05-21",
                    "lyDo": "Nghỉ mát",
                },
                jwt_token="test-jwt",
            ))

        assert "thành công" in output.lower() or "new-123" in output

    def test_confirmed_tool_khong_ton_tai(self):
        """execute_confirmed với tool name không tồn tại → yield lỗi."""
        from agent.executor import execute_confirmed
        output = _collect(execute_confirmed(
            tool_name="nonexistent_tool",
            params={},
            jwt_token="test-jwt",
        ))
        assert "Lỗi" in output or "không tìm thấy" in output.lower()
