"""Agent executor — ReAct loop via LLM function calling (OpenRouter/DeepSeek)."""

import json
import os
import re
import time
import datetime
import httpx
from typing import Generator

from config import (logger, OPENROUTER_API_KEY, OPENROUTER_MODEL)
from agent.models import AgentAction
from agent.registry import get_tools_for_role, get_tool_by_name, to_openai_tools
from agent.classifier import filter_tools_by_intent, classify_intent

_openrouter_client = None
if OPENROUTER_API_KEY:
    try:
        from openai import OpenAI
        _openrouter_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
        logger.info(f"OpenRouter client initialized, model={OPENROUTER_MODEL}")
    except ImportError:
        logger.warning("openai package not installed, OpenRouter disabled")

BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://backend:5000")

MAX_ITERATIONS = 5
REQUEST_TIMEOUT = 90  # seconds — overall timeout for entire ReAct loop
MAX_TOOL_RESULT_CHARS = 6000  # truncate tool results to fit LLM context
MAX_HISTORY_MESSAGES = 10  # keep last 10 messages (5 turns)
MAX_HISTORY_CHARS = 4000  # trim oldest if total history content exceeds this

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
- KHÔNG BAO GIỜ trả lời kiểu "đợi một chút", "để tôi kiểm tra", "tôi sẽ tra cứu" mà không gọi tool. Khi cần dữ liệu, GỌI TOOL NGAY trong cùng lượt, không trả text trước.
- QUAN TRỌNG: Khi yêu cầu cần nhiều bước (VD: tạo khách hàng → tạo sản phẩm → tạo báo giá), sau khi hoàn thành 1 bước, PHẢI tự động tiếp tục bước tiếp theo. KHÔNG hỏi lại user "bạn có muốn tiếp tục không". Chỉ dừng khi thiếu thông tin bắt buộc mà user chưa cung cấp. Các field optional thì bỏ qua, không cần hỏi.
- Khi trả kết quả danh sách, PHẢI hiển thị ĐẦY ĐỦ tất cả records nhận được từ tool, không tự ý lọc bỏ.
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
- Khi cần employeeId cho các tool tạo mới, gọi get_my_profile trước để lấy

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

_STALLING_PATTERNS = [
    "đợi", "chờ", "để tôi", "tôi sẽ", "kiểm tra", "tra cứu",
    "xem thử", "tìm kiếm", "truy vấn", "một chút", "giây lát",
]

# Regex to detect DeepSeek outputting tool calls as text instead of structured tool_calls
# Handles formats:
#   <function>tool_name\n{json}\n```
#   <function>tool_name\n```json\n{json}\n```
_TEXT_TOOL_CALL_RE = re.compile(
    r"<function>(\w+)\s*\n(?:```json\s*\n)?\s*(\{.*?\})\s*\n?\s*```",
    re.DOTALL,
)

# Second format: function<｜tool▁sep｜>tool_name\n\n{json}
# \uff5c is the fullwidth ｜ (U+FF5C) used in DeepSeek's special token
_TEXT_TOOL_CALL_RE2 = re.compile(
    r"function.{0,20}?(\w+)\s*\n\s*(\{.*?\})",
    re.DOTALL,
)


def _is_text_tool_call(text: str) -> bool:
    """Detect if text contains a tool call output (either format)."""
    return "<function>" in text or "\uff5c" in text


def _parse_text_tool_call(text: str):
    """Parse tool call that model output as text instead of structured tool_calls.

    DeepSeek sometimes outputs:
      <function>tool_name\n{json}\n```
      <function>tool_name\n```json\n{json}\n```
      function<｜tool▁sep｜>tool_name\n\n{json}
    Returns (fn_name, fn_args) tuple or None if not a text tool call.
    Uses the LAST match if multiple tool calls are present.
    """
    if not _is_text_tool_call(text):
        return None
    # Try format 1: <function>tool_name\n{json}\n```
    matches = list(_TEXT_TOOL_CALL_RE.finditer(text))
    if not matches:
        # Try format 2: function<｜tool▁sep｜>tool_name\n\n{json}
        matches = list(_TEXT_TOOL_CALL_RE2.finditer(text))
    if not matches:
        return None
    # Use last match (most relevant to current message)
    match = matches[-1]
    fn_name = match.group(1).strip()
    try:
        fn_args = json.loads(match.group(2))
    except (json.JSONDecodeError, ValueError):
        fn_args = {}
    return (fn_name, fn_args)


