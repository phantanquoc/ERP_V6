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
from agent.registry import get_tools_for_role, get_tools_for_department, get_tool_by_name, to_openai_tools
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
MAX_HISTORY_MESSAGES = 20  # keep last 20 messages (10 turns)
MAX_HISTORY_CHARS = 6000  # summarize oldest if total history content exceeds this
TERMINAL_CONFIRMED_TOOLS = {"create_flowchart"}

REACT_SYSTEM = """You are a smart ERP assistant for An Binh Foods (Vietnamese dried fruit manufacturer). You help employees perform operations and answer questions about the system.

USER INFO:
- Department: {department_name}
- Role: {role}
- Accessible modules: {accessible_modules}

RULES:

1. SCOPE: Only operate within the user's accessible modules. If a request falls outside their scope, reply: "Chức năng này thuộc bộ phận [department name], bạn không có quyền truy cập module này."

2. THINK before acting: Always use <think> tags to reason about:
   - What the user actually wants
   - What info is needed
   - Whether it's within the user's scope
   - Which tool(s) to call (or answer directly)
   - If you have tool results: analyze the data

3. TOOL USAGE:
   - Call tools immediately when data is needed — never say "let me check" without calling a tool.
   - Chain tools automatically: if a task requires multiple steps (e.g., create customer → create product → create quotation), complete all steps without asking "do you want to continue?".
   - Exception: For important destructive actions (delete, approve payment, transfer), ASK for confirmation first.
   - Skip optional fields — only ask for required ones.
   - When listing records, show ALL results from the tool — never filter or truncate.
   - Use `search_knowledge` for guides/SOPs/how-to questions.
   - Use other tools for actual data operations.

4. FILE UPLOAD:
   - When file content appears in context (marked [Nội dung file đã upload]), use it for your response.
   - When user says "tạo [entity] từ file": Read file → extract structured data → call the corresponding create tool.
   - For process creation: 2 steps required:
     Step 1: create_process → get process ID
     Step 2: create_flowchart with process ID + extracted sections
   - Extracting flowchart sections:
     + Find tables with "Nội dung" or "Quy trình thực hiện" columns
     + Copy FULL content from those columns into noiDungCongViec — do NOT summarize
     + Each table row = one section: phanDoan = STT, tenPhanDoan = short title, noiDungCongViec = full text
   - Always show a preview before creating, then ask user to confirm.

5. RESPONSE FORMAT:
   - Always reply in Vietnamese, friendly and concise.
   - Lists (>3 items): use Markdown tables.
   - Single record: bullet points with **bold** labels.
   - Create/update/delete: brief confirmation + identifier.
   - Stats: number + status indicator.
   - End with 1-2 suggested follow-up questions.
   - Dates in display: DD/MM/YYYY. Dates as parameters: YYYY-MM-DD.
   - Currency: dot separators (12.000.000đ).
   - Hide technical fields (IDs, timestamps) from display.
   - Status values in English: pending/approved/rejected.

6. ERROR HANDLING:
   - 404: Ask user to verify, suggest searching first.
   - 400: Show specific validation error, suggest fix.
   - 500: "Hệ thống gặp sự cố, vui lòng thử lại sau."
   - Never expose technical errors (stack traces, SQL) to users.

7. DEPARTMENT SCOPE:
   - Only perform actions within the user's accessible modules.
   - If request is outside scope: "Chức năng này thuộc bộ phận [tên bộ phận phụ trách], bạn không có quyền truy cập module này."
   - Navigation: Common features → "Chung" menu. Dept features → dept name on sidebar.

8. DATE REASONING (today: {today}, weekday: {weekday}):
   - "hôm nay" → {today}
   - "tuần này" → {mon} to {sun}
   - "tháng này" → {year}-{month}-01 to end of {month}
   - "ngày mai" → {tomorrow}
   - "tháng N" → {year}-MM-01 to {year}-MM-end of month"""


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


def _format_think_for_streaming(text: str) -> str:
    """Convert <think> tags to visible markers for frontend display.
    
    Converts: <think>reasoning</think> → [THINK:reasoning]
    The frontend will parse [THINK:...] and render it as a collapsible thinking section.
    """
    if not text:
        return text
    def _replace_think(match):
        content = match.group(1).strip()
        # Truncate very long thinking to keep UI clean
        if len(content) > 500:
            content = content[:500] + "..."
        return f"\n[THINK:{content}]\n"
    return _THINK_RE.sub(_replace_think, text).strip()

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

