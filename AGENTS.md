# AGENTS.md

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
cd frontend && npx tsc --noEmit -p tsconfig.app.json   # Type check (xem ghi chú bên dưới)
cd frontend && npm run lint              # ESLint

# AI Service (chạy từ thư mục ai-service/)
cd ai-service && python3 -m pytest tests/ -x -q          # Tất cả tests
cd ai-service && python3 -m pytest tests/test_registry.py -x -q  # Chỉ registry
```

**Stop conditions:** Không hoàn thành task nếu `tsc --noEmit` có lỗi ở backend hoặc frontend. Không bỏ qua test thất bại.

> **Ghi chú frontend type check:** `tsconfig.json` gốc dùng project references (files: []) nên `tsc --noEmit` không có `-p` sẽ quét 0 file — phải chỉ rõ `-p tsconfig.app.json`.
> Repo hiện tại có ~610 lỗi type tồn đọng (chủ yếu TS2339/TS6133/TS2322) — là nợ kỹ thuật có sẵn, chưa xử lý.
> **Tiêu chí PASS:**
> - **KHÔNG được có lỗi `TS2304` (Cannot find name)** — loại lỗi này gây crash runtime/trắng màn hình.
> - **Tổng số lỗi không tăng** so với mốc 610 (kiểm tra bằng `| grep -c "error TS"`).
> - Nếu task mới thêm lỗi type → sửa trước khi hoàn thành.

---

## Dev Commands

### Frontend (`frontend/`)
```bash
npm run dev              # Vite dev server on :5173
npm run build            # Production build
```

### Backend (`backend/`)
```bash
npm run dev              # Express dev with ts-node on :5000
npm run build            # tsc + tsc-alias → dist/
npx prisma generate      # Regenerate Prisma client sau schema change
npx prisma migrate dev   # Tạo + apply migration
npx prisma studio        # Visual DB browser
```

### Docker (full stack)
```bash
docker compose -f docker-compose.dev.yml up --build -d   # Dev — backend exposed :5003
docker compose up -d                                      # Production
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
```

> **Lưu ý port:** Trong Docker dev, backend internal port là 5000, nhưng được map ra ngoài thành **:5003**. Frontend `VITE_API_URL=http://localhost:5003/api`.

---

## Implementing a Feature — Thứ tự bắt buộc

Luôn implement theo trình tự này, không nhảy cóc:

```
1. Prisma schema (schema.prisma) + migration
2. Backend: service → controller → route → đăng ký vào ROUTE_MAP (backend/src/routes/index.ts)
3. Frontend: service types → custom hook → component(s)
```

Xem `openspec/changes/` để biết định dạng spec đầy đủ cho feature lớn.

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
- **Single LLM**: OpenRouter/DeepSeek (`deepseek/deepseek-chat-v3-0324`) cho cả agent và chatbot — xem `config.py`. Không thêm LLM provider khác.
- **AI modules độc lập**: `face/` không import `chat/`. `agent/` chỉ import `chat/` cho RAG search.
- **Tool registry**: 72 tools trong `agent/registry.py`. Intent classifier lọc còn ~10-15 tools/request. Write actions (`is_write: True`) yêu cầu user confirm trước khi execute.
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
| `OPENROUTER_API_KEY` | AI Service → OpenRouter/DeepSeek LLM |

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
| `backend/src/services/employeeEvaluationService.ts` | BS1 masking / audit invariants / N/A math / appeal window / mode branching | Chạy `npx jest src/__tests__/employeeEvaluationService.test.ts --runInBand` sau mỗi thay đổi; kiểm tra masking + audit + N/A rule vẫn hoạt động (change: enhance-employee-evaluation) |

---

## Gotchas

| Issue | Fix |
|-------|-----|
| Prisma client out of date sau schema change | Run `npx prisma generate` |
| AI Service tests fail với import error | Chạy tests từ thư mục `ai-service/`: `cd ai-service && python3 -m pytest` |
| ChromaDB không tìm thấy docs mới | Restart ai-service container (hash change triggers re-index) |
| Backend 401 on all requests | Check `JWT_SECRET` khớp giữa backend và token issuer |
| Face recognition models không load | Lần đầu startup download ~500MB models — đợi warmup log |
| Frontend build fails với TS errors | Chạy `npx tsc --noEmit` để xem lỗi trước `npm run build` |
| Docker ai-service không reach được backend | Dùng service name `http://backend:5000` không phải `localhost` |
| Agent trả về wrong total count | Backend dùng `pagination.total`, không phải `result.total` |
| Backend dev port | Docker maps `5003:5000` — truy cập ngoài qua `:5003`, không phải `:5000` |

---

## Debugging Workflow

Khi test thất bại, build lỗi, hoặc behavior không đúng — **dừng thêm code**:

1. **Reproduce** — chạy test lỗi cô lập:
   ```bash
   cd backend && npx jest src/__tests__/<file>.test.ts --runInBand
   cd ai-service && python3 -m pytest tests/test_executor.py -x -v
   ```
2. **Localize** — xác định layer lỗi: Prisma query? Service logic? Controller? Frontend hook? Component?
3. **Fix root cause** — không comment out test, không skip layer để tiến tiếp.
4. **Guard** — thêm test/assertion để không bị regression.

Với regression: `git bisect` để tìm commit gây lỗi trước khi đoán.

---

## Never Do

- **Never** gọi Prisma trực tiếp từ controller — phải qua service
- **Never** thêm LLM provider — giữ OpenRouter là provider duy nhất
- **Never** skip Prisma migration khi thay đổi schema
- **Never** sửa `agent/registry.py` mà không cập nhật test count trong `test_registry.py` (hiện tại: 72 tools)
- **Never** expose `PATCH /status` endpoint chung — status chỉ thay đổi qua business events
- **Never** store secrets trong code — dùng env vars qua docker-compose
- **Never** commit mà không chạy `tsc --noEmit` và tests trước
- **Never** dùng `docker compose down -v` mà không xác nhận — sẽ xóa toàn bộ dữ liệu PostgreSQL
- **Never** down container database (`postgres` / `db`) dù trong bất kỳ hoàn cảnh nào — chỉ restart service backend/frontend/ai-service; nếu cần restart toàn stack thì dùng `docker compose restart` thay vì `down`
- **Never** force-push lên `main` khi không được yêu cầu rõ ràng
- **Never** dùng `find`/`grep` bash commands khi có công cụ `Glob`/`Grep` chuyên dụng
- **Never** modify `.env` files hoặc commit secrets

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ERP_V6** (28594 symbols, 44718 relationships, 204 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
