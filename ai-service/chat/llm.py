"""LLM calls (Groq), query rewrite, synonym expansion, message building."""

import re
import time

from config import logger, GROQ_API_KEY, GROQ_MODEL, GROQ_GRADER_MODEL

SYSTEM_PROMPT = """Bạn là trợ lý ERP An Binh Foods. Hướng dẫn nhân viên sử dụng hệ thống theo ngôn ngữ người dùng thông thường.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên thông tin có trong CONTEXT bên dưới. Nếu CONTEXT không chứa thông tin để trả lời → BẮT BUỘC nói: "Tôi không tìm thấy thông tin về [chủ đề] trong tài liệu. Vui lòng liên hệ quản trị viên hoặc trưởng phòng."
2. TUYỆT ĐỐI KHÔNG được suy luận, đoán, hay bịa đặt đường dẫn menu/tab/nút nếu không thấy rõ ràng trong CONTEXT.
3. TUYỆT ĐỐI không dùng tên kỹ thuật/component như: Modal, Component, Tab ID, camelCase, PascalCase
   - SAI: "Mở PrivateFeedbackModal", "vào QuotationRequestManagement", "tab quotationRequests"
   - ĐÚNG: "Nhấn nút **Góp ý riêng**", "vào tab **Danh sách yêu cầu BG**"
4. Dùng đúng tên hiển thị trên giao diện (in đậm), ví dụ:
   - Tên menu/tab: **Chức năng chung**, **Danh sách yêu cầu BG**, **Bộ phận chất lượng**
   - Tên nút: **"Thêm mới"**, **"Lưu"**, **"Xin nghỉ phép"**, **"Góp ý riêng"**
   - Tên trường: **Loại nghỉ phép**, **Ngày bắt đầu**, **Lý do**
5. Hướng dẫn theo đường dẫn thực tế: Menu → Tab → Nút → Form
6. Trường bắt buộc ghi ✅, không bắt buộc bỏ qua
7. Sau câu trả lời, gợi ý 1-2 câu hỏi tiếp theo ngắn gọn

VÍ DỤ ĐÚNG:
Câu hỏi: "Tôi muốn góp ý với sếp"
Trả lời:
Vào menu **Chức năng chung** → nhấn **"Góp ý riêng"**. Điền:
- **Nội dung góp ý** ✅
- **Mục đích góp ý** ✅
- Ghi chú, File đính kèm (tùy chọn)
Nhấn **"Gửi"** để hoàn tất.

Bạn có thể hỏi thêm: "Ai có thể xem góp ý của tôi?" hoặc "Nêu khó khăn khác với Góp ý riêng như thế nào?"

VÍ DỤ ĐÚNG:
Câu hỏi: "Tạo YCBG như thế nào?"
Trả lời:
Vào **Bộ phận kinh doanh** → tab **Danh sách yêu cầu BG** → nhấn **"Thêm yêu cầu báo giá"**. Điền:
- **Khách hàng** ✅ — chọn từ danh sách
- **Sản phẩm** ✅ — nhấn **"Thêm sản phẩm"** để thêm dòng, điền Số lượng ✅ và Đơn vị tính ✅
- Hình thức vận chuyển, thanh toán, Ghi chú (tùy chọn)
Nhấn **"Tạo mới"** để lưu.

Bạn có thể hỏi thêm: "Hình thức thanh toán có những lựa chọn nào?" hoặc "Sau khi tạo YCBG thì làm gì tiếp?"
"""

SYNONYMS = {
    "đh": "đơn hàng",
    "ncc": "nhà cung cấp",
    "nvl": "nguyên vật liệu",
    "kh": "khách hàng",
    "nv": "nhân viên",
    "sl": "số lượng",
    "đvt": "đơn vị tính",
    "tt": "thanh toán",
    "sx": "sản xuất",
    "kd": "kinh doanh",
}


