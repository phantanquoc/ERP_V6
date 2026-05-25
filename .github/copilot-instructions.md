# Copilot Instructions — ERP_V6

## How to Work in This Repo

### Before making any non-trivial change
1. **Map the blast radius first.** Identify every layer the change touches: Prisma schema → migration → backend service → controller/route → frontend service types → frontend hooks → frontend components. List them explicitly before writing code.
2. **Check `openspec/changes/` for prior art.** Completed specs in that directory show exactly how previous features were designed and broken down. Use them as the reference pattern.
3. **Never guess at interfaces.** Read the actual TypeScript types in `src/types/` (backend) and `src/services/*.ts` (frontend) before touching anything that passes data between layers.

### Implementing a feature — layer order
Always implement in this sequence — never skip ahead:
```
1. Prisma schema (schema.prisma)
2. Database migration (prisma migrate dev OR db push)
3. Backend: service → controller → route → register in ROUTE_MAP
4. Frontend: service types → custom hook → component(s)
```

### When the request is ambiguous or large
Before writing code, produce a brief plan with:
- **Why** — what problem this solves
- **What changes** — bullet list of affected files by layer
- **Decisions** — any non-obvious choices (e.g. child table vs JSON column, where status logic lives)
- **Tasks** — numbered checklist matching the layer order above

See `openspec/changes/supply-request-multi-item-workflow/` for a complete example of this format.

## Key Design Rules

These are hard decisions already made in this codebase — don't deviate without flagging it:

- **Child tables over JSON columns.** Related items (e.g. order items, supply request items) are always stored as relational child rows with cascade delete — never as JSON arrays. Allows proper indexing and future querying.
- **Server-side status transitions only.** Status fields are never written directly by the client after initial creation. All transitions happen in service methods triggered by business events. Never expose a generic `PATCH /status` endpoint.
- **Single transaction for parent + children.** When creating a parent record with child rows, always use `prisma.$transaction` — create parent first, then `createMany` for items.
- **Update items by delete-then-recreate.** When updating a record's child items, delete the existing items then `createMany` the new ones. No partial item updates.
- **Status is a forward-only sequence.** Use an `advanceStatus` helper that only moves status forward in a defined ordered array — never backward, never skip-ahead.
- **Notifications must not bubble errors.** Wrap all notification sends in `try/catch`. A notification failure must never fail the main operation.
- **`ADMIN` bypasses all RBAC/ABAC checks.** Check `req.user.role === 'ADMIN'` first and call `next()` immediately.

---



Three-service system deployed via Docker Compose:

| Service | Stack | Port |
|---|---|---|
| **backend** | Node.js, Express 5, TypeScript, Prisma | 5000 |
| **frontend** | React 18, Vite, TypeScript, TanStack Query, Tailwind | 5173 (dev) |
| **ai-service** | Python, FastAPI, DeepFace/ArcFace | 8001 |

Nginx reverse-proxies all traffic. PostgreSQL uses **three schemas**: `auth`, `business`, `common` — every Prisma model must declare `@@schema(...)`.

## Commands

### Backend (`/backend`)
```bash
npm run dev          # ts-node with path aliases (no build needed)
npm run build        # tsc + tsc-alias (resolves path aliases in output)
npm run lint         # eslint src --ext .ts
npm run format       # prettier --write
npm test             # jest (all tests in src/__tests__/)
npx jest src/__tests__/auth.test.ts   # run a single test file
npm run prisma:migrate    # dev migration
npm run prisma:migrate:prod  # deploy migration (production)
npm run prisma:seed   # seed initial data
npm run prisma:studio # visual DB browser
```

### Frontend (`/frontend`)
```bash
npm run dev    # Vite dev server
npm run build  # production build
npm run lint   # eslint
```

### Docker
```bash
docker-compose up -d          # production stack
docker-compose -f docker-compose.dev.yml up -d  # dev stack
docker-compose logs -f backend
docker-compose exec backend npx prisma migrate deploy
```

## Backend Conventions

### Request Flow
`Route → Controller → Service → Prisma`  
Controllers only handle HTTP; business logic lives in services.

### Path Aliases (tsconfig.json)
Always use aliases — never relative `../..` imports:
```
@config/*    → src/config/*
@controllers/* → src/controllers/*
@routes/*    → src/routes/*
@middlewares/* → src/middlewares/*
@services/*  → src/services/*
@utils/*     → src/utils/*
@types       → src/types
@schemas     → src/schemas
```

### API Response Shape
All endpoints return:
```typescript
{ success: boolean; message?: string; data?: T; pagination?: { page, limit, total, totalPages } }
```

### Error Handling
Throw typed errors from `@utils/errors` — the global `errorHandler` middleware handles them:
```typescript
import { NotFoundError, ValidationError, ConflictError, AuthorizationError } from '@utils/errors';
throw new NotFoundError('Employee not found');
```
Never send raw `res.status(500)` from controllers; call `next(error)` instead.

