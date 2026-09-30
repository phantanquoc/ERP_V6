# AGENTS.md

ERP An Binh Foods — hệ thống nội bộ cho nhà sản xuất trái cây sấy khô.
3 services: **Frontend** (React 18 + Vite + TailwindCSS :5173), **Backend** (Express 5 + Prisma + PostgreSQL :5000), **AI Service** (FastAPI + Python :8001).

UI/UX work must read `openspec/ui-dna.md` trước khi đụng vào giao diện.

> **Quy mô hiện tại (2026-09):** ~96k LOC backend (379 files), ~148k LOC frontend (505 files), ~8k LOC ai-service,
> 155 Prisma models (5 schema files), 94 services, 177 components. `common.prisma` 71 models, 3 god services >1.3k dòng.

---

## Verification Commands (chạy trước khi kết thúc bất kỳ task nào)

```bash
# Backend
cd backend && npx tsc --noEmit          # Type check (PHẢI pass, 0 lỗi)
cd backend && npm run lint               # ESLint
cd backend && npm test                   # Jest — tất cả tests

# Frontend
cd frontend && npx tsc --noEmit -p tsconfig.app.json   # PHẢI pass, 0 lỗi
cd frontend && npm run lint

# AI Service
cd ai-service && python3 -m pytest tests/ -x -q

# Chạy 1 test file cô lập
cd backend && npx jest src/__tests__/auth.test.ts --runInBand
cd ai-service && python3 -m pytest tests/test_registry.py -x -q
```

**Stop conditions:** Không hoàn thành task nếu `tsc --noEmit` có lỗi (backend hoặc frontend). Không bỏ qua test thất bại.

> **Frontend type check:** `tsconfig.json` gốc dùng project references (`files: []`) nên `tsc --noEmit` không `-p` sẽ quét 0 file — phải chỉ rõ `-p tsconfig.app.json`.
> Repo hiện **sạch type: 0 lỗi** (đo 2026-08-07). Tiêu chí PASS: tổng lỗi = 0 (`| grep -c "error TS"`), riêng `TS2304` (Cannot find name) gây crash runtime — tuyệt đối không được có. Task mới thêm lỗi type → sửa trước khi xong, không hạ mốc.

---

## Dev Commands

### Frontend (`frontend/`)
```bash
npm run dev              # Vite dev :5173
npm run build            # Production build
npm run test:run         # Vitest (jsdom)
```

### Backend (`backend/`)
```bash
npm run dev              # Express + ts-node :5000
npm run build            # tsc + tsc-alias → dist/
npx prisma generate      # Sau khi đổi schema
npx prisma migrate dev   # Tạo + apply migration
npx prisma studio
```

### Docker (full stack)
```bash
docker compose -f docker-compose.dev.yml up --build -d   # Dev — backend :5003
docker compose up -d                                      # Production
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
```

> **Port:** Docker dev map `5003:5000`. Ngoài host truy cập `:5003`, frontend `VITE_API_URL=http://localhost:5003/api`. Trong Docker network dùng `http://backend:5000`.

---

## Implementing a Feature — Thứ tự bắt buộc

```
1. Prisma schema (backend/prisma/schema/*.prisma) + migration
2. Backend: service → controller → route → đăng ký vào ROUTE_MAP (backend/src/routes/index.ts)
3. Frontend: service types → custom hook (TanStack Query) → component(s)
```

Xem `openspec/changes/` cho format spec đầy đủ (feature lớn cần `proposal.md`/`tasks.md`/`design.md`).

**Khi schema đổi:** `npx prisma generate` ngay sau `migrate dev`, nếu không backend sẽ báo client out of date.

---

## Key Design Decisions

### Database
- **Multi-schema Prisma**: 3 schemas logic — `auth` (users, tokens), `business` (employees, orders, …), `common` (lookups, warehouse, technical, …). Mọi model **phải** có `@@schema(...)`.
- **Cảnh báo `common.prisma`**: 71 models / 59K — god schema. Đổi gì trong đó cũng blast radius lớn → luôn chạy `gitnexus_impact` trước. Khi thêm domain mới, cân nhắc tách file `common_*.prisma` thay vì nhồi tiếp.
- **IDs dùng CUID**: `@id @default(cuid())` — không UUID, không auto-increment.
- **Child tables, không JSON columns**: Related items luôn là rows quan hệ với cascade delete — không bao giờ JSON array.
- **`migrate dev` vs `db push`**: `migrate dev` cho mọi thay đổi cần lịch sử. `db push` chỉ prototyping nhanh. Drift đã fix 2026-08-04 — đừng tái tạo drift bằng `db push` trên nhánh chia sẻ.