# Third format: <tool_calls_begin><tool_call_begin>function<tool_sep>tool_name\n```json\n{json}\n```<tool_call_end><tool_calls_end>
_TEXT_TOOL_CALL_RE3 = re.compile(
    r"<tool_call_begin>function<tool_sep>(\w+)\s*\n```json\s*\n(\{.*?\})\s*\n```",
    re.DOTALL,
)


def _is_text_tool_call(text: str) -> bool:
    """Detect if text contains a tool call output (any format)."""
    return "<function>" in text or "\uff5c" in text or "<tool_call_begin>" in text


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
        # Try format 3: <tool_call_begin>function<tool_sep>tool_name\n```json\n{json}\n```
        matches = list(_TEXT_TOOL_CALL_RE3.finditer(text))
    if not matches:
        return None
    # Use last match (most relevant to current message)
    match = matches[-1]
    fn_name = match.group(1).strip()
    try:
        fn_args = json.loads(match.group(2))
    except (json.JSONDecodeError, ValueError):
        fn_args = {}
    
    # Fix: DeepSeek sometimes outputs array params as Python list strings
    # Convert string representations of lists to actual lists
    for key, val in fn_args.items():
        if isinstance(val, str) and val.startswith("[") and val.endswith("]"):
            try:
                # Try to parse as JSON array (with escaped quotes)
                parsed = json.loads(val.replace('\\"', '"').replace("\\'", "'"))
                if isinstance(parsed, list):
                    fn_args[key] = parsed
            except (json.JSONDecodeError, ValueError):
                try:
                    # Try to parse as Python literal
                    import ast
                    parsed = ast.literal_eval(val)
                    if isinstance(parsed, list):
                        fn_args[key] = parsed
                except (ValueError, SyntaxError):
                    pass
    
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

_DEPARTMENT_NAMES: dict[str, str] = {
    "DEPT_GENERAL": "Bộ phận tổng hợp",
    "DEPT_QUALITY": "Bộ phận chất lượng",
    "DEPT_BUSINESS": "Bộ phận kinh doanh",
    "DEPT_ACCOUNTING": "Bộ phận kế toán",
    "DEPT_PURCHASING": "Bộ phận thu mua",
    "DEPT_PRODUCTION": "Bộ phận sản xuất",
    "DEPT_TECHNICAL": "Bộ phận kỹ thuật",
}

_DEPARTMENT_MODULES: dict[str, str] = {
    "DEPT_GENERAL": "Chung, Bộ phận tổng hợp",
    "DEPT_QUALITY": "Chung, Bộ phận chất lượng",
    "DEPT_BUSINESS": "Chung, Bộ phận kinh doanh",
    "DEPT_ACCOUNTING": "Chung, Bộ phận kế toán",
    "DEPT_PURCHASING": "Chung, Bộ phận thu mua",
    "DEPT_PRODUCTION": "Chung, Bộ phận sản xuất",
    "DEPT_TECHNICAL": "Chung, Bộ phận kỹ thuật",
}


def _get_department_display_info(department: str, role: str, secondary_departments: list = None) -> tuple[str, str]:
    """Get display name and accessible modules for department context in system prompt."""
    if role.upper() == "ADMIN":
        return "Quản trị viên (toàn quyền)", "Tất cả module"
    dept_name = _DEPARTMENT_NAMES.get(department, department or "Không xác định")
    modules = _DEPARTMENT_MODULES.get(department, "Chung")
    if secondary_departments:
        sec_names = [_DEPARTMENT_NAMES.get(d, d) for d in secondary_departments if d != department]
        if sec_names:
            dept_name += f" (phụ: {', '.join(sec_names)})"
            sec_modules = [_DEPARTMENT_MODULES.get(d, "").replace("Chung, ", "") for d in secondary_departments if d != department]
            modules += ", " + ", ".join(m for m in sec_modules if m)
    return dept_name, modules


