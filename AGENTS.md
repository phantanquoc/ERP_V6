# AGENTS.md

Operational rules for AI agents working in this repository (ERP An Binh Foods).

---

## Project Overview

| Component | Path | Stack |
|-----------|------|-------|
| Frontend | `frontend/` | React 18 + Vite + TailwindCSS + React Router 7 |
| Backend API | `backend/` | Express + TypeScript + Prisma + PostgreSQL |
| AI Service | `ai-service/` | FastAPI + Python (DeepFace, ChromaDB, OpenRouter) |
| Infrastructure | `docker-compose.yml` | PostgreSQL, AI Service, Nginx |

---

## Commands

### Frontend (`frontend/`)
```bash
npm run dev              # Vite dev server on :5173
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit        # Type check
```

### Backend (`backend/`)
```bash
npm run dev              # Express dev with ts-node on :5000
npm run build            # tsc + tsc-alias → dist/
npm run lint             # ESLint
npm test                 # Jest
npx prisma generate     # Regenerate Prisma client after schema change
npx prisma migrate dev  # Create + apply migration
npx prisma studio       # Visual DB browser
```

### AI Service (`ai-service/`)
```bash
python3 -m pytest tests/ -x -q    # Run all tests
uvicorn app:app --port 8001        # Run locally (needs models)
```

### Docker (full stack)
```bash
docker compose -f docker-compose.dev.yml up -d    # Dev environment
docker compose up -d                               # Production
docker compose down                                # Stop
docker compose logs ai-service --tail 50           # View AI logs
```

---

## Architecture

### Backend — Express + Prisma
```
src/
├── routes/          # Route definitions (59 route files)
├── controllers/     # HTTP boundary, request parsing
├── services/        # Business logic, Prisma calls
├── middlewares/     # auth.ts, errorHandler.ts, rbacAbac.ts, upload.ts
├── config/          # database.ts, env.ts, logger.ts
├── utils/           # helpers, crypto, errors, dateUtils
└── index.ts         # Express app setup
```

### Frontend — React SPA
```
src/
├── pages/           # Route pages (by department: business, production, etc.)
├── components/      # Shared components (Sidebar, ChatWidget, Layout)
├── contexts/        # AuthContext, SystemSettingsContext
├── services/        # API client modules
├── utils/           # Helpers, permissions
└── config/          # API base URL
```

### AI Service — FastAPI modules
```
ai-service/
├── face/            # Face recognition (helpers, liveness, routes, models)
├── chat/            # RAG chatbot (retrieval, indexer, llm, faithfulness, routes)
├── agent/           # ReAct agent (executor, registry, classifier, routes)
├── config.py        # Shared constants + env vars
├── app.py           # FastAPI app setup
└── tests/           # pytest tests (140+)
```

---

## Key Patterns

### Backend API Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 150, "totalPages": 15 }
}
```

### Authentication
- JWT access token in `Authorization: Bearer <token>` header
- Backend middleware: `authenticate` (verify JWT) + `authorize('ADMIN')` (check role)
- AI Service forwards user's JWT to backend when calling APIs on behalf of user

### Agent Tool Registry (`ai-service/agent/registry.py`)
- 66 tools, each maps to a backend endpoint
- Format: `{name, description, method, path, path_params, query_params, body_params, is_write, is_export, category}`
- Write actions (`is_write: True`) require user confirmation before execution
- After adding/removing tools, update test count in `tests/test_registry.py`

### Knowledge Base (`docs/chatbot/`)
- 12 markdown files with frontmatter (department, roles, access)
- Indexed into ChromaDB on startup (hash-based change detection)
- Each file must have `## Cách truy cập` section with sidebar navigation path

---

## Conventions

- TypeScript strict mode on frontend and backend
- Backend: controller → service → Prisma (never skip service layer)
- Frontend: TailwindCSS for styling, lucide-react for icons
- AI Service: all LLM calls go through OpenRouter (DeepSeek model)
- Prisma schema uses `@@map("table_name")` and `@@schema("auth"/"business"/"common")`
- Vietnamese for user-facing text, English for code identifiers
- Dates: `YYYY-MM-DD` in API params, `DD/MM/YYYY` in UI display

---

## Implementing a Feature — Thứ tự bắt buộc

Luôn implement theo trình tự này, không nhảy cóc:

```
1. Prisma schema (schema.prisma) + migration
2. Backend: service → controller → route → đăng ký vào ROUTE_MAP
3. Frontend: service types → custom hook → component(s)
```

Xem `openspec/changes/` để biết định dạng spec đầy đủ cho feature lớn.

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

## Gotchas

| Issue | Fix |
|-------|-----|
| Prisma client out of date after schema change | Run `npx prisma generate` |
| AI Service tests fail with import error | Run tests from `ai-service/` directory: `cd ai-service && python3 -m pytest` |
| ChromaDB not finding new docs | Restart ai-service container (hash change triggers re-index) |
| Backend 401 on all requests | Check JWT_SECRET matches between backend and token issuer |
| Face recognition models not loading | First startup downloads ~500MB models — wait for warmup log |
| Frontend build fails with TS errors | Run `npx tsc --noEmit` to see exact errors before `npm run build` |
| Docker ai-service can't reach backend | Use service name `http://backend:5000` not `localhost` |
| Agent returns wrong total count | Backend uses `pagination.total`, not `result.total` |

---

## Self-Check Before Finishing

- [ ] Backend: `npx tsc --noEmit` passes
- [ ] Frontend: `npx tsc --noEmit` passes
- [ ] AI Service: `python3 -m pytest tests/ -x -q` — all pass
- [ ] No hardcoded secrets or API keys in code
- [ ] Prisma migration created if schema changed
- [ ] No commits created unless user explicitly asked

---

## Never Do

- **Never** modify `.env` files or commit secrets
- **Never** use `find`/`grep` bash commands when `Glob`/`Grep` tools are available