### Backend Business Logic
- **Status forward-only**: Dùng helper `advanceStatus` theo mảng thứ tự định sẵn — không lùi, không nhảy cóc.
- **Status transitions chỉ server-side**: Client không ghi trực tiếp status sau khi tạo. Mọi transition qua service methods. Không bao giờ expose `PATCH /status` chung.
- **Parent + children trong 1 transaction**: `prisma.$transaction` — tạo parent trước, rồi `createMany` cho items.
- **Update items = delete-then-recreate**: Xóa toàn bộ rồi `createMany` mới. Không update từng item.
- **Notifications không bubble lỗi**: Wrap `try/catch`. Lỗi noti không được fail operation chính.

### Authentication & RBAC
- **ADMIN bypass tất cả ABAC**: Check `req.user.role === 'ADMIN'` trước, `next()` ngay.
- **Role hierarchy**: `ADMIN > DEPARTMENT_HEAD > TEAM_LEAD > EMPLOYEE`.
- **3 middleware**: `authenticate` (verify JWT) → `authorize(...roles)` (RBAC) → `checkAccess({ allowedRoles, checkDepartment, checkSubDepartment })` (RBAC+ABAC).
- **Rule Matrix**: Resource/Rule/Delegation trong `auth.prisma`. Đổi logic phân quyền phải hiểu `permissionResolution.ts` trước.

### AI Service
- **Single LLM**: OpenRouter/DeepSeek (`deepseek/deepseek-chat-v3-0324`) duy nhất — xem `ai-service/config.py`. Không thêm provider khác.
- **AI modules độc lập**: `face/` không import `chat/`. `agent/` chỉ import `chat/` cho RAG search.
- **Tool registry**: 72 tools trong `agent/registry.py`. Intent classifier lọc còn ~10-15/request. Write actions (`is_write: True`) yêu cầu user confirm.
- **Face attendance**: transaction + advisory lock + DB-backed cooldown cho multi-instance.

---

## Code Conventions

### Backend
- **Path aliases** (bắt buộc, không `../../`):
  ```
  @config/*  @controllers/*  @routes/*  @middlewares/*
  @services/*  @utils/*  @types  @schemas
  ```
- **API response shape** (mọi endpoint):
  ```typescript
  { success: boolean; message?: string; data?: T; pagination?: { page, limit, total, totalPages } }
  ```
  Dùng `pagination.total` (không phải `result.total`) — agent từng sai chỗ này.
- **Error handling**: Throw typed errors từ `@utils/errors`, không `res.status(500)` trực tiếp:
  ```typescript
  throw new NotFoundError('Không tìm thấy nhân viên');
  throw new ValidationError('Dữ liệu không hợp lệ');
  throw new ConflictError('Email đã tồn tại');
  ```
- **Request flow**: Route → Controller (HTTP only) → Service (business logic) → Prisma. Controller không chứa business logic, không gọi Prisma trực tiếp.
- **Type safety**: Hạn chế `any` (hiện 708 chỗ — đang trả nợ dần). Code mới không thêm `any` nếu có thể typed; không dùng `as any` để che lỗi `tsc`. `noExplicitAny` đang `warn` — mục tiêu nâng lên `error` từng bước.
- **Logging**: Dùng `logger` từ `@config/logger`, không `console.log` trong code mới (hiện còn 91 chỗ backend cần dọn).

### Frontend
- **Data fetching**: Mọi resource có hook trong `src/hooks/` wrapping TanStack Query. Component không gọi `apiClient` trực tiếp.
- **Query key factory**: `{ all, lists, list(page,limit), detail(id) }`. Sau mutations: `queryClient.invalidateQueries({ queryKey: xyzKeys.lists() })`.
- **Auth state**: Dùng `useAuth()` từ `AuthContext`. Không đọc token từ `localStorage` trong component.
- **Form validation**: `react-hook-form` + `@hookform/resolvers/zod`.
- **Component organization**: `src/components/` hiện 177 files phẳng — code mới nên đặt trong subfolder theo domain (`components/warehouse/`, `components/technical/`, `components/common/`) hoặc ít nhất prefix rõ. Tránh nhồi thêm vào root.
- **Type & logging**: Tương tự backend — không thêm `any` mới (hiện 763 chỗ), không `console.log` mới (hiện 327 chỗ).
- **Deep-link / URL-synced filters**: Đang chuẩn hóa (dùng `useSearchParams`). Khi thêm filter mới, đồng bộ URL để hỗ trợ F5 + share link — xem các commit `deep-link` gần đây làm mẫu.

