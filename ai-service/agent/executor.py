"""Agent executor — ReAct loop via Groq function calling + Gemini fallback."""

import json
import os
import re
import time
import datetime
import httpx
from typing import Generator

from groq import Groq

from config import logger, GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODEL
from agent.models import AgentAction
from agent.registry import get_tools_for_role, get_tool_by_name, to_groq_tools

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Gemini fallback client (lazy import to avoid startup crash if not installed)
_gemini_client = None
if GEMINI_API_KEY:
    try:
        from google import genai
        _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    except ImportError:
        logger.warning("google-genai not installed, Gemini fallback disabled")

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://backend:5000")

MAX_ITERATIONS = 3
REQUEST_TIMEOUT = 60  # seconds — overall timeout for entire ReAct loop

REACT_SYSTEM = """Bạn là trợ lý ERP thông minh của An Binh Foods. Bạn giúp nhân viên thực hiện thao tác và trả lời câu hỏi về hệ thống.

QUAN TRỌNG - Quy trình suy nghĩ:
Trước MỖI hành động (gọi tool hoặc trả lời), bạn PHẢI suy nghĩ trong thẻ <think>...</think>:
- Phân tích ý định thực sự của user
- Xác định thông tin nào cần thiết
- Chọn tool phù hợp nhất (hoặc quyết định trả lời trực tiếp)
- Nếu đã có kết quả tool: phân tích dữ liệu, rút ra insight

Ví dụ:
<think>User hỏi "ai nghỉ nhiều nhất tháng này" → cần gọi list_leave_requests với status=approved, startDate=đầu tháng, endDate=cuối tháng, rồi đếm theo nhân viên.</think>

Quy tắc:
- Sử dụng tools để thực hiện yêu cầu. Có thể gọi nhiều tools liên tiếp nếu cần.
- Tool "search_knowledge": dùng khi user hỏi hướng dẫn, quy trình, cách sử dụng hệ thống
- Các tool khác: dùng khi user muốn xem/tạo/xuất dữ liệu thực tế
- Nếu thiếu thông tin bắt buộc, hỏi lại user
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn
- Format kết quả dạng bảng markdown (nếu danh sách) hoặc bullet points (nếu chi tiết)
- Format ngày dễ đọc (DD/MM/YYYY), tiền tệ có dấu chấm (12.000.000đ)
- Bỏ qua các trường kỹ thuật (IDs, timestamps) khi trình bày
- Ngày tham số PHẢI dùng format YYYY-MM-DD
- Status dùng tiếng Anh: pending/approved/rejected
- Khi tìm nhân viên theo chức vụ/phòng ban, dùng search với từ khóa ngắn gọn

QUAN TRỌNG - Quy tắc tính ngày (hôm nay: {today}, thứ {weekday}):
- "hôm nay" → {today}
- "tuần này" → {mon} (thứ Hai) đến {sun} (Chủ nhật)
- "tháng này" → {year}-{month}-01 đến cuối tháng {month}
- "ngày mai" → {tomorrow}
- "tháng N" → {year}-0N-01 đến {year}-0N-cuối tháng"""


# ─── Helper Functions ──────────────────────────────────────────────────────────

