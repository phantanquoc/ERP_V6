## Context

The ERP has two Prisma models for processes: `Process` (template) with a self-managed `ProcessFlowchart` and `ProcessFlowchartCost`, and `ProductionProcess` (instance) with `ProductionFlowchart` and `ProductionFlowchartCost`. Both live in `common` schema. The relationship is 1 Process → N ProductionProcess through `ProductionProcess.processId`. `Process.loaiQuyTrinh` is a free-form `String`; the frontend hardcodes 5 dropdown options (`Sản xuất`, `Kiểm tra chất lượng`, `Đóng gói`, `Vận chuyển`, `Khác`) in both `ProcessManagement` and `QualityProcess` filter.

Permission is enforced by three middlewares layered by convention: `authenticate` (verify JWT), `authorize(...roles)` (RBAC), and `checkAccess({allowedRoles, checkDepartment})` (RBAC+ABAC). Roles form a hierarchy `ADMIN > DEPARTMENT_HEAD > TEAM_LEAD > EMPLOYEE`. `checkAccess` when passed `checkDepartment: true` currently only *injects* `req.userDepartmentId` and `req.userSubDepartmentId`; it does not compare against a whitelist. Existing code compares those IDs against domain rows in the controller/service layer.

`productionProcessRoutes.ts` today has only `router.use(authenticate)` at the top — every mutation endpoint is open to any authenticated user. `processRoutes.ts` already gates mutations with `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)` and delete-only-ADMIN. Departments live in `common.departments` with `code` (`DEPT_QUALITY`, `DEPT_PRODUCTION`, …) and `name`, seeded in `backend/prisma/seed.ts`. User → department is `User.departmentId` (String? on User in `auth` schema).

The QualityProcess page has 4 tabs today; two of them are `processProduction`/`processGeneral` that both render `ProcessManagement` with `filterLoaiQuyTrinh` pinning to `Sản xuất` or "everything else". The prop is only used in QualityProcess — `ProductionDepartment` uses `mode="standard-only"` without the prop. `App.tsx` already exposes an unused `/quality/process-list` route pointing to a `ProcessList` lazy component — this design does not touch that route.

## Goals / Non-Goals

**Goals:**
- Introduce `ProcessType` as a curated, orderable, activatable catalog decoupled from `Process.loaiQuyTrinh` (still a String, no FK).
- Seed 4 immutable system-defaults; user can add more; system-defaults are freeze-locked (no rename, no delete, only order + active toggle).
- Enforce "only Sản xuất templates instantiate ProductionProcess" at the service layer with a matching frontend filter.
- Close the ProductionProcess RBAC hole: role-tier authorize + departmentCode whitelist (DEPT_PRODUCTION, DEPT_QUALITY), ADMIN bypass, DELETE limited to ADMIN.
- Restructure QualityProcess tabs to expose `productionProcess` as a first-class tab so Quality can operate the full lifecycle.
- Keep the change reversible: no destructive schema edits, no data migration on `Process.loaiQuyTrinh`, additive-only Prisma migration.

**Non-Goals:**
- Removing cost input from Process (Quality still enters cost on Process — user chose 1-A).
- Renaming `ProductionProcess` → `ProcessInstance`.
- Versioning `Process` templates.
- Dropping or migrating `ProcessFlowchartCost`.
- Migrating legacy `loaiQuyTrinh` values (`Đóng gói`, `Vận chuyển`, `Kiểm tra chất lượng`, `Khác`) — they stay verbatim on their rows.
- Sidebar changes; the settings page is entered through a header button in QualityProcess.
- Any dashboard comparing planned vs actual cost.
- "Đề xuất chỉnh sửa" workflow from Production back to Quality.

## Decisions

### Decision 1: ProcessType is a soft catalog, not a foreign key on Process

**Choice:** Keep `Process.loaiQuyTrinh` as a `String`. `ProcessType` only feeds UI dropdowns via `GET /api/process-types`. When a user deletes a custom type, the service counts `Process` rows with matching `loaiQuyTrinh` string to decide whether the delete is safe.

**Alternatives considered:**
- FK `Process.processTypeId → ProcessType.id` with `onDelete: RESTRICT`. Enforces integrity at the database, but requires a destructive data migration for every existing Process (some rows currently hold values like "Đóng gói" that map to nothing). The user explicitly asked to avoid migration pain.
- Enum with a fixed set. Rules out user-added types entirely, defeating the "Cài đặt loại quy trình" requirement.