### Ngôn ngữ
- **User-facing messages** (API responses, UI): **Tiếng Việt** — `'Không tìm thấy nhân viên'`
- **Code, biến, comment**: **Tiếng Anh**
- **Dates**: `YYYY-MM-DD` trong API params, `DD/MM/YYYY` trong UI display

---

## God Files — Cẩn trọng khi sửa

Những file vượt 1k dòng, blast radius cao. Đổi một dòng có thể ảnh hưởng nhiều flows — **bắt buộc** `gitnexus_impact` trước:

| File | Dòng | Rủi ro |
|------|------|--------|
| `backend/src/services/employeeEvaluationService.ts` | 2459 | BS1 masking, audit invariants, N/A math, appeal window, mode branching |
| `backend/src/services/supplyRequestService.ts` | 1804 | Supply chain YCCC→YCBS→YCMH→kho, liên kết chéo |
| `backend/src/services/warehouseReceiptService.ts` | 1767 | Nhập kho, tồn kho, liên kết phiếu |
| `backend/src/services/purchaseRequestService.ts` | 1701 | Mua hàng, status guards, pricing |
| `backend/src/services/faceAttendanceService.ts` | 1432 | Race condition, advisory lock, duplicate check-in |
| `backend/src/services/notificationRegistry.ts` | 1387 | Fan-out noti cho mọi domain |
| `frontend/src/components/AttendanceManagement.tsx` | 2160 | Chấm công, shift derivation (UTC vs VN +7h) |
| `frontend/src/components/ProcessManagement.tsx` | 2058 | Quy trình sản xuất |

> Khi sửa god file: (1) `gitnexus_impact({ target, direction: "upstream" })`, (2) chạy test file liên quan `--runInBand`, (3) không gộp nhiều mục đích trong một commit.

---

## Required Environment Variables

| Var | Dùng cho |
|-----|---------|
| `DATABASE_URL` | Prisma → PostgreSQL |
| `JWT_SECRET` | Sign/verify access token |
| `JWT_REFRESH_SECRET` | Sign/verify refresh token |
| `CORS_ORIGIN` | Comma-separated origins |
| `AI_SERVICE_URL` | Backend → AI service (Docker: `http://ai-service:8001`) |
| `FACE_DATA_SECRET` | Encrypt face embeddings |
| `OPENROUTER_API_KEY` | AI Service → OpenRouter/DeepSeek |

Copy `.env.production.example` → `.env` ở root. Dev local chỉ cần `DATABASE_URL` (defaults ở `backend/src/config/env.ts`).

---

## High-Risk Areas

| File | Rủi ro | Lưu ý khi sửa |
|------|--------|----------------|
| `ai-service/agent/executor.py` | Wrong tool selection, infinite loop, token waste | Chạy `test_executor.py` sau mỗi thay đổi |
| `ai-service/face/liveness.py` | False reject / false accept (spoofing) | Test nhiều điều kiện ánh sáng |
| `backend/src/services/faceAttendanceService.ts` | Race condition, duplicate check-in | Kiểm tra advisory lock vẫn còn |
| `backend/prisma/schema/*.prisma` | Migration conflicts, data loss | Backup DB trước khi migrate prod; `prisma generate` ngay sau |
| `frontend/src/components/ChatWidget.tsx` | Agent action parsing, streaming state | Test cả write và read actions |
| `backend/src/routes/index.ts` (ROUTE_MAP) | Route bị bỏ sót, silently ignored | Verify route mới xuất hiện trong server logs (`Registered X API routes`) |
| `backend/src/services/employeeEvaluationService.ts` | BS1 masking / audit invariants / N/A math / appeal window / mode branching | `npx jest src/__tests__/employeeEvaluationService.test.ts --runInBand`; check masking + audit + N/A rule |
| `backend/src/utils/statusTransitions.ts` | Forward-only guard, ADMIN bypass, KHONG_DAT loop | `npx jest src/__tests__/statusTransitions.test.ts --runInBand` |
| `backend/src/utils/productionDay.ts` | Day boundary, bridging, timezone VN | `npx jest src/__tests__/productionDay*.test.ts --runInBand` |

---

## Gotchas — Bẫy đã gây lỗi thật