_THINK_RE = re.compile(r"<think>(.*?)</think>", re.DOTALL)


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from model output, log reasoning."""
    if not text:
        return text
    thinks = _THINK_RE.findall(text)
    for t in thinks:
        logger.debug(f"Agent reasoning: {t.strip()}")
    cleaned = _THINK_RE.sub("", text).strip()
    return cleaned

def _get_weekday_name(today_str: str) -> str:
    """Get Vietnamese weekday name."""
    d = datetime.date.fromisoformat(today_str)
    names = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Chủ nhật"]
    return names[d.weekday()]


def _get_week_range(today_str: str) -> tuple[str, str]:
    """Get Monday and Sunday of current week (ISO: Mon=0)."""
    d = datetime.date.fromisoformat(today_str)
    monday = d - datetime.timedelta(days=d.weekday())
    sunday = monday + datetime.timedelta(days=6)
    return monday.isoformat(), sunday.isoformat()


def _build_react_messages(message: str, history: list, today: str) -> list:
    """Build message list for ReAct loop."""
    weekday = _get_weekday_name(today)
    mon, sun = _get_week_range(today)
    year = today[:4]
    month = today[5:7]
    d = datetime.date.fromisoformat(today)
    tomorrow = (d + datetime.timedelta(days=1)).isoformat()

    system_content = REACT_SYSTEM.format(
        today=today, weekday=weekday, mon=mon, sun=sun,
        year=year, month=month, tomorrow=tomorrow
    )

    messages = [{"role": "system", "content": system_content}]

    # Add conversation history (last 6 turns)
    for h in history[-6:]:
        messages.append({"role": h.role, "content": h.content})

    messages.append({"role": "user", "content": message})
    return messages


def _coerce_params(tool: dict, params: dict) -> dict:
    """Coerce param types theo schema (Groq đôi khi trả string cho integer fields)."""
    if not params:
        return {}
    all_params = tool.get("path_params", []) + tool.get("query_params", []) + tool.get("body_params", [])
    type_map = {p["name"]: p["type"] for p in all_params}
    coerced = {}
    for k, v in params.items():
        expected = type_map.get(k)
        if expected == "integer" and isinstance(v, str):
            try:
                coerced[k] = int(v)
            except ValueError:
                coerced[k] = v
        elif expected == "number" and isinstance(v, str):
            try:
                coerced[k] = float(v)
            except ValueError:
                coerced[k] = v
        else:
            coerced[k] = v
    return coerced


# ─── Tool Execution ───────────────────────────────────────────────────────────

# Reusable HTTP client with connection pooling (avoid creating new client per request)
_http_client = httpx.Client(timeout=30.0, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))


def _call_backend_api(tool: dict, params: dict | None, jwt_token: str) -> dict:
    """Execute API call to backend with user's JWT."""
    params = params or {}
    path = tool["path"]
    for p in tool.get("path_params", []):
        if p["name"] in params:
            path = path.replace(f"{{{p['name']}}}", str(params[p["name"]]))

    query = {}
    for p in tool.get("query_params", []):
        if p["name"] in params:
            query[p["name"]] = params[p["name"]]

    body = {}
    for p in tool.get("body_params", []):
        if p["name"] in params:
            body[p["name"]] = params[p["name"]]

    headers = {"Authorization": f"Bearer {jwt_token}", "Content-Type": "application/json"}
    url = f"{BACKEND_API_URL}{path}"

    try:
        if tool["method"] == "GET":
            resp = _http_client.get(url, params=query, headers=headers)
        elif tool["method"] == "POST":
            resp = _http_client.post(url, json=body, params=query, headers=headers)
        elif tool["method"] == "PATCH":
            resp = _http_client.patch(url, json=body, params=query, headers=headers)
        elif tool["method"] == "PUT":
            resp = _http_client.put(url, json=body, params=query, headers=headers)
        elif tool["method"] == "DELETE":
            resp = _http_client.delete(url, params=query, headers=headers)
        else:
            return {"success": False, "error": f"Unsupported method: {tool['method']}"}

        if resp.status_code >= 400:
            return {"success": False, "error": f"API error {resp.status_code}: {resp.text[:200]}"}
        return resp.json()
    except Exception as e:
        logger.error(f"Backend API call failed: {e}")
        return {"success": False, "error": str(e)}


def _call_rag_search(query: str, department: str, role: str) -> dict:
    """Call RAG pipeline and return results as dict for model to read."""
    try:
        from chat.llm import expand_query, rewrite_query
        from chat.retrieval import build_retrieval
        import chat.indexer as indexer

        if not indexer.rag_ready:
            return {"found": False, "message": "Knowledge base chưa sẵn sàng."}

        expanded = expand_query(query)
        rewritten = rewrite_query(expanded)
        chunks, confident = build_retrieval(rewritten, query, department, role)

        if not confident or not chunks:
            return {"found": False, "message": "Không tìm thấy thông tin trong knowledge base."}

        results = []
        for c in chunks[:5]:
            results.append({
                "text": c["text"],
                "source": c["metadata"].get("filename", ""),
                "section": c["metadata"].get("section", ""),
            })
        return {"found": True, "results": results}
    except Exception as e:
        logger.error(f"RAG search failed: {e}")
        return {"found": False, "message": f"Lỗi tìm kiếm: {str(e)}"}


def _build_confirm_message(tool: dict, params: dict) -> str:
    """Build confirm message + __AGENT_ACTION__ sentinel for write actions."""
    desc_parts = [f"- **{k}**: {v}" for k, v in params.items()]
    confirm_msg = f"Tôi sẽ thực hiện: **{tool['description']}**\n\n" + "\n".join(desc_parts)
    action = AgentAction(
        type="confirm",
        tool=tool["name"],
        params=params,
        message=confirm_msg,
    )
    return f"{confirm_msg}\n\n__AGENT_ACTION__\n{action.model_dump_json()}\n"


def _build_export_message(tool: dict, params: dict, today: str) -> str:
    """Build export message + __AGENT_ACTION__ sentinel for export actions."""
    export_path = tool["path"]
    query_parts = [f"{k}={v}" for k, v in params.items()]
    query_string = "&".join(query_parts)
    export_url = f"/api{export_path}" if not export_path.startswith("/api") else export_path
    if query_string:
        export_url += f"?{query_string}"

    filename = f"{tool['name']}_{today}.xlsx"
    action = AgentAction(
        type="export",
        tool=tool["name"],
        params=params,
        url=export_url,
        filename=filename,
    )
    return f"File Excel đã sẵn sàng để tải xuống.\n\n__AGENT_ACTION__\n{action.model_dump_json()}\n"