_REWRITE_PROMPT = """Bạn là query rewriter cho hệ thống ERP An Binh Foods.
Nhiệm vụ: viết lại câu hỏi của nhân viên thành dạng rõ ràng, đầy đủ hơn để tìm kiếm tài liệu.

QUY TẮC:
- Giữ nguyên ý nghĩa gốc, KHÔNG thêm thông tin mới
- Mở rộng viết tắt, thêm từ đồng nghĩa liên quan
- Nếu câu hỏi đã rõ ràng → trả về nguyên văn
- CHỈ trả về câu hỏi đã rewrite, không giải thích

Ví dụ:
- "tạo ycbg" → "hướng dẫn tạo yêu cầu báo giá, các bước và trường cần điền"
- "xóa nv" → "cách xóa nhân viên khỏi hệ thống, quy trình xóa nhân viên"
- "quy trình đặt hàng quốc tế" → "quy trình đặt hàng quốc tế"
"""


def expand_query(message: str) -> str:
    expanded = message.lower()
    for abbr, full in SYNONYMS.items():
        expanded = re.sub(rf"\b{abbr}\b", full, expanded)
    return message if expanded == message.lower() else f"{message} {expanded}"


def rewrite_query(message: str) -> str:
    """Rewrite query mơ hồ/ngắn thành dạng rõ ràng hơn. Fail-safe: trả về original."""
    words = message.split()
    if len(message) > 60 or len(words) > 8:
        return message

    if not GROQ_API_KEY:
        return message

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        resp = client.chat.completions.create(
            model=GROQ_GRADER_MODEL,
            messages=[
                {"role": "system", "content": _REWRITE_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0.0,
            max_tokens=100,
        )
        rewritten = resp.choices[0].message.content.strip()
        if rewritten and len(rewritten) < 200:
            logger.info(f"Query rewrite: '{message}' → '{rewritten}'")
            return rewritten
        return message
    except Exception as e:
        logger.warning(f"Query rewrite failed (using original): {e}")
        return message


def call_llm(messages: list[dict]) -> str:
    """Gọi Groq LLM với retry khi rate limit."""
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=600,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str:
                if "tokens per day" in err_str or "TPD" in err_str:
                    logger.error("Groq daily token limit reached")
                    raise RuntimeError("DAILY_LIMIT_REACHED")
                if attempt < 2:
                    wait = (attempt + 1) * 5
                    logger.warning(f"Groq rate limit, retry in {wait}s (attempt {attempt + 1})")
                    time.sleep(wait)
                else:
                    raise
            else:
                raise


def stream_llm(messages: list[dict]):
    """Generator: yield từng token từ Groq LLM."""
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)
    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=600,
        stream=True,
    )
    for chunk in stream:
        token = chunk.choices[0].delta.content or ""
        if token:
            yield token


def build_messages(req, chunks: list[dict]) -> list[dict]:
    """Build LLM messages with context from retrieved chunks."""
    content_chunks = [c for c in chunks if c.get("metadata", {}).get("type") != "table_summary"]
    if not content_chunks:
        content_chunks = chunks

    MAX_CHUNKS = 6
    MAX_CHUNK_CHARS = 800
    trimmed = []
    for c in content_chunks[:MAX_CHUNKS]:
        text = c["text"]
        if len(text) > MAX_CHUNK_CHARS:
            text = text[:MAX_CHUNK_CHARS] + "\n...(còn nữa)"
        trimmed.append(text)

    context = "\n\n---\n\n".join(trimmed)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in req.history[-4:]:
        messages.append({"role": h.role, "content": h.content})
    role_line = f"[Vai trò: {req.role}] " if req.role else ""
    messages.append({"role": "user", "content": (
        f"CONTEXT:\n{context}\n\n---\n\n"
        f"LƯU Ý: Nếu CONTEXT ở trên KHÔNG chứa thông tin liên quan đến câu hỏi, "
        f"hãy trả lời: 'Tôi không tìm thấy thông tin này trong tài liệu.'\n\n"
        f"{role_line}CÂU HỎI: {req.message}"
    )})
    return messages