def _is_topic_switch(message: str, history: list) -> bool:
    """Detect if current message is a new topic unrelated to recent history.

    Uses intent category comparison: if current message categories have zero
    overlap with previous user messages' categories, it's a topic switch.
    Returns False for ambiguous cases (sticky routing for follow-ups).
    """
    current_cats = classify_intent(message)
    if not current_cats:
        # No keywords matched → ambiguous, treat as continuation (sticky routing)
        return False

    # Collect categories from last 2 user messages in history
    prev_cats: set = set()
    user_count = 0
    for h in reversed(history[-6:]):
        if isinstance(h, dict):
            role, content = h["role"], h["content"]
        else:
            role, content = h.role, h.content
        if role == "user":
            prev_cats.update(classify_intent(content))
            user_count += 1
            if user_count >= 2:
                break

    if not prev_cats:
        return False  # No history to compare against

    # Remove always-included utility categories from comparison
    _UTILITY_CATS = {"employee", "knowledge"}
    current_sig = current_cats - _UTILITY_CATS
    prev_sig = prev_cats - _UTILITY_CATS

    if not current_sig or not prev_sig:
        return False  # One side is only utility categories → ambiguous

    # Topic switch if zero overlap between significant categories
    return current_sig.isdisjoint(prev_sig)


def _is_stalling_response(text: str) -> bool:
    """Detect if model response is a stalling/processing message instead of a real answer.

    Returns True if the text is short and contains stalling patterns,
    indicating the model should have called a tool instead.
    """
    if not text or len(text) > 200:
        return False
    text_lower = text.lower()
    return any(p in text_lower for p in _STALLING_PATTERNS)


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


def _build_react_messages(message: str, history: list, today: str, topic_switched: bool = False) -> list:
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

    # On topic switch: clear stale history to avoid confusing the model
    if topic_switched:
        effective_history = []
    else:
        effective_history = list(history[-MAX_HISTORY_MESSAGES:])
        # Trim from oldest if total content too long (save tokens)
        total_chars = sum(
            len(h.content if hasattr(h, 'content') else h.get('content', ''))
            for h in effective_history
        )
        while total_chars > MAX_HISTORY_CHARS and len(effective_history) > 2:
            removed = effective_history.pop(0)
            total_chars -= len(removed.content if hasattr(removed, 'content') else removed.get('content', ''))

    # Add conversation history, sanitize text tool calls and completed actions
    # Build pairs: skip user+assistant pairs where assistant is a completed action marker
    # This prevents model from mixing old task params into new requests
    hist_items = []
    for h in effective_history:
        if isinstance(h, dict):
            role, content = h["role"], h["content"]
        else:
            role, content = h.role, h.content
        hist_items.append((role, content))

    i = 0
    while i < len(hist_items):
        role, content = hist_items[i]
        # Skip assistant messages that are text tool calls (DeepSeek bug artifacts)
        if role == "assistant" and content and _is_text_tool_call(content):
            i += 1
            continue
        # Skip completed action markers and the preceding user message
        if role == "assistant" and content and "Đã xử lý" in content:
            # Remove the last added user message (the request that was already handled)
            if messages and messages[-1]["role"] == "user":
                messages.pop()
            i += 1
            continue
        messages.append({"role": role, "content": content})
        i += 1

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
        elif expected == "array" and isinstance(v, str):
            try:
                coerced[k] = json.loads(v)
            except (json.JSONDecodeError, ValueError):
                # Fallback: split comma-separated string into array
                coerced[k] = [item.strip() for item in v.split(",") if item.strip()]
        else:
            coerced[k] = v
    return coerced


# ─── Tool Execution ───────────────────────────────────────────────────────────

# Reusable HTTP client with connection pooling (avoid creating new client per request)
_http_client = httpx.Client(timeout=30.0, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))


# Fields to keep when slimming employee/list responses for LLM context
_EMPLOYEE_KEEP_FIELDS = {"id", "employeeCode", "fullName", "departmentName", "subDepartmentName", "positionName", "status", "email", "phoneNumber", "hireDate", "baseSalary", "kpiLevel"}