# ─── Gemini Fallback ─────────────────────────────────────────────────────────

class _LLMFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class _LLMToolCall:
    def __init__(self, id: str, name: str, arguments: str):
        self.id = id
        self.function = _LLMFunction(name, arguments)


class _LLMMessage:
    def __init__(self, content, tool_calls):
        self.content = content
        self.tool_calls = tool_calls


class _LLMChoice:
    def __init__(self, content, tool_calls):
        self.message = _LLMMessage(content, tool_calls)


class _LLMResponse:
    def __init__(self, content=None, tool_calls=None):
        self.choices = [_LLMChoice(content, tool_calls or [])]


def _groq_tools_to_gemini(groq_tools: list):
    """Convert Groq/OpenAI tool format → Gemini Tool object."""
    from google.genai import types
    declarations = []
    for t in groq_tools:
        fn = t["function"]
        params = fn.get("parameters", {})
        schema = None
        if params.get("properties"):
            # Convert OpenAPI JSON Schema → Gemini Schema object
            properties = {}
            for prop_name, prop_def in params["properties"].items():
                properties[prop_name] = types.Schema(
                    type=prop_def.get("type", "string").upper(),
                    description=prop_def.get("description", ""),
                )
            schema = types.Schema(
                type="OBJECT",
                properties=properties,
                required=params.get("required", []),
            )
        declarations.append(types.FunctionDeclaration(
            name=fn["name"],
            description=fn.get("description", ""),
            parameters=schema,
        ))
    return types.Tool(function_declarations=declarations)


def _messages_to_gemini_contents(messages: list):
    """Convert OpenAI messages → (system_instruction, Gemini contents list)."""
    from google.genai import types
    system_instruction = ""
    contents = []
    for msg in messages:
        role = msg.get("role", "")
        if role == "system":
            system_instruction = msg["content"]
        elif role == "user":
            contents.append(types.Content(role="user", parts=[types.Part(text=msg["content"])]))
        elif role == "assistant":
            if msg.get("tool_calls"):
                parts = []
                for tc in msg["tool_calls"]:
                    args = json.loads(tc["function"]["arguments"] or "{}")
                    parts.append(types.Part.from_function_call(
                        name=tc["function"]["name"], args=args,
                    ))
                contents.append(types.Content(role="model", parts=parts))
            elif msg.get("content"):
                contents.append(types.Content(role="model", parts=[types.Part(text=msg["content"])]))
        elif role == "tool":
            tool_content = msg.get("content", "{}")
            try:
                result_data = json.loads(tool_content)
            except (json.JSONDecodeError, TypeError):
                result_data = {"result": tool_content}
            contents.append(types.Content(role="user", parts=[
                types.Part.from_function_response(name="tool_result", response=result_data)
            ]))
    return system_instruction, contents


def _call_gemini_fallback(messages: list, groq_tools: list, request_id: str):
    """Call Gemini API and return a Groq-compatible _LLMResponse."""
    from google.genai import types

    gemini_tool = _groq_tools_to_gemini(groq_tools)
    system_instruction, contents = _messages_to_gemini_contents(messages)

    response = _gemini_client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            tools=[gemini_tool],
            system_instruction=system_instruction,
            temperature=0.1,
            max_output_tokens=1024,
        ),
    )

    # Normalize to Groq-like response
    if response.function_calls:
        tool_calls = []
        for i, fc in enumerate(response.function_calls):
            tc_id = getattr(fc, "id", None) or f"gemini_call_{i}"
            tool_calls.append(_LLMToolCall(
                id=tc_id,
                name=fc.name,
                arguments=json.dumps(dict(fc.args)) if fc.args else "{}",
            ))
        return _LLMResponse(content=None, tool_calls=tool_calls)
    else:
        return _LLMResponse(content=response.text, tool_calls=None)


# ─── ReAct Loop ───────────────────────────────────────────────────────────────

MAX_RETRIES = 2
RETRY_BACKOFF = 1.0  # seconds, doubles each retry


def _friendly_error(e: Exception) -> str:
    """Map technical errors to user-friendly Vietnamese messages."""
    err = str(e).lower()
    if "429" in err or "rate" in err:
        return "Hệ thống đang bận, vui lòng thử lại sau 30 giây."
    if "503" in err or "overloaded" in err:
        return "Hệ thống AI đang quá tải, vui lòng thử lại sau."
    if "timeout" in err:
        return "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
    if "401" in err or "unauthorized" in err:
        return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
    return "Lỗi khi xử lý yêu cầu. Vui lòng thử lại sau."


