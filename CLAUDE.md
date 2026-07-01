# CLAUDE.md

@AGENTS.md

ERP An Binh Foods — hệ thống nội bộ cho nhà sản xuất trái cây sấy khô.
3 services: **Frontend** (React 18 + Vite + TailwindCSS :5173), **Backend** (Express 5 + Prisma + PostgreSQL :5000), **AI Service** (FastAPI + Python :8001).

UI/UX work must read `openspec/ui-dna.md` (or the existing DNA doc) before any visual change.

---

## Verification Commands (chạy trước khi kết thúc bất kỳ task nào)

```bash
# Backend
cd backend && npx tsc --noEmit          # Type check (PHẢI pass)
cd backend && npm run lint               # ESLint
cd backend && npm test                   # Jest — tất cả tests
cd backend && npx jest src/__tests__/auth.test.ts --runInBand  # Chạy 1 test file

# Frontend
cd frontend && npx tsc --noEmit         # Type check (PHẢI pass)
cd frontend && npm run lint              # ESLint

# AI Service (chạy từ thư mục ai-service/)
cd ai-service && python3 -m pytest tests/ -x -q          # Tất cả tests
cd ai-service && python3 -m pytest tests/test_registry.py -x -q  # Chỉ registry
```

**Stop conditions:** Không hoàn thành task nếu `tsc --noEmit` có lỗi ở backend hoặc frontend. Không bỏ qua test thất bại.

---

## Key Design Decisions

### Database
- **Multi-schema Prisma**: 3 schemas — `auth` (users, tokens), `business` (employees, orders, v.v.), `common` (lookups dùng chung). Mọi model **phải** có `@@schema(...)`.
- **IDs dùng CUID**: `@id @default(cuid())` — không dùng UUID hay auto-increment.
- **Child tables, không dùng JSON columns**: Related items (order items, supply request items) luôn là rows quan hệ với cascade delete — không bao giờ là JSON array.
- **`db push` vs `migrate dev`**: Dùng `migrate dev` cho mọi thay đổi cần lịch sử migration. `db push` chỉ cho prototyping nhanh.

### Backend Business Logic
- **Status là forward-only**: Dùng helper `advanceStatus` chỉ tiến theo mảng thứ tự đã định — không lùi, không nhảy cóc.
- **Status transitions chỉ ở server-side**: Client không bao giờ ghi trực tiếp vào status field sau khi tạo. Mọi transition xảy ra qua service methods. Không bao giờ expose `PATCH /status` endpoint chung.
- **Parent + children trong 1 transaction**: Dùng `prisma.$transaction` — tạo parent trước, rồi `createMany` cho items.
- **Update items bằng delete-then-recreate**: Khi update child items, xóa toàn bộ rồi `createMany` mới. Không update từng item.
- **Notifications không được bubble lỗi**: Wrap toàn bộ notification sends trong `try/catch`. Lỗi notification không được fail operation chính.

### Authentication & RBAC
- **ADMIN bypass tất cả ABAC**: Kiểm tra `req.user.role === 'ADMIN'` trước, gọi `next()` ngay lập tức.
- **Role hierarchy**: `ADMIN > DEPARTMENT_HEAD > TEAM_LEAD > EMPLOYEE`.
- **3 middleware**: `authenticate` (verify JWT) → `authorize(...roles)` (RBAC thuần) → `checkAccess({ allowedRoles, checkDepartment, checkSubDepartment })` (RBAC + ABAC).

### AI Service
- **Single LLM**: OpenRouter/DeepSeek cho cả agent và chatbot. Không thêm LLM provider khác.
- **AI modules độc lập**: `face/` không import `chat/`. `agent/` chỉ import `chat/` cho RAG search.
- **Tool registry**: 66 tools trong `agent/registry.py`. Intent classifier lọc còn ~10-15 tools/request. Write actions (`is_write: True`) yêu cầu user confirm trước khi execute.
- **Face attendance**: transaction + advisory lock cho concurrent scans, DB-backed cooldown cho multi-instance.

---

## Code Conventions

### Backend
- **Path aliases** (dùng luôn, không dùng `../../`):
  ```
  @config/*   @controllers/*   @routes/*   @middlewares/*
  @services/*  @utils/*   @types   @schemas
  ```
- **API response shape** (mọi endpoint phải trả về):
  ```typescript
  { success: boolean; message?: string; data?: T; pagination?: { page, limit, total, totalPages } }
  ```