# Fields to always remove from any entity (heavy/internal)
_ALWAYS_REMOVE_FIELDS = {"createdAt", "updatedAt", "userId", "employeeId", "positionId", "positionLevelId",
                         "subDepartmentId", "secondarySubDepartmentId", "departmentId", "user", "position",
                         "positionLevel", "subDepartment", "employee", "password", "__v"}


def _slim_response(result: dict) -> dict:
    """Remove verbose fields from API response to fit LLM context window."""
    if not isinstance(result, dict):
        return result
    data = result.get("data")
    if not data:
        return result

    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        slimmed = []
        for item in data:
            slim = {}
            # Build fullName from user.firstName + user.lastName if available
            user = item.get("user", {})
            if user and isinstance(user, dict):
                first = user.get("firstName", "")
                last = user.get("lastName", "")
                if first or last:
                    slim["fullName"] = f"{last} {first}".strip()
                if user.get("email"):
                    slim["email"] = user["email"]

            # Keep important fields for employee-like records
            for key in _EMPLOYEE_KEEP_FIELDS:
                if key in item and item[key] is not None and key not in slim:
                    slim[key] = item[key]

            # Keep position name
            pos = item.get("position")
            if pos and isinstance(pos, dict) and pos.get("name"):
                slim["positionName"] = pos["name"]

            # Fallback: if slim is too empty, keep original but remove heavy fields
            if len(slim) < 3:
                slim = {k: v for k, v in item.items()
                        if k not in _ALWAYS_REMOVE_FIELDS
                        and not isinstance(v, dict)
                        and not (isinstance(v, list) and len(v) > 3)}
                # Slim nested lists (e.g. items in quotation requests)
                for k, v in list(slim.items()):
                    if isinstance(v, list) and v and isinstance(v[0], dict):
                        slim[k] = [
                            {fk: fv for fk, fv in sub.items()
                             if fk not in _ALWAYS_REMOVE_FIELDS
                             and not isinstance(fv, dict)
                             and fk not in ("id", "quotationRequestId")}
                            for sub in v
                        ]

            slimmed.append(slim)

        total = (
            result.get("pagination", {}).get("total")
            or result.get("total")
            or len(slimmed)
        )
        return {"data": slimmed, "total": total}

    return result


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
        result = resp.json()
        logger.info(f"Backend response for {tool['name']}: total={result.get('pagination',{}).get('total','?')}, data_count={len(result.get('data',[]))}")
        return result
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


def _extract_employee_names(messages: list) -> dict:
    """Extract employee id→name mapping from tool results in message history."""
    names = {}
    for msg in messages:
        if msg.get("role") != "tool":
            continue
        try:
            data = json.loads(msg.get("content", "{}"))
            items = data.get("data", [])
            if not isinstance(items, list):
                continue
            for item in items:
                if isinstance(item, dict) and item.get("id") and item.get("fullName"):
                    names[item["id"]] = item["fullName"]
        except (json.JSONDecodeError, TypeError):
            continue
    return names