def _build_react_messages(message: str, history: list, today: str, department: str = "", role: str = "", secondary_departments: list = None, topic_switched: bool = False) -> list:
    """Build message list for ReAct loop."""
    weekday = _get_weekday_name(today)
    mon, sun = _get_week_range(today)
    year = today[:4]
    month = today[5:7]
    d = datetime.date.fromisoformat(today)
    tomorrow = (d + datetime.timedelta(days=1)).isoformat()

    department_name, accessible_modules = _get_department_display_info(department, role, secondary_departments)

    system_content = REACT_SYSTEM.format(
        today=today, weekday=weekday, mon=mon, sun=sun,
        year=year, month=month, tomorrow=tomorrow,
        department_name=department_name, role=role,
        accessible_modules=accessible_modules,
    )

    messages = [{"role": "system", "content": system_content}]

    # On topic switch: clear stale history to avoid confusing the model
    if topic_switched:
        effective_history = []
    else:
        effective_history = list(history[-MAX_HISTORY_MESSAGES:])
        # Summarize old messages if total content too long (save tokens)
        total_chars = sum(
            len(h.content if hasattr(h, 'content') else h.get('content', ''))
            for h in effective_history
        )
        if total_chars > MAX_HISTORY_CHARS:
            effective_history = _summarize_old_messages(
                [{"role": h.role if hasattr(h, 'role') else h.get('role', ''),
                  "content": h.content if hasattr(h, 'content') else h.get('content', '')}
                 for h in effective_history],
                keep_recent=10
            )

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
        messages.append({"role": role, "content": content})
        i += 1

    messages.append({"role": "user", "content": message})
    return messages


def _summarize_old_messages(messages: list, keep_recent: int = 10) -> list:
    """Summarize old messages to save context window. Keep recent messages intact."""
    if len(messages) <= keep_recent:
        return messages

    old_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]

    # Build a summary of old conversation
    summary_parts = []
    for msg in old_messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if not content:
            continue
        if role == "user":
            # Keep first 100 chars of user messages
            summary_parts.append(f"User: {content[:100]}...")
        elif role == "assistant":
            # Keep first 50 chars of assistant messages
            summary_parts.append(f"Agent: {content[:50]}...")

    if summary_parts:
        summary = "[Tóm tắt cuộc hội thoại trước]: " + " | ".join(summary_parts[-5:])
        return [{"role": "user", "content": summary}] + recent_messages

    return recent_messages


def _coerce_params(tool: dict, params: dict) -> dict:
    """Coerce param types theo schema (LLM đôi khi trả string cho integer fields)."""
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
                        and not (isinstance(v, list) and len(v) > 10)}
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