def _call_groq_with_retry(messages: list, groq_tools: list, request_id: str):
    """Call Groq API with retry. On rate limit exhaustion, fallback to Gemini."""
    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            return _client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=groq_tools,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=1024,
            )
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            is_transient = any(x in error_str for x in ["429", "503", "rate", "timeout", "overloaded"])
            if not is_transient or attempt == MAX_RETRIES:
                break
            wait = RETRY_BACKOFF * (2 ** attempt)
            logger.warning(f"[{request_id}] Groq transient error (attempt {attempt+1}), retrying in {wait}s: {e}")
            time.sleep(wait)

    # Groq exhausted — try Gemini fallback
    if _gemini_client:
        logger.info(f"[{request_id}] Groq failed ({last_error}), falling back to Gemini ({GEMINI_MODEL})")
        try:
            return _call_gemini_fallback(messages, groq_tools, request_id)
        except Exception as gemini_err:
            logger.error(f"[{request_id}] Gemini fallback also failed: {gemini_err}")
            raise last_error  # raise original Groq error

    raise last_error

def execute_stream(
    message: str, history: list, role: str, jwt_token: str, today: str,
    department: str = "", request_id: str = ""
) -> Generator[str, None, None]:
    """
    ReAct agent executor — Think → Act → Observe loop.
    Max 3 iterations. Streams final text response.
    """
    if not _client:
        yield "Lỗi: AI service chưa được cấu hình (thiếu GROQ_API_KEY)"
        return

    available_tools = get_tools_for_role(role)
    groq_tools = to_groq_tools(available_tools)
    messages = _build_react_messages(message, history, today)
    start_time = time.time()

    for iteration in range(MAX_ITERATIONS):
        # Check overall timeout
        elapsed = time.time() - start_time
        if elapsed > REQUEST_TIMEOUT:
            logger.warning(f"[{request_id}] Request timeout after {elapsed:.1f}s")
            yield "Xin lỗi, yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
            return

        try:
            resp = _call_groq_with_retry(messages, groq_tools, request_id)
        except Exception as e:
            logger.error(f"[{request_id}] Groq API error (iteration {iteration}): {e}")
            yield _friendly_error(e)
            return

        choice = resp.choices[0]

        # Model returns text (final answer or asking for more info)
        if choice.message.content and not choice.message.tool_calls:
            yield _strip_think_tags(choice.message.content)
            return

        # Model returns tool call (may have <think> in content alongside tool_calls)
        if choice.message.tool_calls:
            if choice.message.content:
                _strip_think_tags(choice.message.content)  # log reasoning only
            tc = choice.message.tool_calls[0]
            fn_name = tc.function.name
            fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}

            tool = get_tool_by_name(fn_name)
            if not tool:
                yield f"Lỗi: Tool '{fn_name}' không tồn tại."
                return

            fn_args = _coerce_params(tool, fn_args)
            logger.info(f"[{request_id}] ReAct [{iteration+1}/{MAX_ITERATIONS}] → {fn_name}({fn_args})")

            # Write action → return confirm (don't execute)
            if tool.get("is_write"):
                yield _build_confirm_message(tool, fn_args)
                return

            # Export action → return download URL
            if tool.get("is_export"):
                yield _build_export_message(tool, fn_args, today)
                return

            # Execute tool (RAG or Backend API)
            if tool.get("is_internal"):
                result = _call_rag_search(fn_args.get("query", message), department, role)
            else:
                result = _call_backend_api(tool, fn_args, jwt_token)

            # Observe: append tool call + result to messages
            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": fn_name, "arguments": tc.function.arguments or "{}"}
                }]
            })

            result_str = json.dumps(result, ensure_ascii=False)
            if len(result_str) > 3000:
                result_str = result_str[:3000] + "..."

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_str,
            })
            # Continue loop — model will see result and decide next action
            continue

    # Max iterations reached without final answer
    yield "Xin lỗi, tôi không thể hoàn thành yêu cầu. Vui lòng thử lại với câu hỏi cụ thể hơn."


# ─── Confirmed Execution (second turn) ────────────────────────────────────────

def execute_confirmed(tool_name: str, params: dict, jwt_token: str, request_id: str = "") -> Generator[str, None, None]:
    """Execute a confirmed write action and stream result."""
    tool = get_tool_by_name(tool_name)
    if not tool:
        yield f"Lỗi: Không tìm thấy tool '{tool_name}'"
        return

    logger.info(f"[{request_id}] Executing confirmed: {tool_name}({params})")
    result = _call_backend_api(tool, params, jwt_token)
    if result.get("success", True) and "error" not in result:
        yield f"✅ Đã thực hiện thành công: {tool['description']}"
    else:
        yield f"❌ Thất bại: {result.get('error', result.get('message', 'Lỗi không xác định'))}"