def _build_confirm_message(tool: dict, params: dict, context: dict = None, display_names: dict = None) -> str:
    """Build confirm message + __AGENT_ACTION__ sentinel for write actions."""
    # Use friendly action names instead of technical descriptions
    friendly_actions = {
        "create_leave_request": "tạo đơn xin nghỉ phép",
        "approve_leave_request": "duyệt đơn nghỉ phép",
        "create_purchase_request": "tạo yêu cầu mua hàng",
        "create_task": "giao nhiệm vụ",
        "create_customer": "thêm khách hàng mới",
        "create_supplier": "thêm nhà cung cấp mới",
        "create_product": "tạo sản phẩm mới",
        "create_quotation_request": "tạo yêu cầu báo giá",
        "create_supply_request": "tạo yêu cầu cung ứng",
        "create_daily_work_report": "tạo báo cáo công việc",
        "create_customer_feedback": "ghi nhận phản hồi khách hàng",
        "create_repair_request": "tạo yêu cầu sửa chữa",
    }
    action_name = friendly_actions.get(tool["name"], tool["description"].split(".")[0].lower())

    # Filter out internal params (employeeId, etc.) for display
    display_exclude = {"employeeId", "maNhanVien", "tenNhanVien", "approvedBy"}
    display_names = display_names or {}
    desc_parts = []
    for k, v in params.items():
        if k in display_exclude:
            continue
        display_v = display_names.get(k, v)
        desc_parts.append(f"- **{k}**: {display_v}")
    confirm_msg = f"Mình sẽ **{action_name}** với thông tin sau:\n\n" + "\n".join(desc_parts) + "\n\nBạn xác nhận thực hiện không?"
    action = AgentAction(
        type="confirm",
        tool=tool["name"],
        params=params,
        message=confirm_msg,
        context=context,
        display=display_names,
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


def _call_llm_with_retry(messages: list, tools: list, request_id: str):
    """Call OpenRouter LLM with retry on transient errors."""
    if not _openrouter_client:
        raise RuntimeError("No LLM configured (OPENROUTER_API_KEY required)")

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = _openrouter_client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=1024,
            )
            logger.info(f"[{request_id}] OpenRouter ({OPENROUTER_MODEL}) responded OK")
            return resp
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            is_transient = any(x in error_str for x in ["429", "503", "rate", "timeout", "overloaded"])
            if not is_transient or attempt == MAX_RETRIES:
                break
            wait = RETRY_BACKOFF * (2 ** attempt)
            logger.warning(f"[{request_id}] OpenRouter transient error (attempt {attempt+1}), retrying in {wait}s: {e}")
            time.sleep(wait)

    raise last_error

