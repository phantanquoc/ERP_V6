# CLAUDE.md

@AGENTS.md

> Toàn bộ quy tắc dự án, conventions, verification commands nằm trong `AGENTS.md` (auto-include ở trên).
> File này chỉ chứa hướng dẫn dành riêng cho Claude — cách vận hành trong repo này để ít sai, ít sót, ít phải sửa lại.

---

## 1. Trước khi làm gì — đọc trước, đoán sau

- **Chưa hiểu codebase thì chưa code.** Khi task yêu cầu tìm hiểu logic/cấu trúc/luồng xử lý → gọi `mcp__codebase-retrieval__codebase-retrieval` TRƯỚC, rồi mới `Read` file cụ thể theo line range trả về. Không `Grep` mò mẫm khi chưa có định hướng.
- **Chưa đọc spec thì chưa implement.** Feature lớn có `openspec/changes/<tên>/proposal.md` + `tasks.md` + `design.md` — đọc đủ 3 file trước khi chạm code. Thứ tự bắt buộc: `Prisma schema → service → controller → route (ROUTE_MAP) → frontend hook → component`.
- **Chưa check impact thì chưa sửa god file / high-risk area.** Xem bảng God Files và High-Risk Areas trong `AGENTS.md` — nếu đụng vào đó, làm "Impact Analysis" (codebase-retrieval + grep xác nhận) và báo blast radius cho user trước khi edit. **Không dùng GitNexus.**
- **Spec có thể lỗi thời — code là nguồn sự thật.** Trước khi tin `openspec/changes/*`, đối chiếu với Prisma schema + service hiện tại. Ví dụ: YCKT và YCSC là 2 bảng độc lập (xem "Domain Map" trong `AGENTS.md`), trái với spec `split-inspection-repair`.

## 2. Subagents — khi nào dùng, khi nào không

**Nên spawn** khi: cô lập context, song song hóa việc độc lập, offload task cơ học số lượng lớn.

**Không spawn** khi: parent cần reasoning tập trung, cần synthesis giữ mọi thứ lại với nhau, hoặc overhead spawn lớn hơn lợi ích.

- Tất cả 8 OSF subagents (`~/.claude/agents/osf-*.md`) đã pin `model: "opus"` — ưu tiên chất lượng + hoàn thành, không lo cost.
- Nếu gặp compact/rate-limit: (1) chia task nhỏ thay vì 1 spawn lớn, (2) prompt subagent scope hẹp — không paste toàn spec, (3) ưu tiên `codebase-retrieval` thay vì `Read` nguyên file.
- Parent sở hữu output cuối và cross-spawn synthesis — subagent không tự kết luận thay parent.

## 3. Quy trình làm việc chuẩn

```
Hiểu yêu cầu → Khám codebase (codebase-retrieval → Read theo line range → grep xác nhận)
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
Khi cần hiểu codebase, tìm code, đánh giá impact, hoặc trả lời câu hỏi về structure → **LUÔN gọi `mcp__codebase-retrieval__codebase-retrieval` ĐẦU TIÊN**, trước cả `Read`/`Grep`/`Glob`. GitNexus đã bỏ, không dùng.

Triggers bắt buộc:
- "tìm function/class/service/hook/component xyz"
- "code nào xử lý X", "ở đâu trong codebase…", "logic của Y nằm đâu"
- Bất kỳ task nào cần hiểu cross-file behavior hoặc high-level architecture
- Trước khi implement feature mới (gather context về pattern hiện có)

Thứ tự ưu tiên:
1. `codebase-retrieval` — semantic search + call-graph, real-time index (ưu tiên số 1)
2. `Read` — khi đã biết exact file path + line range từ bước 1
3. Grep exact string — khi codebase-retrieval không đủ, cần liệt kê toàn bộ caller, hoặc xác nhận component có thực sự được import. Trong session này Grep tool có thể không có → dùng `rtk proxy grep -rn` qua Bash (glob `--include=*.ts` lỗi trên zsh, đừng dùng).

Workflow:
1. `codebase-retrieval` với câu hỏi natural language → lấy snippet + file paths
2. `Read` các file cụ thể với line range trả về để có context đầy đủ trước khi edit
3. Grep xác nhận callers/imports trước khi kết luận (semantic search có thể sót hoặc trả về spec cũ)

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
| Tin spec cũ thay vì code (vd coi YCKT là `RepairRequest.requestType=KIEM_TRA`) | Đối chiếu Prisma schema + service; xem Domain Map trong `AGENTS.md` |
| Sửa component không còn được render (vd `RepairDetailPanel.tsx`) | Grep import trước khi sửa; báo user nếu là code chết |
| Gán người yêu cầu YCCC = người thực hiện chính | YCCC luôn thuộc người tạo phiếu (user đăng nhập / JWT) |

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