def _read_uploaded_files(uploaded_files: list) -> str:
    """Read content from uploaded files and return as context string."""
    import httpx
    # Call AI service directly (agent runs inside AI service)
    ai_service_url = os.environ.get("AI_SERVICE_URL", "http://localhost:8001")
    file_contents = []
    
    for file_info in uploaded_files:
        file_id = file_info.get("file_id", "")
        filename = file_info.get("filename", "unknown")
        if not file_id:
            continue
        
        try:
            # Call the docs/extract endpoint to get file content
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(f"{ai_service_url}/docs/extract/{file_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data.get("raw_text", "")
                    if raw_text:
                        # Truncate to reasonable length for LLM context
                        truncated = raw_text[:8000]
                        file_contents.append(f"=== File: {filename} ===\n{truncated}\n=== End of {filename} ===")
        except Exception as e:
            logger.warning(f"Failed to read file {filename}: {e}")
            file_contents.append(f"=== File: {filename} ===\n[Không thể đọc nội dung file]\n=== End of {filename} ===")
    
    return "\n\n".join(file_contents) if file_contents else ""


def _extract_employee_names(messages: list) -> dict:
    """Extract employee id→name mapping from tool results in message history."""
    names = {}
    for msg in messages:
        if msg.get("role") not in ("tool", "user"):
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
        "create_flowchart": "tạo lưu đồ quy trình",
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
        # Special handling for flowchart sections array
        if k == "sections" and isinstance(v, list) and len(v) > 0:
            desc_parts.append(f"- **Số phân đoạn**: {len(v)}")
            for idx, section in enumerate(v):
                if isinstance(section, dict):
                    phanDoan = section.get("phanDoan", str(idx + 1))
                    tenPhanDoan = section.get("tenPhanDoan", "")
                    noiDung = section.get("noiDungCongViec", "")
                    # Truncate long content for preview
                    noiDung_preview = noiDung[:120] + "..." if len(noiDung) > 120 else noiDung
                    desc_parts.append(f"  **Phân đoạn {phanDoan}**: {tenPhanDoan}\n  {noiDung_preview}")
        else:
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


def _format_tool_result_summary(tool_name: str, result: dict) -> str:
    """Generate a brief summary of tool results for the LLM to use."""
    if not result.get("success", True):
        return f"Lỗi: {result.get('message', 'Không xác định')}"

    data = result.get("data", result)
    if isinstance(data, list):
        count = len(data)
        if count == 0:
            return "Không tìm thấy kết quả nào"
        return f"Tìm thấy {count} kết quả"
    elif isinstance(data, dict):
        if "total" in data:
            return f"Tổng cộng: {data['total']} bản ghi"
        return "Đã lấy dữ liệu thành công"
    return "Đã xử lý xong"


_suggestions_map = {
    "list_orders": "\n\n💡 **Gợi ý:** Xem chi tiết đơn hàng [mã] | Tạo đơn hàng mới | Xuất Excel",
    "list_leave_requests": "\n\n💡 **Gợi ý:** Duyệt đơn nghỉ phép | Xem lịch sử | Tạo đơn mới",
    "list_customers": "\n\n💡 **Gợi ý:** Xem chi tiết khách hàng | Tạo khách hàng mới | Xem báo giá",
    "list_employees": "\n\n💡 **Gợi ý:** Xem chi tiết nhân viên | Giao nhiệm vụ | Xem đánh giá",
    "list_purchase_requests": "\n\n💡 **Gợi ý:** Duyệt yêu cầu | Tạo yêu cầu mới | Xem lịch sử",
    "search_knowledge": "\n\n💡 **Gợi ý:** Bạn có thể hỏi thêm \"Cách thực hiện [thao tác cụ thể]\"",
}


def _default_suggestion(text: str) -> str:
    """Add default suggestion if none matched."""
    if len(text) > 100 and "💡" not in text:
        return text + "\n\n💡 **Gợi ý:** Hỏi thêm chi tiết hoặc thực hiện thao tác liên quan"
    return text


def _add_suggestions(text: str, messages: list) -> str:
    """Add contextual suggestions to the response."""
    # Don't add suggestions if response already has them
    if "💡" in text or "Gợi ý:" in text:
        return text

    # Extract last tool name from messages
    last_tool = None
    for msg in reversed(messages):
        if isinstance(msg, dict) and msg.get("tool_calls"):
            tc = msg["tool_calls"][0]
            last_tool = tc.get("function", {}).get("name")
            break

    if last_tool and last_tool in _suggestions_map:
        return text + _suggestions_map[last_tool]

    return _default_suggestion(text)


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
    department: str = "", secondary_departments: list = None, request_id: str = "",
    _resume_messages: list = None, uploaded_files: list = None,
) -> Generator[str, None, None]:
    """
    ReAct agent executor — Think → Act → Observe loop.
    Max 5 iterations. Streams final text response.

    _resume_messages / _resume_result: internal params for chaining write actions.
    When resuming after a confirmed write, we inject the previous result into messages.
    uploaded_files: list of {file_id, filename} from frontend upload
    """
    if not _openrouter_client:
        yield "Lỗi: AI service chưa được cấu hình (cần OPENROUTER_API_KEY)"
        return

    # If uploaded files exist, read their content and inject into context
    file_context = ""
    if uploaded_files:
        file_context = _read_uploaded_files(uploaded_files)

    available_tools = get_tools_for_role(role)
    available_tools = get_tools_for_department(available_tools, department, role, secondary_departments)
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

        messages = _build_react_messages(message, history, today, department=department, role=role, secondary_departments=secondary_departments, topic_switched=topic_switched)

    # Inject file content into context if files were uploaded
    if file_context:
        # Add file content as a system context message
        messages.insert(1, {"role": "user", "content": f"[Nội dung file đã upload]:\n{file_context}"})
        logger.info(f"[{request_id}] Injected {len(uploaded_files or [])} file(s) into context")

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
            logger.error(f"[{request_id}] OpenRouter API error (iteration {iteration}): {e}")
            yield _friendly_error(e)
            return

        choice = resp.choices[0]

        # Model returns text (final answer or asking for more info)
        if choice.message.content and not choice.message.tool_calls:
            text = _strip_think_tags(choice.message.content)

            # If content was only <think> tags (stripped to empty), retry
            if not text:
                logger.info(f"[{request_id}] Model returned only <think> without tool call, retrying")
                messages.append({"role": "assistant", "content": text or " "})
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
                            "secondary_departments": secondary_departments,
                            "today": today,
                            "uploaded_files": uploaded_files or [],
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
                    messages.append({"role": "assistant", "content": text})
                    messages.append({"role": "user", "content": f"[Kết quả {fn_name}]: {result_str}\n\nHãy trả lời dựa trên dữ liệu trên."})
                    continue

            # Retry if model returns a "processing" message instead of calling tools
            if iteration < MAX_ITERATIONS - 1 and _is_stalling_response(text):
                logger.info(f"[{request_id}] Model stalling ('{text[:50]}...'), retrying with nudge")
                messages.append({"role": "assistant", "content": text})
                messages.append({"role": "user", "content": "Gọi tool ngay để lấy dữ liệu. Không trả lời text."})
                continue

            # Fallback: if text still contains <function> tag (unparsed), retry
            if "<function>" in text and iteration < 2:
                logger.info(f"[{request_id}] Text contains unparsed <function> tag, retrying")
                messages.append({"role": "assistant", "content": text})
                messages.append({"role": "user", "content": "KHÔNG output <function> tag. Hãy sử dụng tool calling API đúng cách."})
                continue

            yield _add_suggestions(text, messages)
            return

        # Model returns tool call (any <think> content is logged/stripped, not streamed)
        if choice.message.tool_calls:
            tc = choice.message.tool_calls[0]
            fn_name = tc.function.name
            try:
                fn_args = json.loads(tc.function.arguments) if tc.function.arguments else {}
            except json.JSONDecodeError:
                logger.warning(f"[{request_id}] Malformed tool arguments for {fn_name}: {tc.function.arguments!r}")
                fn_args = {}

            tool = get_tool_by_name(fn_name)
            if not tool:
                yield f"Lỗi: Tool '{fn_name}' không tồn tại."
                return

            fn_args = _coerce_params(tool, fn_args)
            logger.info(f"[{request_id}] ReAct [{iteration+1}/{MAX_ITERATIONS}] → {fn_name}({fn_args})")

            # Yield tool call progress indicator
            tool_display_name = {
                "get_my_profile": "Lấy thông tin người dùng",
                "get_attendance_by_date": "Tra cứu chấm công",
                "list_leave_requests": "Xem đơn nghỉ phép",
                "create_leave_request": "Tạo đơn nghỉ phép",
                "list_orders": "Tra cứu đơn hàng",
                "list_customers": "Tra cứu khách hàng",
                "create_customer": "Tạo khách hàng mới",
                "list_suppliers": "Tra cứu nhà cung cấp",
                "create_supplier": "Tạo nhà cung cấp mới",
                "list_processes": "Tra cứu quy trình",
                "create_process": "Tạo quy trình mới",
                "create_flowchart": "Tạo lưu đồ quy trình",
                "search_knowledge": "Tìm kiếm kiến thức",
                "get_leave_balance": "Xem số ngày phép",
                "create_task": "Tạo nhiệm vụ",
                "list_employees": "Tra cứu nhân viên",
                "create_purchase_request": "Tạo yêu cầu mua hàng",
            }.get(fn_name, f"Thực hiện {fn_name}")
            yield f"[TOOL_CALL:{tool_display_name}]\n\n"

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
                    "secondary_departments": secondary_departments,
                    "today": today,
                    "uploaded_files": uploaded_files or [],
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
    if result.get("success") is not False and "error" not in result:
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
            "create_flowchart": "Lưu đồ quy trình đã được tạo thành công! 🎉",
        }
        msg = friendly_names.get(tool_name, f"Đã thực hiện thành công! ✅")
        yield msg

        # Resume only when the confirmed write can be followed by another step.
        # Flowchart creation is the terminal step for process-from-file flows.
        if confirm_context and tool_name not in TERMINAL_CONFIRMED_TOOLS:
            logger.info(f"[{request_id}] Resuming ReAct loop after {tool_name} (chaining)")
            # Build resume messages: original conversation (with history) + this tool result
            stored_history = confirm_context.get("history", [])
            resume_messages = _build_react_messages(
                confirm_context["message"],
                stored_history,
                confirm_context["today"],
                department=confirm_context.get("department", ""),
                role=confirm_context.get("role", ""),
                secondary_departments=confirm_context.get("secondary_departments"),
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
                uploaded_files=confirm_context.get("uploaded_files", []),
            )
    else:
        error_msg = result.get('error', result.get('message', 'Lỗi không xác định'))
        logger.error(f"[{request_id}] Confirmed action failed: {error_msg}")
        yield f"😔 Rất tiếc, thao tác không thành công. Hệ thống gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra."