def execute_stream(
    message: str, history: list, role: str, jwt_token: str, today: str,
    department: str = "", request_id: str = "",
    _resume_messages: list = None,
) -> Generator[str, None, None]:
    """
    ReAct agent executor — Think → Act → Observe loop.
    Max 5 iterations. Streams final text response.

    _resume_messages / _resume_result: internal params for chaining write actions.
    When resuming after a confirmed write, we inject the previous result into messages.
    """
    if not _openrouter_client:
        yield "Lỗi: AI service chưa được cấu hình (cần OPENROUTER_API_KEY)"
        return

    available_tools = get_tools_for_role(role)
    # For intent classification, combine current message with history for full context
    intent_text = message
    if history:
        # Include user messages from history to capture original intent
        history_user_msgs = []
        for h in history[-6:]:
            h_content = h["content"] if isinstance(h, dict) else h.content
            h_role = h["role"] if isinstance(h, dict) else h.role
            if h_role == "user":
                history_user_msgs.append(h_content)
        if history_user_msgs:
            intent_text = " ".join(history_user_msgs) + " " + message
    filtered_tools = filter_tools_by_intent(available_tools, intent_text)
    llm_tools = to_openai_tools(filtered_tools)
    logger.info(f"[{request_id}] Tools: {len(available_tools)} available, {len(filtered_tools)} after intent filter")

    # Resume mode: use pre-built messages (from chaining after confirmed write)
    if _resume_messages:
        messages = _resume_messages
    else:
        # Detect topic switch to avoid stale history confusing the model
        topic_switched = _is_topic_switch(message, history) if history else False
        if topic_switched:
            logger.info(f"[{request_id}] Topic switch detected — clearing history context")

        messages = _build_react_messages(message, history, today, topic_switched=topic_switched)

    start_time = time.time()

    for iteration in range(MAX_ITERATIONS):
        # Check overall timeout
        elapsed = time.time() - start_time
        if elapsed > REQUEST_TIMEOUT:
            logger.warning(f"[{request_id}] Request timeout after {elapsed:.1f}s")
            yield "Xin lỗi, yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
            return

        try:
            resp = _call_llm_with_retry(messages, llm_tools, request_id)
        except Exception as e:
            logger.error(f"[{request_id}] Groq API error (iteration {iteration}): {e}")
            yield _friendly_error(e)
            return

        choice = resp.choices[0]

        # Model returns text (final answer or asking for more info)
        if choice.message.content and not choice.message.tool_calls:
            text = _strip_think_tags(choice.message.content)

            # If content was only <think> tags (stripped to empty), retry
            if not text:
                logger.info(f"[{request_id}] Model returned only <think> without tool call, retrying")
                messages.append({"role": "assistant", "content": choice.message.content})
                messages.append({"role": "user", "content": "Gọi tool ngay để lấy dữ liệu."})
                continue

            # Check if model output a tool call as text (DeepSeek bug)
            parsed_tc = _parse_text_tool_call(choice.message.content)
            if parsed_tc:
                fn_name, fn_args = parsed_tc
                logger.info(f"[{request_id}] Parsed text tool call: {fn_name}({fn_args})")
                tool = get_tool_by_name(fn_name)
                if tool:
                    fn_args = _coerce_params(tool, fn_args)
                    if tool.get("is_write"):
                        history_for_context = []
                        if history:
                            history_for_context = [{"role": h.role, "content": h.content} if hasattr(h, 'role') else h for h in history[-6:]]
                        # Resolve display names for ID fields
                        employee_names = _extract_employee_names(messages)
                        display_names = {}
                        for pk, pv in fn_args.items():
                            if isinstance(pv, list) and pv and all(isinstance(x, str) and len(x) > 20 for x in pv):
                                resolved = [employee_names.get(x, x) for x in pv]
                                if resolved != pv:
                                    display_names[pk] = ", ".join(resolved)
                            elif isinstance(pv, str) and len(pv) > 20 and pv in employee_names:
                                display_names[pk] = employee_names[pv]
                        yield _build_confirm_message(tool, fn_args, context={
                            "message": message,
                            "history": history_for_context,
                            "role": role,
                            "department": department,
                            "today": today,
                        }, display_names=display_names)
                        return
                    if tool.get("is_export"):
                        yield _build_export_message(tool, fn_args, today)
                        return
                    # Execute tool
                    if tool.get("is_internal"):
                        result = _call_rag_search(fn_args.get("query", message), department, role)
                    else:
                        result = _call_backend_api(tool, fn_args, jwt_token)
                    result_str = json.dumps(_slim_response(result), ensure_ascii=False)
                    if len(result_str) > MAX_TOOL_RESULT_CHARS:
                        result_str = result_str[:MAX_TOOL_RESULT_CHARS] + "...(truncated)"
                    # Can't use role=tool without structured tool_calls, use user message
                    messages.append({"role": "assistant", "content": choice.message.content})
                    messages.append({"role": "user", "content": f"[Kết quả {fn_name}]: {result_str}\n\nHãy trả lời dựa trên dữ liệu trên."})
                    continue

            # Retry if model returns a "processing" message instead of calling tools
            if iteration < MAX_ITERATIONS - 1 and _is_stalling_response(text):
                logger.info(f"[{request_id}] Model stalling ('{text[:50]}...'), retrying with nudge")
                messages.append({"role": "assistant", "content": choice.message.content})
                messages.append({"role": "user", "content": "Gọi tool ngay để lấy dữ liệu. Không trả lời text."})
                continue

            # Fallback: if text still contains <function> tag (unparsed), retry
            if "<function>" in text and iteration < 2:
                logger.info(f"[{request_id}] Text contains unparsed <function> tag, retrying")
                messages.append({"role": "assistant", "content": choice.message.content})
                messages.append({"role": "user", "content": "KHÔNG output <function> tag. Hãy sử dụng tool calling API đúng cách."})
                continue

            yield text
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
                # Include context for chaining: after confirm, resume loop
                # Store history so resume has full conversation context (original intent)
                history_for_context = []
                if history:
                    history_for_context = [{"role": h.role, "content": h.content} if hasattr(h, 'role') else h for h in history[-6:]]
                # Resolve display names for ID fields
                employee_names = _extract_employee_names(messages)
                display_names = {}
                for pk, pv in fn_args.items():
                    if isinstance(pv, list) and pv and all(isinstance(x, str) and len(x) > 20 for x in pv):
                        resolved = [employee_names.get(x, x) for x in pv]
                        if resolved != pv:
                            display_names[pk] = ", ".join(resolved)
                    elif isinstance(pv, str) and len(pv) > 20 and pv in employee_names:
                        display_names[pk] = employee_names[pv]
                yield _build_confirm_message(tool, fn_args, context={
                    "message": message,
                    "history": history_for_context,
                    "role": role,
                    "department": department,
                    "today": today,
                }, display_names=display_names)
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

            result_str = json.dumps(_slim_response(result), ensure_ascii=False)
            if len(result_str) > MAX_TOOL_RESULT_CHARS:
                result_str = result_str[:MAX_TOOL_RESULT_CHARS] + "...(truncated)"

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