- **Error handling**: Throw typed errors từ `@utils/errors`, không dùng `res.status(500)` trực tiếp:
  ```typescript
  throw new NotFoundError('Không tìm thấy nhân viên');
  throw new ValidationError('Dữ liệu không hợp lệ');
  throw new ConflictError('Email đã tồn tại');
  ```
- **Request flow**: Route → Controller (HTTP only) → Service (business logic) → Prisma. Controller không chứa business logic.

### Frontend
- **Data fetching**: Mọi resource có hook trong `src/hooks/` wrapping TanStack Query. Component không gọi `apiClient` trực tiếp.
- **Query key factory**: Dùng structured factory pattern — `{ all, lists, list(page,limit), detail(id) }`. Sau mutations, invalidate qua `queryClient.invalidateQueries({ queryKey: xyzKeys.lists() })`.
- **Auth state**: Dùng `useAuth()` từ `AuthContext`. Không đọc token trực tiếp từ `localStorage` trong component.
- **Form validation**: `react-hook-form` + `@hookform/resolvers/zod`.

### Ngôn ngữ
- **User-facing messages** (API responses, UI): **Tiếng Việt** — `'Không tìm thấy nhân viên'`
- **Code, biến, comment**: **Tiếng Anh**
- **Dates**: `YYYY-MM-DD` trong API params, `DD/MM/YYYY` trong UI display

---

## Required Environment Variables

| Var | Dùng cho |
|-----|---------|
| `DATABASE_URL` | Prisma → PostgreSQL |
| `JWT_SECRET` | Sign/verify access token |
| `JWT_REFRESH_SECRET` | Sign/verify refresh token |
| `CORS_ORIGIN` | Comma-separated origins, e.g. `https://a.com,https://b.com` |
| `AI_SERVICE_URL` | Backend gọi AI service (Docker: `http://ai-service:8001`) |
| `FACE_DATA_SECRET` | Encrypt face embeddings |

Copy `.env.production.example` → `.env` ở root. Dev local chỉ cần `DATABASE_URL` (các default ở `backend/src/config/env.ts`).

---

## High-Risk Areas

| File | Rủi ro | Lưu ý khi sửa |
|------|--------|----------------|
| `ai-service/agent/executor.py` | Wrong tool selection, infinite loop, token waste | Chạy `test_executor.py` sau mỗi thay đổi |
| `ai-service/face/liveness.py` | False reject / false accept (spoofing) | Test với nhiều điều kiện ánh sáng |
| `backend/src/services/faceAttendanceService.ts` | Race condition, duplicate check-in | Kiểm tra advisory lock vẫn còn |
| `backend/prisma/schema.prisma` | Migration conflicts, data loss | Backup DB trước khi migrate prod |
| `frontend/src/components/ChatWidget.tsx` | Agent action parsing, streaming state | Test với cả write và read actions |
| `backend/src/routes/index.ts` (ROUTE_MAP) | Route bị bỏ sót, silently ignored | Verify route mới xuất hiện trong server logs |

---

## Subagents

Spawn subagents để cô lập context, song song hóa công việc độc lập, hoặc offload các task cơ học số lượng lớn. Không spawn khi parent cần reasoning, khi synthesis cần giữ mọi thứ lại với nhau, hoặc khi overhead spawn lớn hơn lợi ích.

**Model & effort**: Luôn dùng **Opus** (`model: "opus"`) cho tất cả subagents. Parent sở hữu output cuối và cross-spawn synthesis.

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

---

## Never Do

- **Never** gọi Prisma trực tiếp từ controller — phải qua service
- **Never** thêm LLM provider — giữ OpenRouter là provider duy nhất
- **Never** skip Prisma migration khi thay đổi schema
- **Never** sửa `agent/registry.py` mà không cập nhật test count trong `test_registry.py` (hiện tại: 66 tools)
- **Never** expose `PATCH /status` endpoint chung — status chỉ thay đổi qua business events
- **Never** store secrets trong code — dùng env vars qua docker-compose
- **Never** commit mà không chạy `tsc --noEmit` và tests trước
- **Never** dùng `docker compose down -v` mà không xác nhận — sẽ xóa toàn bộ dữ liệu PostgreSQL
- **Never** force-push lên `main` khi không được yêu cầu rõ ràng

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ERP_V6** (23703 symbols, 37960 relationships, 242 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
