# CLAUDE.md

@AGENTS.md

> Toàn bộ quy tắc dự án, conventions, verification commands nằm trong `AGENTS.md` (auto-include ở trên).
> File này chỉ chứa hướng dẫn dành riêng cho Claude — cách vận hành trong repo này để ít sai, ít sót, ít phải sửa lại.

---

## 1. Trước khi làm gì — đọc trước, đoán sau

- **Chưa hiểu codebase thì chưa code.** Khi task yêu cầu tìm hiểu logic/cấu trúc/luồng xử lý → gọi `mcp__codebase-retrieval__codebase-retrieval` TRƯỚC, rồi mới `Read` file cụ thể theo line range trả về. Không `Grep` mò mẫm khi chưa có định hướng.
- **Chưa đọc spec thì chưa implement.** Feature lớn có `openspec/changes/<tên>/proposal.md` + `tasks.md` + `design.md` — đọc đủ 3 file trước khi chạm code. Thứ tự bắt buộc: `Prisma schema → service → controller → route (ROUTE_MAP) → frontend hook → component`.
- **Chưa check impact thì chưa sửa god file / high-risk area.** Xem bảng God Files và High-Risk Areas trong `AGENTS.md` — nếu đụng vào đó, chạy `gitnexus_impact({ target, direction: "upstream" })` và báo blast radius cho user trước khi edit.

## 2. Subagents — khi nào dùng, khi nào không

**Nên spawn** khi: cô lập context, song song hóa việc độc lập, offload task cơ học số lượng lớn.

**Không spawn** khi: parent cần reasoning tập trung, cần synthesis giữ mọi thứ lại với nhau, hoặc overhead spawn lớn hơn lợi ích.

- Tất cả 8 OSF subagents (`~/.claude/agents/osf-*.md`) đã pin `model: "opus"` — ưu tiên chất lượng + hoàn thành, không lo cost.
- Nếu gặp compact/rate-limit: (1) chia task nhỏ thay vì 1 spawn lớn, (2) prompt subagent scope hẹp — không paste toàn spec, (3) ưu tiên `gitnexus`/`codebase-retrieval` thay vì `Read` nguyên file.
- Parent sở hữu output cuối và cross-spawn synthesis — subagent không tự kết luận thay parent.

## 3. Quy trình làm việc chuẩn

```
Hiểu yêu cầu → Khám codebase (codebase-retrieval ưu tiên, gitnexus chỉ khi cần impact)
  → Lập plan (đọc spec nếu có) → Implement theo thứ tự AGENTS.md
  → Tự verify (tsc + lint + test liên quan) → Báo kết quả
```

- **Một việc một lần:** không gộp nhiều mục đích trong một edit/commit. Tách commit theo domain.
- **Không đoán API/field:** nếu không chắc tên field, enum, hay response shape — mở schema Prisma hoặc service tương ứng ra xem, đừng bịa.
- **File lớn (>800 dòng):** đọc theo chunk (offset/limit), không `Read` cả file 2k dòng rồi truncate. Ưu tiên `codebase-retrieval` để lấy snippet liên quan trước.
- **Tiếng Việt cho user-facing, tiếng Anh cho code/comment** — như `AGENTS.md` quy định.

## 4. Preferred Tools

### Data Fetching
1. **WebFetch** — miễn phí, text-only, cho public pages không block bot.
2. **agent-browser CLI** — Rust CLI local + Chrome qua CDP cho dynamic pages/auth walls. Trả về accessibility tree với refs (`@e1`, `@e2`), ~82% ít token hơn screenshot. Cài: `npm i -g agent-browser && agent-browser install`. Dùng `snapshot` cho DOM AI-friendly.
3. Khi thấy recurring fetch pattern → đề xuất wrap thành dedicated tool (skill hoặc `.py` script), thêm vào `## Dedicated Tools` bên dưới.

### PDF Files
Dùng `pdftotext`, không dùng `Read`. Chỉ dùng `Read` khi user yêu cầu phân tích images/charts.

### Codebase Exploration (BẮT BUỘC) — Ưu tiên codebase-retrieval
Khi cần hiểu codebase, tìm code, hoặc trả lời câu hỏi về structure → **LUÔN gọi `mcp__codebase-retrieval__codebase-retrieval` ĐẦU TIÊN**, trước cả `Read`/`Grep`/`Glob` hay `gitnexus`.

Triggers bắt buộc:
- "tìm function/class/service/hook/component xyz"
- "code nào xử lý X", "ở đâu trong codebase…", "logic của Y nằm đâu"
- Bất kỳ task nào cần hiểu cross-file behavior hoặc high-level architecture
- Trước khi implement feature mới (gather context về pattern hiện có)

Thứ tự ưu tiên:
1. `codebase-retrieval` — semantic search + call-graph, real-time index (ưu tiên số 1)
2. `Read` — khi đã biết exact file path + line range từ bước 1
3. `Grep` / `Glob` — CHỈ khi codebase-retrieval không trả về kết quả hoặc cần tìm exact string literal / liệt kê file theo pattern
4. `gitnexus` — HẠN CHẾ, chỉ dùng cho impact/blast-radius trước khi sửa god file / high-risk area (mục 1), không dùng để tìm code chung chung

Workflow:
1. `codebase-retrieval` với câu hỏi natural language → lấy snippet + file paths
2. `Read` các file cụ thể với line range trả về để có context đầy đủ trước khi edit
3. Chỉ fallback sang `Grep`/`Glob`/`gitnexus` khi bước 1 không đủ

---

## 5. Chống sai sót — những lỗi Claude hay mắc trong repo này

| Lỗi hay gặp | Cách tránh |
|-------------|------------|
| Bịa tên field/enum Prisma | Mở `backend/prisma/schema/*.prisma` kiểm tra trước khi code |
| Dùng `result.total` thay vì `pagination.total` | Nhớ response shape `{ success, data, pagination: { total } }` |
| Tạo `PATCH /status` chung | Status chỉ đổi qua service methods + `advanceStatus` forward-only |
| Gọi Prisma từ controller | Luôn qua service — `Route → Controller → Service → Prisma` |
| Quên `ROUTE_MAP` | Thêm route mới phải thêm entry trong `backend/src/routes/index.ts`, check log `Registered X routes` |
| Quên `npx prisma generate` sau đổi schema | Chạy ngay sau `migrate dev` |
| Dùng `localhost` trong Docker | Trong Docker network dùng `http://backend:5000` / `http://ai-service:8001` |
| Thêm `any` / `console.log` mới | Không thêm nếu tránh được — repo đang trả nợ 708+763 `any` và 91+327 `console.log` |
| Nhồi thêm vào `common.prisma` / `components/` phẳng | Cân nhắc tách file/subrepo theo domain |

## 6. Verify trước khi báo xong

Chạy đủ bộ trong `AGENTS.md > Verification Commands` và `Pre-commit Checklist`. Tối thiểu:

```bash
cd backend  && npx tsc --noEmit                          # 0 lỗi
cd frontend && npx tsc --noEmit -p tsconfig.app.json     # 0 lỗi
# + tests liên quan: npx jest src/__tests__/<file>.test.ts --runInBand
```

Không báo "xong" khi còn lỗi type hoặc test fail. Không hạ mốc 0 lỗi để cho qua.

---

## Dedicated Tools

<!-- Project-specific tools — mỗi tool link tới skill hoặc script file. -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ERP_V6** (30730 symbols, 47561 relationships, 228 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ERP_V6/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ERP_V6/clusters` | All functional areas |
| `gitnexus://repo/ERP_V6/processes` | All execution flows |
| `gitnexus://repo/ERP_V6/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