def execute_confirmed(
    tool_name: str, params: dict, jwt_token: str, request_id: str = "",
    confirm_context: dict = None,
) -> Generator[str, None, None]:
    """Execute a confirmed write action and stream result.

    If confirm_context is provided, after successful execution the ReAct loop
    resumes — enabling multi-step chaining (e.g. create customer → create product → create quotation).
    """
    tool = get_tool_by_name(tool_name)
    if not tool:
        yield f"Lỗi: Không tìm thấy tool '{tool_name}'"
        return

    logger.info(f"[{request_id}] Executing confirmed: {tool_name}({params})")
    result = _call_backend_api(tool, params, jwt_token)
    if result.get("success", True) and "error" not in result:
        friendly_names = {
            "create_leave_request": "Đơn xin nghỉ phép đã được tạo thành công! 🎉",
            "approve_leave_request": "Đơn nghỉ phép đã được duyệt thành công! ✅",
            "create_purchase_request": "Yêu cầu mua hàng đã được tạo thành công! 🎉",
            "create_task": "Nhiệm vụ đã được giao thành công! 🎉",
            "create_customer": "Khách hàng mới đã được thêm thành công! 🎉",
            "create_supplier": "Nhà cung cấp mới đã được thêm thành công! 🎉",
            "create_product": "Sản phẩm mới đã được tạo thành công! 🎉",
            "create_quotation_request": "Yêu cầu báo giá đã được tạo thành công! 🎉",
            "create_supply_request": "Yêu cầu cung ứng đã được tạo thành công! 🎉",
            "create_daily_work_report": "Báo cáo công việc đã được ghi nhận! 🎉",
            "create_customer_feedback": "Phản hồi khách hàng đã được ghi nhận! 🎉",
            "create_repair_request": "Yêu cầu sửa chữa đã được tạo thành công! 🎉",
        }
        msg = friendly_names.get(tool_name, f"Đã thực hiện thành công! ✅")
        yield msg

        # Resume ReAct loop if context provided (multi-step chaining)
        if confirm_context:
            logger.info(f"[{request_id}] Resuming ReAct loop after {tool_name} (chaining)")
            # Build resume messages: original conversation (with history) + this tool result
            stored_history = confirm_context.get("history", [])
            resume_messages = _build_react_messages(
                confirm_context["message"],
                stored_history,
                confirm_context["today"],
            )
            # Add the confirmed tool call + result so agent knows what was done
            resume_messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [{
                    "id": "confirmed_action",
                    "type": "function",
                    "function": {"name": tool_name, "arguments": json.dumps(params, ensure_ascii=False)}
                }]
            })
            result_str = json.dumps(result, ensure_ascii=False)
            if len(result_str) > MAX_TOOL_RESULT_CHARS:
                result_str = result_str[:MAX_TOOL_RESULT_CHARS] + "...(truncated)"
            resume_messages.append({
                "role": "tool",
                "tool_call_id": "confirmed_action",
                "content": result_str,
            })
            # Add a nudge so model continues to next step instead of asking user
            resume_messages.append({
                "role": "user",
                "content": "Đã xong bước này. Tiếp tục thực hiện bước tiếp theo trong yêu cầu ban đầu. Không cần hỏi lại.",
            })
            # Continue the ReAct loop — may yield another confirm or final text
            yield "\n\n"
            yield from execute_stream(
                message=confirm_context["message"],
                history=stored_history,
                role=confirm_context["role"],
                jwt_token=jwt_token,
                today=confirm_context["today"],
                department=confirm_context.get("department", ""),
                request_id=request_id,
                _resume_messages=resume_messages,
            )
    else:
        error_msg = result.get('error', result.get('message', 'Lỗi không xác định'))
        logger.error(f"[{request_id}] Confirmed action failed: {error_msg}")
        yield f"😔 Rất tiếc, thao tác không thành công. Hệ thống gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra."
