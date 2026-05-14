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

        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Bạn muốn xem chấm công ngày nào?" in output

    def test_think_tags_stripped_from_text_response(self):
        """Model trả <think>...</think> kèm text → think bị strip."""
        groq_resp = _make_groq_response(
            content="<think>User hỏi chấm công nhưng không nói ngày nào, cần hỏi lại.</think>Bạn muốn xem chấm công ngày nào?"
        )

        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.return_value = groq_resp
            from agent.executor import execute_stream
            output = _collect(execute_stream("xem chấm công", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "Bạn muốn xem chấm công ngày nào?" in output
        assert "<think>" not in output
        assert "User hỏi chấm công" not in output

    def test_write_action_returns_confirm(self):
        """Write tool → yield confirm sentinel, không execute."""
        tc = _make_tool_call("create_leave_request", {
            "loaiNghiPhep": "nghỉ phép năm",
            "ngayBatDau": "2026-05-15",
            "ngayKetThuc": "2026-05-15",
            "lyDo": "việc gia đình",
        })
        groq_resp = _make_groq_response(tool_calls=[tc])

        with patch("agent.executor._client") as mock_client:
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

        with patch("agent.executor._client") as mock_client:
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

        with patch("agent.executor._client") as mock_client, \
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

        with patch("agent.executor._client") as mock_client, \
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

        with patch("agent.executor._client") as mock_client, \
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
        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Rate limit")
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))
        assert "thử lại" in output.lower()

    def test_no_client_yields_config_error(self):
        """_client is None → yield config error."""
        with patch("agent.executor._client", None):
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))
        assert "GROQ_API_KEY" in output