| Issue | Fix | Nguồn |
|-------|-----|-------|
| Prisma client out of date sau schema change | `npx prisma generate` | Recurring |
| AI Service tests fail với import error | Chạy từ `ai-service/`: `cd ai-service && python3 -m pytest` | Recurring |
| ChromaDB không tìm thấy docs mới | Restart ai-service container (hash change triggers re-index) | Recurring |
| Backend 401 on all requests | Check `JWT_SECRET` khớp giữa backend và token issuer | Recurring |
| Face recognition models không load | Lần đầu download ~500MB — đợi warmup log | Recurring |
| Frontend `tsc --noEmit` báo 0 file | Phải `-p tsconfig.app.json` (project references) | AGENTS.md |
| Docker ai-service không reach backend | Dùng `http://backend:5000` không phải `localhost` | Recurring |
| Agent trả về wrong total count | Dùng `pagination.total`, không phải `result.total` | Recurring |
| Backend dev port | Docker maps `5003:5000` — ngoài host dùng `:5003` | Recurring |
| Kiosk chỉ có 9 nguyên liệu / 2 có tồn | Filter stock là vì dead-end, không vì list dài | 2026-08-04 |
| Ca chưa có FinishedProduct → draft không được ghi | Đã fix: đảm bảo baseline draft | 2026-08-04 |
| Chưa cấu hình attended mapping → fallback vị trí sản xuất | 5-15 người/ca, không để trống | 2026-08-04 |
| 1 mẻ chiên trộn nhiều kiện → lệch tồn kho âm thầm | Audit phiếu kho khi đổi logic lot/stock | 2026-08-10 |
| Sửa mã timesheet làm mất giờ OT | Audit trail + routes đã fix, test `timesheetComputeSummary` | 2026-08-12 |
| Process vs ProductionProcess na ná nhau | Chỉ `ProductionProcess` có `soLuongKeHoach` để tính chi phí | Recurring |
| Attendance `checkInTime` lưu UTC vs khung ca giờ VN (+7h) | Dùng `notes` đáng tin hơn suy lại từ giờ quẹt | Recurring |
| Đánh số lot/product code theo năm | Dùng `nextYearlyCode` / `nextStaticCode`, không tự chế | `codeGenerator.ts` |

---

## Git Hygiene

- **Commit thẳng `main`** (quy ước team hiện tại — không tạo nhánh mỗi task). Commit nhỏ, một việc một commit, message theo conventional commits (`feat(scope):`, `fix(scope):`, `chore:`).
- **Không force-push `main`** khi chưa được yêu cầu rõ ràng.
- **Worktrees**: Dọn worktrees rác sau khi xong việc (`git worktree remove <path>` + `git branch -D <branch>`). Không để 16 worktrees tồn đọng như từng xảy ra.
- **Stash**: Dọn stash tạm ngay sau khi apply (`git stash drop`). Không để `temp CommonManagement` tồn.
- **Uncommitted changes**: Không để 25 files modified treo trên `main` — commit hoặc stash có tên rõ ràng trước khi switch context.
- **Trước khi commit**: Chạy `tsc --noEmit` + `npm run lint` + tests liên quan. Chưa có CI tự động — dev tự guard.

---

## Pre-commit Checklist

```
[ ] gitnexus_impact cho mọi symbol đã sửa (nếu đụng god file / high-risk area)
[ ] backend:  npx tsc --noEmit  → 0 lỗi
[ ] frontend: npx tsc --noEmit -p tsconfig.app.json → 0 lỗi
[ ] backend:  npm run lint  (không thêm lỗi mới)
[ ] tests liên quan: npx jest <file> --runInBand  → pass
[ ] gitnexus_detect_changes() — chỉ affect expected symbols/flows
[ ] ROUTE_MAP có entry nếu thêm route mới (check server log: Registered X routes)
[ ] Không thêm any / console.log mới nếu tránh được
[ ] Commit message: conventional commits, scope rõ ràng
```

---

## Debugging Workflow

Khi test thất bại, build lỗi, hoặc behavior không đúng — **dừng thêm code**:

1. **Reproduce** — chạy test lỗi cô lập:
   ```bash
   cd backend && npx jest src/__tests__/<file>.test.ts --runInBand
   cd ai-service && python3 -m pytest tests/test_executor.py -x -v
   ```
2. **Localize** — xác định layer: Prisma query? Service logic? Controller? Frontend hook? Component?
3. **Fix root cause** — không comment out test, không skip layer.
4. **Guard** — thêm test/assertion để không regression.

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
- **Never** thêm `any` / `as any` để che lỗi type — fix type đúng cách
- **Never** để worktrees/stash rác tồn đọng — dọn ngay sau khi xong việc
- **Never** commit với 25 files modified lẫn lộn nhiều mục đích — tách commit theo domain

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