**Why soft:** cheapest to introduce; legacy rows stay visible verbatim; delete-in-use protection still works via a count query. Trade-off: a rename operation on a custom type would orphan Process rows referencing the old name — mitigated by disallowing rename on system defaults (the only guaranteed-live names) and by delete-in-use check preventing accidental removal.

### Decision 2: `macDinhHeThong` flag freezes name+code+delete but leaves order+active mutable

**Choice:** Store `macDinhHeThong: boolean @default(false)` on every ProcessType. Business layer (`processTypeService`) refuses `updateProcessType` when the caller tries to change `name` or `code` on a flagged row, and refuses `deleteProcessType` outright. This matches user preference 3-B and keeps the four defaults (Sản xuất/Bảo dưỡng/Vệ sinh/Thủ tục) authoritative for downstream business rules.

**Alternatives considered:**
- Use a separate immutable table for system defaults + a mutable table for custom types. Cleaner separation but doubles query surface and requires UI to `UNION` two sources.
- Use `code` prefix (`PROCTYPE_SYS_*`) as a magic marker. Fragile if someone deliberately names a custom code with that prefix.

**Why single flag:** simplest, least query surface, and one boolean is easy to reason about in both service and UI.

### Decision 3: "Only Sản xuất instantiates ProductionProcess" is enforced by exact string match

**Choice:** In `productionProcessService.createProductionProcess`, fetch the parent Process, throw `ValidationError` if `process.loaiQuyTrinh !== 'Sản xuất'`. This is safe because `macDinhHeThong` prevents any code path from renaming the "Sản xuất" default.

**Alternatives considered:**
- Check `processType?.code === 'PROCTYPE_SAN_XUAT'` via a lookup. Adds a query per create and re-couples us to the code column when the goal was to keep Process decoupled.
- Add an `isProductionType` boolean on ProcessType. Overkill; only one type qualifies today.

**Why string match:** direct, requires no join, is protected upstream by the freeze rule.

### Decision 4: Department check lives in the controller, not the middleware

**Choice:** Add `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)` on the route for POST/PATCH, `authorize(ADMIN)` for DELETE. Inside the controller (before delegating to the service), assert `user.departmentCode ∈ {'DEPT_PRODUCTION', 'DEPT_QUALITY'}` with ADMIN bypass. A small helper `assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])` is added to `backend/src/utils/permissions.ts` (create the file if it does not exist, or extend an existing one — check first).

**Alternatives considered:**
- Extend `checkAccess` middleware to accept an `allowedDepartmentCodes` array. Cleanest long-term but touches shared middleware used by many other routes — out of scope for a first pass.
- Duplicate the check inline in the controller. Fine for two endpoints but a helper is trivial and unit-testable.

**Why controller:** localizes new behavior to this feature, avoids ripple through unrelated code, keeps `checkAccess` unchanged.

**Note on `req.user.departmentCode`:** the JWT payload today carries `departmentId`, not `departmentCode`. Two options:
1. Enrich JWT to include `departmentCode` at sign-time. Rejected: forces token refresh on all users.
2. Resolve `departmentCode` inside the helper via a cached `prisma.department.findUnique({ where: { id: req.user.departmentId }, select: { code: true } })`. Chosen. Adds one query per mutation; acceptable given the low volume of ProductionProcess mutations.

### Decision 5: Tab restructure uses static VALID_TABS list; old ids fall back to default

**Choice:** In `QualityProcess.tsx`, replace `VALID_TABS` with `['processList', 'productionProcess', 'orderList', 'inspection']`. When `?tab=processProduction` or `?tab=processGeneral` is on the URL, the includes-check returns false and the state initializes to `processList`. The URL sync effect then rewrites the tab param to `processList` on the next render. This is intentional behavior — old deep links stop working, but users land on the correct new tab.

**Alternatives considered:**
- Add an alias map `{processProduction: 'processList', processGeneral: 'processList'}`. Backwards-compatible but permanent maintenance debt for values we want to bury.

**Why hard cutover:** the tab structure change is documented in the proposal as intentional; alias maps rot.

### Decision 6: Migration is additive-only

