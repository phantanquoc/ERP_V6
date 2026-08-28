# Proposal: no-dept-self-service-access

## Why

The DB-driven RBAC middleware (`requireRule`) rejects every request from a user with no department (`departmentIds.length === 0`) with `403 "Không thuộc phòng ban nào"` for all resources except `auth` — even for pure self-service operations such as reading one's own attendance. Because all seeded Rules are `scope=DEPARTMENT` (attendance rules exist only for `DEPT_GENERAL`), a department-less employee can never match an explicit Rule and always hits the guard. The result is inconsistent with the rest of the app: profile update, change-password, `GET /me/history` and parts of the "Chung" tab (repair requests, processes, overtime plan listing, work plans) only require `authenticate` and therefore work fine for the same user — while viewing one's own attendance and creating personal requests are blocked. The business rule confirmed by the owner: **any employee with an account must be able to use the system regardless of department assignment** — view their own attendance, view the Chung tab, and manage their profile.

## What Changes

- **Self-attendance READ bypass**: `requireRule` SHALL allow `attendances/READ` on `GET /api/attendances/employee/:employeeId` when the requested employee is the caller's own Employee record, even when the caller has no department. All other attendance routes (`/date-range`, `/export/excel/calendar`, `/import/excel/calendar`, `check-in`, `check-out`, `overtime-check-in`, `overtime-check-out`, `POST /`, `PUT /:id`, `DELETE /:id`) keep the existing department requirement for no-dept users. The existing service-level `resolveEmployeeAttendanceAccess` cross-user check remains as a second layer.
- **Chung tab: READ open, CREATE blocked for no-dept users**: Chung read endpoints remain accessible with `authenticate` only; write endpoints keep `requireRule`, which continues to deny no-dept users. The RBAC hole on `POST /api/work-plans` (currently missing `requireRule('work-plans', 'CREATE')`) is closed so no-dept users cannot create work plans either.
- **Overtime plan participant-scoped access for no-dept users**: for users with no department, `GET /api/overtime-plans`, `GET /api/overtime-plans/my-plans`, and `GET /api/overtime-plans/:id` SHALL return only plans where the caller is `nguoiTaoId` or appears in an item's `nguoiThamGiaIds`; all other plans are hidden (404/403 on detail). `POST /` remains denied (creation is `TEAM_LEAD+` with department, plus ADMIN). `PUT /:id` and `DELETE /:id` gain `requireRule('overtime-plans', 'UPDATE'|'DELETE')` (closing a second hole — they currently only check creator/admin in the service), so no-dept users can never edit or delete. `PATCH /:id/accept` and `PATCH /:id/actual-time` remain participant-gated, so a no-dept user listed on a plan can still accept/decline and log their own actual time. `PATCH /:id/approve` keeps its current `requireRule('overtime-plans','CREATE')` + pricing-approver check (no-dept stays denied).
- **Frontend consistency**: `CommonManagement` and `OvertimePlanListModal` hide create/edit controls for users without a department (UI consistency only — the backend is the source of truth).

## Capabilities

### New Capabilities
- `no-dept-self-service`: Access rules for authenticated users with no department assignment — self-attendance read, Chung-tab read-only access, participant-scoped overtime plan visibility and participant actions, and the work-plan creation guard.

### Modified Capabilities
<!-- None: the RBAC baseline (REQ-RBAC-006 no-department guard) is specified by the in-progress change format-rbac-position-rules, which has not yet produced baseline specs under openspec/specs/. That change's design.md will cross-reference this change as a sanctioned self-service exception. -->

## Impact

- **Backend**:
  - `backend/src/middlewares/requireRule.ts` — self-attendance READ bypass placed before the no-department guard (line ~209).
  - `backend/src/routes/attendanceRoutes.ts` — no URL changes; relies on the middleware bypass.
  - `backend/src/services/attendanceService.ts` — `resolveEmployeeAttendanceAccess` unchanged (defense in depth against cross-user reads).
  - `backend/src/routes/overtimePlanRoutes.ts` — participant-scope guard on `GET /`, `GET /my-plans`, `GET /:id`; add `requireRule` to `PUT /:id` and `DELETE /:id`.
  - `backend/src/services/overtimePlanService.ts` — participant-filter branch in `getAll`/`getMyPlans`/`getById` for no-dept callers.
  - `backend/src/routes/workPlanRoutes.ts` — add `requireRule('work-plans', 'CREATE')` to `POST /`.
- **Frontend**: `frontend/src/pages/CommonManagement.tsx`, `frontend/src/components/OvertimePlanListModal.tsx` — hide create/edit affordances for no-dept users.
- **Tests**: new backend tests for the self-READ bypass, overtime participant filtering, and the work-plan CREATE guard.
- **Out of scope (explicitly unchanged)**: `GET /auth/me`, `GET/PATCH /users/profile`, `POST /users/change-password`, `GET /me/history`; the `hr → DEPT_GENERAL` rule seed; ADMIN bypass; delegation; `baselineAllow`; `RESOURCE_TO_MODEL` owner-scope.
- **Security note**: the bypass is narrow — one resource (`attendances`), one action (`READ`), one route shape (`/employee/:employeeId`), one condition (own employee record) — and the service layer re-checks ownership, so no cross-user attendance data can be exposed.