### Authentication & Authorization
- `authenticate` — verifies JWT Bearer token, populates `req.user`
- `authorize(...roles)` — RBAC: checks `req.user.role` against allowed roles
- `checkAccess({ allowedRoles, checkDepartment, checkSubDepartment })` — combined RBAC + ABAC (populates `req.userDepartmentId` / `req.userSubDepartmentId`)
- Role `ADMIN` bypasses all department/subdepartment checks

```typescript
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), controller.list);
router.get('/:id', authenticate, checkAccess({ allowedRoles: ['MANAGER'], checkDepartment: true }), controller.getById);
```

### Adding a New Route Module
1. Create `src/routes/<name>Routes.ts`
2. Create `src/controllers/<name>Controller.ts` and `src/services/<name>Service.ts`
3. Add the entry to `ROUTE_MAP` in `src/routes/index.ts` — routes are auto-registered from that map

### Zod Validation
Validation schemas live in `src/schemas/index.ts`. Apply them with the `zodValidation` middleware.

### User-Facing Messages
Error and success messages in API responses are written in **Vietnamese** (e.g., `'Không tìm thấy nhân viên'`). Code, variable names, and comments are in English.

## Frontend Conventions

### Data Fetching Pattern
Every resource has a matching hook in `src/hooks/` that wraps TanStack Query. Use these hooks in components — do not call `apiClient` directly from components.

Query keys follow a structured factory pattern:
```typescript
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (page, limit) => [...employeeKeys.lists(), { page, limit }] as const,
  detail: (id) => [...employeeKeys.all, 'detail', id] as const,
};
```
After mutations, invalidate via `queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })`.

### API Client
`src/services/apiClient.ts` is a singleton that handles:
- Automatic `Authorization: Bearer <token>` injection from `localStorage`
- 401 → token refresh → retry
- Redirect to `/login` on refresh failure

Use `apiClient.get<T>()`, `.post()`, `.patch()`, `.put()`, `.delete()`. Pass `FormData` directly for file uploads (Content-Type header is omitted automatically).

### Auth State
Access the logged-in user via `useAuth()` from `AuthContext`. Never read tokens directly from `localStorage` in components.

### Form Validation
Forms use `react-hook-form` with `@hookform/resolvers/zod` for schema validation. Define Zod schemas in `src/schemas/`.

## Database

### Prisma Multi-Schema
Every model must specify its schema:
```prisma
model Employee {
  ...
  @@schema("business")
}
```
Schemas: `auth` (users, tokens, login history), `business` (employees, orders, etc.), `common` (shared lookups).

IDs use CUID: `@id @default(cuid())`.

### Prisma Client Import
```typescript
import prisma from '@config/database';
```

## Environment Variables

Copy `.env.production.example` → `.env` at the repo root for production.  
Backend dev defaults are in `src/config/env.ts` (no `.env` file required for local dev, except `DATABASE_URL`).

Key variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `AI_SERVICE_URL`, `FACE_DATA_SECRET`.

## AI Service (`/ai-service`)

FastAPI service for face enrollment and verification using DeepFace + ArcFace. It is called by the backend (`AI_SERVICE_URL`), not directly from the frontend. Enrollment uses RetinaFace detector; verification uses YuNet (with SSD fallback).

## Debugging Rule

When a test fails, build breaks, or behavior is unexpected — **stop adding code**. Follow this order:
1. **Reproduce** — run the specific failing test in isolation: `npx jest src/__tests__/<file>.test.ts --runInBand`
2. **Localize** — identify which layer is failing: Prisma query? Service logic? Controller? Frontend hook? Component?
3. **Fix the root cause** — never comment out a failing test or skip a layer to move on
4. **Guard** — add a test or assertion so it can't regress

For regressions: `git bisect` to find the breaking commit before guessing.

## Common Gotchas

- **`tsc-alias` is required after `tsc`.** Path aliases (`@config/*` etc.) are not resolved by `tsc` alone — always run `tsc && tsc-alias` for builds. `npm run build` already does this.
- **Multi-schema Prisma requires `@@schema()` on every model.** Missing it causes a Prisma client generation error.
- **`db push` vs `migrate dev`:** This project has used both. `db push` is faster for iterative dev but does not create a migration file. Use `migrate dev` for changes that need a recorded migration history.
- **Tokens in localStorage, not cookies.** `apiClient.ts` reads `accessToken` from `localStorage`. Auth middleware expects `Authorization: Bearer <token>` header.
- **Route auto-registration requires a ROUTE_MAP entry.** Adding a route file without updating `ROUTE_MAP` in `src/routes/index.ts` means the route is silently ignored.
- **CORS_ORIGIN is comma-separated.** The backend splits it on commas — set multiple origins as `https://a.com,https://b.com` in the env var.

## Reference: OpenSpec Format

For large features, use the same structure as `openspec/changes/`:
```
openspec/changes/<feature-name>/
  .openspec.yaml   # schema: spec-driven, created: date
  proposal.md      # Why / What Changes / Capabilities / Impact
  design.md        # Context / Goals / Decisions (D1, D2...) / Risks / Migration Plan
  tasks.md         # Numbered checklist grouped by layer, checkbox per task
  specs/           # Per-capability spec files
```