**Choice:** Prisma migration adds `process_types` table with the seed data inserted in a follow-up seed script (`backend/prisma/seed.ts` extension), NOT inside the migration SQL. Rationale: `seed.ts` uses `upsert` on `code` so re-running is idempotent, while embedding data in `migration.sql` would run once and orphan any environment that already ran the migration but not the seed.

**Alternatives considered:**
- Data migration inside the SQL (`INSERT ... ON CONFLICT DO NOTHING`). Works, but this project uses `prisma migrate dev` + `prisma db seed` as separate steps (per AGENTS.md). Keeping seed data in `seed.ts` matches convention.

### Decision 7: Frontend guard uses `useAuth().user.departmentCode` (need to verify shape)

The frontend `useAuth()` hook returns the JWT-decoded user; the shape must expose `departmentCode`. If it does not, we resolve it via a small `useCurrentDepartment()` hook that hits `/api/users/me` (existing endpoint) or reads from `AuthContext`. Verify during implementation; if resolution needs a network round-trip, gate the button on `isLoading` to avoid flashing an inaccessible button.

## Risks / Trade-offs

- **[Risk] Legacy `loaiQuyTrinh` values invisible in the new filter dropdown** → Mitigation: table rows still render the value verbatim; only the filter dropdown is affected. Users who need to filter to legacy values can add matching ProcessType entries or use the text search on `loaiQuyTrinh`.
- **[Risk] JWT does not carry `departmentCode`, so backend must resolve via a DB lookup per mutation** → Mitigation: acceptable overhead given low mutation volume; if metrics later show hotspots, cache in-memory per request-scope.
- **[Risk] Frontend `useAuth()` shape may not expose `departmentCode`** → Mitigation: verify during implementation; if missing, extend AuthContext to include it (loaded once on login/refresh from an existing endpoint). This is a small forward-compatible change.
- **[Risk] Removing `filterLoaiQuyTrinh` prop breaks a call site we did not audit** → Mitigation: `grep -rn "filterLoaiQuyTrinh" frontend/src/` shows only QualityProcess uses it (confirmed in exploration). If a stray usage appears at build time, it will surface as a TS error (prop was typed) and can be removed.
- **[Risk] Deep-link users get silently redirected to a different tab** → Mitigation: intentional per Decision 5. No user-facing announcement needed since the module is used by a small internal team; the alternative (alias map) creates permanent tech debt.
- **[Risk] Someone deactivates the "Sản xuất" default and no one can create ProductionProcess** → Mitigation: business rule uses `process.loaiQuyTrinh === 'Sản xuất'` — the invariant does not depend on the ProcessType row being active. Deactivation only affects the filter dropdown; existing Process rows still hold the string. Considered adding "cannot deactivate Sản xuất" but the user did not request it and the invariant still holds.

## Migration Plan

**Deployment steps:**
1. Run `npx prisma migrate deploy` — creates `process_types` table.
2. Run `npx prisma db seed` — upserts the four system-default rows.
3. Deploy backend + frontend together (frontend expects new endpoint and guarded routes).
4. Smoke test: GET `/api/process-types` returns 4 rows; POST as ADMIN creates a custom row; DELETE the row succeeds; POST as EMPLOYEE returns 403.

**Rollback:**
- Backend: revert commits; run `npx prisma migrate resolve --rolled-back <migration>` and `DROP TABLE common.process_types`.
- Frontend: revert commits.
- Data loss: none from user data; any custom ProcessType rows added post-deploy would be lost on rollback (acceptable — new feature).

**Compatibility:**
- The additive migration is safe on production DBs currently running.
- Existing Process rows are unchanged.
- Existing ProductionProcess rows are unchanged.

## Open Questions

- **`useAuth()` shape**: does the frontend context already expose `departmentCode`, or only `departmentId`? Resolve during implementation by reading `frontend/src/contexts/AuthContext.tsx`. If only `departmentId`, add a minimal extension in AuthContext to fetch `code` on login.
- **`backend/src/utils/permissions.ts` existence**: implementation must check whether this file exists; if not, create it. If it exists, extend rather than duplicate.
- **Slugify Vietnamese diacritics**: implementation should use the same slugify approach as `nextStaticCode`/`staticCodeWhere` in `codeGenerator.ts` for consistency. Verify at code-write time whether a helper already exists; if not, a 10-line inline function suffices (`.normalize('NFD').replace(/[̀-ͯ]/g, '')` then uppercase + non-alnum→`_`).
