"""Agent executor — function calling via Groq + backend API execution."""

import json
import httpx
from typing import Generator

from groq import Groq

from config import logger, GROQ_API_KEY, GROQ_MODEL
from agent.models import AgentAction
from agent.registry import get_tools_for_role, get_tool_by_name, to_groq_tools

_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

BACKEND_API_URL = "http://backend:3000"

EXECUTOR_SYSTEM = """Bạn là trợ lý ERP thông minh. Bạn giúp nhân viên thực hiện các thao tác trên hệ thống ERP.

Quy tắc:
- Sử dụng tools được cung cấp để thực hiện yêu cầu
- Nếu thiếu thông tin bắt buộc, hỏi lại user
- Trả lời bằng tiếng Việt
- Với ngày tháng: nếu user nói "hôm nay", "tuần này", "tháng này" → tính từ ngày hiện tại
- Format kết quả dễ đọc (dùng bullet points, bảng nếu cần)

Ngày hiện tại: {today}"""


def _build_messages(message: str, history: list, today: str) -> list:
    """Build message list for Groq API."""
    messages = [{"role": "system", "content": EXECUTOR_SYSTEM.format(today=today)}]
    for h in history[-6:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})
    return messages


def _call_backend_api(tool: dict, params: dict, jwt_token: str) -> dict:
    """Execute API call to backend with user's JWT."""
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
        with httpx.Client(timeout=30.0) as client:
            if tool["method"] == "GET":
                resp = client.get(url, params=query, headers=headers)
            elif tool["method"] == "POST":
                resp = client.post(url, json=body, params=query, headers=headers)
            elif tool["method"] == "PATCH":
                resp = client.patch(url, json=body, params=query, headers=headers)
            elif tool["method"] == "PUT":
                resp = client.put(url, json=body, params=query, headers=headers)
            elif tool["method"] == "DELETE":
                resp = client.delete(url, params=query, headers=headers)
            else:
                return {"success": False, "error": f"Unsupported method: {tool['method']}"}

        if resp.status_code >= 400:
            return {"success": False, "error": f"API error {resp.status_code}: {resp.text[:200]}"}
        return resp.json()
    except Exception as e:
        logger.error(f"Backend API call failed: {e}")
        return {"success": False, "error": str(e)}


def _format_api_result(tool_name: str, data: dict) -> str:
    """Format API response into readable Vietnamese text."""
    if not data.get("success", True):
        return f"Lỗi: {data.get('error', data.get('message', 'Không xác định'))}"

    result_data = data.get("data", data)

    if isinstance(result_data, list):
        if not result_data:
            return "Không có dữ liệu."
        count = len(result_data)
        preview = json.dumps(result_data[:5], ensure_ascii=False, indent=2)
        suffix = f"\n\n... và {count - 5} mục khác." if count > 5 else ""
        return f"Tìm thấy {count} kết quả:\n\n```json\n{preview}\n```{suffix}"

    if isinstance(result_data, dict):
        return f"```json\n{json.dumps(result_data, ensure_ascii=False, indent=2)}\n```"

    return str(result_data)


def execute_confirmed(tool_name: str, params: dict, jwt_token: str) -> Generator[str, None, None]:
    """Execute a confirmed write action and stream result."""
    tool = get_tool_by_name(tool_name)
    if not tool:
        yield f"Lỗi: Không tìm thấy tool '{tool_name}'"
        return

    result = _call_backend_api(tool, params, jwt_token)
    if result.get("success", True) and "error" not in result:
        yield f"Đã thực hiện thành công: {tool['description']}\n\n"
        yield _format_api_result(tool_name, result)
    else:
        yield f"Thất bại: {result.get('error', result.get('message', 'Lỗi không xác định'))}"


def execute_stream(message: str, history: list, role: str, jwt_token: str, today: str) -> Generator[str, None, None]:
    """
    Main agent executor — stream response.
    Uses Groq function calling to determine which tool to use, then executes or returns confirm action.
    """
    if not _client:
        yield "Lỗi: AI service chưa được cấu hình (thiếu GROQ_API_KEY)"
        return

    available_tools = get_tools_for_role(role)
    groq_tools = to_groq_tools(available_tools)
    messages = _build_messages(message, history, today)

    try:
        resp = _client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=groq_tools,
            tool_choice="auto",
            temperature=0.1,
            max_tokens=1024,
        )
    except Exception as e:
        logger.error(f"Groq function calling error: {e}")
        yield f"Lỗi khi xử lý yêu cầu: {str(e)}"
        return

    choice = resp.choices[0]

    # Model returns text (asking for more info or general response)
    if choice.message.content and not choice.message.tool_calls:
        yield choice.message.content
        return

    # Model returns tool calls
    if choice.message.tool_calls:
        tool_call = choice.message.tool_calls[0]
        fn_name = tool_call.function.name
        fn_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}

        tool = get_tool_by_name(fn_name)
        if not tool:
            yield f"Lỗi: Tool '{fn_name}' không tồn tại."
            return

        # Write action → return confirm
        if tool.get("is_write"):
            desc_parts = [f"- **{k}**: {v}" for k, v in fn_args.items()]
            confirm_msg = f"Tôi sẽ thực hiện: **{tool['description']}**\n\n" + "\n".join(desc_parts)
            yield confirm_msg
            action = AgentAction(
                type="confirm",
                tool=fn_name,
                params=fn_args,
                message=confirm_msg,
            )
            yield f"\n\n__AGENT_ACTION__\n{action.model_dump_json()}\n"
            return

        # Export action → return download URL
        if tool.get("is_export"):
            # Build export URL for frontend to download directly
            export_path = tool["path"]
            query_parts = []
            for k, v in fn_args.items():
                query_parts.append(f"{k}={v}")
            query_string = "&".join(query_parts)
            export_url = f"/api{export_path}" if not export_path.startswith("/api") else export_path
            if query_string:
                export_url += f"?{query_string}"

            filename = f"{fn_name}_{today}.xlsx"
            yield f"File Excel đã sẵn sàng để tải xuống."
            action = AgentAction(
                type="export",
                tool=fn_name,
                params=fn_args,
                url=export_url,
                filename=filename,
            )
            yield f"\n\n__AGENT_ACTION__\n{action.model_dump_json()}\n"
            return

        # Read action → execute immediately
        result = _call_backend_api(tool, fn_args, jwt_token)
        formatted = _format_api_result(fn_name, result)
        yield formatted
        return

    # Fallback
    yield choice.message.content or "Tôi không hiểu yêu cầu. Vui lòng thử lại."