class TestRetryWithBackoff:
    def test_retries_on_rate_limit_then_succeeds(self):
        """Transient 429 error → retry → succeed on 2nd attempt."""
        groq_resp = _make_groq_response(content="OK")

        with patch("agent.executor._client") as mock_client, \
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
        with patch("agent.executor._client") as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Invalid model specified")
            from agent.executor import execute_stream
            output = _collect(execute_stream("test", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert mock_client.chat.completions.create.call_count == 1
        assert "thử lại" in output.lower()

    def test_max_retries_exhausted(self):
        """All retries fail → yield friendly error."""
        with patch("agent.executor._client") as mock_client, \
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


# ─── Test Gemini Fallback ────────────────────────────────────────────────────

class TestGeminiFallback:
    """Test Gemini fallback when Groq hits rate limit."""

    def test_groq_429_triggers_gemini_fallback(self):
        """Groq rate limit → Gemini fallback called → returns valid response."""
        from agent.executor import _LLMResponse

        gemini_response = _LLMResponse(content="Gemini trả lời đây")

        with patch("agent.executor._client") as mock_groq, \
             patch("agent.executor._gemini_client", new=MagicMock()), \
             patch("agent.executor._call_gemini_fallback", return_value=gemini_response) as mock_fb, \
             patch("agent.executor.time.sleep"):
            mock_groq.chat.completions.create.side_effect = Exception("429 Rate limit exceeded")

            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        mock_fb.assert_called_once()
        assert "Gemini trả lời đây" in output

    def test_groq_429_no_gemini_key_raises(self):
        """Groq rate limit + no Gemini client → yields friendly error."""
        with patch("agent.executor._client") as mock_groq, \
             patch("agent.executor._gemini_client", new=None), \
             patch("agent.executor.time.sleep"):
            mock_groq.chat.completions.create.side_effect = Exception("429 Rate limit exceeded")

            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "bận" in output.lower() or "thử lại" in output.lower()

    def test_groq_success_no_gemini_called(self):
        """Normal Groq success → Gemini not called."""
        groq_resp = _make_groq_response(content="Groq OK")

        with patch("agent.executor._client") as mock_groq, \
             patch("agent.executor._call_gemini_fallback") as mock_fb:
            mock_groq.chat.completions.create.return_value = groq_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        mock_fb.assert_not_called()
        assert "Groq OK" in output

    def test_gemini_fallback_also_fails(self):
        """Groq 429 + Gemini also fails → yields friendly error from Groq."""
        with patch("agent.executor._client") as mock_groq, \
             patch("agent.executor._gemini_client", new=MagicMock()), \
             patch("agent.executor._call_gemini_fallback", side_effect=Exception("Gemini error")), \
             patch("agent.executor.time.sleep"):
            mock_groq.chat.completions.create.side_effect = Exception("429 Rate limit exceeded")

            from agent.executor import execute_stream
            output = _collect(execute_stream("xin chào", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "bận" in output.lower() or "thử lại" in output.lower()

    def test_gemini_fallback_with_tool_calls(self):
        """Gemini fallback returns tool calls → ReAct loop processes them."""
        from agent.executor import _LLMResponse, _LLMToolCall

        # First call: Groq fails → Gemini returns tool call
        tool_call = _LLMToolCall(id="gem_1", name="get_attendance_by_date", arguments='{"date":"2026-05-14"}')
        gemini_resp_1 = _LLMResponse(content=None, tool_calls=[tool_call])
        # Second call: Groq fails again → Gemini returns text
        gemini_resp_2 = _LLMResponse(content="Hôm nay có 5 người đi làm")

        mock_http_resp = MagicMock()
        mock_http_resp.status_code = 200
        mock_http_resp.json.return_value = {"data": [{"name": "Nguyen Van A"}]}

        call_count = [0]

        def fake_gemini_fallback(messages, tools, req_id):
            call_count[0] += 1
            if call_count[0] == 1:
                return gemini_resp_1
            return gemini_resp_2

        with patch("agent.executor._client") as mock_groq, \
             patch("agent.executor._gemini_client", new=MagicMock()), \
             patch("agent.executor._call_gemini_fallback", side_effect=fake_gemini_fallback), \
             patch("agent.executor._http_client") as mock_http, \
             patch("agent.executor.time.sleep"):
            mock_groq.chat.completions.create.side_effect = Exception("429 Rate limit")
            mock_http.request.return_value = mock_http_resp

            from agent.executor import execute_stream
            output = _collect(execute_stream("ai đi làm hôm nay", [], "EMPLOYEE", "jwt", "2026-05-14"))

        assert "5 người" in output


class TestGroqToolsToGemini:
    """Test converter logic via _call_gemini_fallback (mocks google.genai)."""

    def test_converts_tools_and_calls_gemini(self):
        """Verify _call_gemini_fallback calls Gemini with converted tools."""
        from agent.executor import _LLMResponse

        # Mock the entire google.genai.types module
        mock_types = MagicMock()
        mock_genai_module = MagicMock()
        mock_genai_module.types = mock_types

        # Mock Gemini response
        mock_response = MagicMock()
        mock_response.function_calls = None
        mock_response.text = "Gemini response"

        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.return_value = mock_response

        with patch("agent.executor._gemini_client", new=mock_gemini), \
             patch.dict("sys.modules", {"google.genai": mock_genai_module, "google.genai.types": mock_types}):
            from agent.executor import _call_gemini_fallback

            groq_tools = [{
                "type": "function",
                "function": {
                    "name": "get_attendance",
                    "description": "Get attendance",
                    "parameters": {"type": "object", "properties": {"date": {"type": "string"}}, "required": ["date"]},
                },
            }]
            messages = [
                {"role": "system", "content": "System prompt"},
                {"role": "user", "content": "Hello"},
            ]

            result = _call_gemini_fallback(messages, groq_tools, "req-123")

        # Verify Gemini was called
        mock_gemini.models.generate_content.assert_called_once()
        # Verify result is normalized
        assert result.choices[0].message.content == "Gemini response"
        assert not result.choices[0].message.tool_calls  # empty list or None

    def test_gemini_returns_function_calls(self):
        """Verify function calls from Gemini are normalized to _LLMToolCall."""
        mock_types = MagicMock()
        mock_genai_module = MagicMock()
        mock_genai_module.types = mock_types

        # Mock Gemini response with function calls
        mock_fc = MagicMock()
        mock_fc.name = "get_attendance"
        mock_fc.args = {"date": "2026-05-14"}
        mock_fc.id = None

        mock_response = MagicMock()
        mock_response.function_calls = [mock_fc]
        mock_response.text = None

        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.return_value = mock_response

        with patch("agent.executor._gemini_client", new=mock_gemini), \
             patch.dict("sys.modules", {"google.genai": mock_genai_module, "google.genai.types": mock_types}):
            from agent.executor import _call_gemini_fallback

            result = _call_gemini_fallback(
                [{"role": "user", "content": "test"}],
                [{"type": "function", "function": {"name": "get_attendance", "description": "", "parameters": {}}}],
                "req-456",
            )

        assert result.choices[0].message.content is None
        tool_calls = result.choices[0].message.tool_calls
        assert len(tool_calls) == 1
        assert tool_calls[0].function.name == "get_attendance"
        assert '"date"' in tool_calls[0].function.arguments


class TestMessagesToGeminiContents:
    """Test converter: OpenAI messages → Gemini contents."""

    def test_extracts_system_instruction(self):
        mock_types = MagicMock()
        mock_genai_module = MagicMock()
        mock_genai_module.types = mock_types
        mock_types.Content.return_value = MagicMock()
        mock_types.Part.return_value = MagicMock()

        with patch.dict("sys.modules", {"google.genai": mock_genai_module, "google.genai.types": mock_types}):
            from agent.executor import _messages_to_gemini_contents

            messages = [
                {"role": "system", "content": "You are helpful"},
                {"role": "user", "content": "Hello"},
            ]
            sys_instr, contents = _messages_to_gemini_contents(messages)
            assert sys_instr == "You are helpful"
            assert len(contents) == 1

    def test_converts_tool_messages(self):
        mock_types = MagicMock()
        mock_genai_module = MagicMock()
        mock_genai_module.types = mock_types
        mock_types.Content.return_value = MagicMock()
        mock_types.Part.return_value = MagicMock()
        mock_types.Part.from_function_call.return_value = MagicMock()
        mock_types.Part.from_function_response.return_value = MagicMock()

        with patch.dict("sys.modules", {"google.genai": mock_genai_module, "google.genai.types": mock_types}):
            from agent.executor import _messages_to_gemini_contents

            messages = [
                {"role": "user", "content": "check attendance"},
                {"role": "assistant", "content": None, "tool_calls": [
                    {"function": {"name": "get_attendance", "arguments": '{"date":"2026-05-14"}'}}
                ]},
                {"role": "tool", "content": '{"data": []}'},
            ]
            sys_instr, contents = _messages_to_gemini_contents(messages)
            assert sys_instr == ""
            assert len(contents) == 3
