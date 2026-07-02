# CLAUDE.md

@AGENTS.md

> Full project rules, conventions, và verification commands nằm trong `AGENTS.md` (tự động include ở trên).
> File này chỉ chứa hướng dẫn Claude-specific không có trong AGENTS.md.

---

## Subagents

Spawn subagents để cô lập context, song song hóa công việc độc lập, hoặc offload các task cơ học số lượng lớn. Không spawn khi parent cần reasoning, khi synthesis cần giữ mọi thứ lại với nhau, hoặc khi overhead spawn lớn hơn lợi ích.

**Model**: Tất cả 8 OSF subagent (`~/.claude/agents/osf-*.md`) đã pin `model: "opus"`. Ưu tiên chất lượng + hiệu suất hoàn thành. Nếu gặp compact/rate-limit trong 1 task: (1) chia task nhỏ ra thay vì 1 spawn lớn, (2) prompt subagent scope hẹp — không paste toàn spec, (3) ưu tiên gitnexus/codebase-retrieval thay vì Read nguyên file.

Parent (main assistant) sở hữu output cuối và cross-spawn synthesis.

---

## Preferred Tools

### Data Fetching

1. **WebFetch**: miễn phí, text-only, hoạt động trên public pages không block bot.
2. **agent-browser CLI**: miễn phí, Rust CLI local + Chrome qua CDP. Dùng cho dynamic pages hoặc auth walls mà WebFetch không xử lý được. Trả về accessibility tree với element refs (`@e1`, `@e2`). ~82% ít token hơn screenshot-based tools. Cài: `npm i -g agent-browser && agent-browser install`. Dùng `snapshot` cho DOM state AI-friendly, element refs cho interaction.
3. Khi thấy recurring fetch pattern, đề xuất wrap thành dedicated tool (skill file hoặc `.py` script). Thêm vào `## Dedicated Tools` bên dưới.

### PDF Files

Dùng `pdftotext`, không dùng `Read` tool. Chỉ dùng `Read` khi user yêu cầu phân tích images/charts bên trong document.

### Codebase Exploration (BẮT BUỘC)

Khi cần hiểu codebase, tìm code, hoặc trả lời câu hỏi về structure → **LUÔN gọi `mcp__codebase-retrieval__codebase-retrieval` ĐẦU TIÊN**, trước cả `Read`/`Grep`/`Glob` hay spawn Explore subagent.

**Triggers bắt buộc dùng MCP trước:**
- "tìm function/class/service/hook/component xyz"
- "code nào xử lý X", "ở đâu trong codebase…", "logic của Y nằm đâu"
- Bất kỳ task nào cần hiểu cross-file behavior hoặc high-level architecture
- Trước khi implement feature mới (gather context về pattern hiện có)

**Khi nào fallback sang tool khác:**
- Đã biết exact file path → `Read` trực tiếp
- Tìm exact string/symbol literal → `Grep`
- Liệt kê file theo pattern → `Glob`
- Cần xem một file cụ thể nhưng chưa biết line range → `mcp__codebase-retrieval__file-retrieval`

**Workflow chuẩn:**
1. `codebase-retrieval` với câu hỏi natural language → lấy snippet + file paths
2. `Read` các file cụ thể với line range trả về để có context đầy đủ trước khi edit

---

## Dedicated Tools

<!-- Liệt kê project-specific tools ở đây. Mỗi tool link tới skill hoặc script file. -->
