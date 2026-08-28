# Design: no-dept-self-service-access

## Context

The RBAC layer is DB-driven via `requireRule(resource, action)` with the priority chain `ADMIN bypass -> delegation (scope-aware) -> explicit Rule (Position > Role, SUB_DEPARTMENT > DEPARTMENT > GLOBAL) -> no-department guard -> baselineAllow -> owner-scope (UPDATE/DELETE only)`. The guard at `backend/src/middlewares/requireRule.ts:209-212` (`departmentIds.length === 0 && resourceCode !== 'auth' -> 403 "Không thuộc phòng ban nào"`) fires before `baselineAllow`, so even `READ` (which baselineAllow would permit for any role) is denied for department-less users. Seeded Rules are `scope=DEPARTMENT` only: `attendances` (group `hr`) is mapped exclusively to `DEPT_GENERAL`, with no `GLOBAL` rule, so department-less users never match an explicit Rule. `attendanceService.resolveEmployeeAttendanceAccess` already enforces EMPLOYEE self-only reads, but it runs after the middleware, so the guard denies before ownership is checked. Separately, `workPlanRoutes POST /` lacks `requireRule('work-plans','CREATE')` (RBAC hole), and `overtimePlanRoutes PUT /:id`/`DELETE /:id` lack a middleware guard, relying solely on service-level creator/ADMIN checks.

Stakeholders: employees with no department assignment (new hires, unassigned staff, contractors), department managers, admins. Constraint: must not weaken cross-department isolation for non-self reads or allow privilege escalation via the bypass.

## Goals / Non-Goals

**Goals:**
- Let any authenticated employee view their own attendance via `GET /api/attendances/employee/:employeeId` regardless of department assignment, while blocking cross-user reads and all other attendance operations for no-dept users.
- Keep the "Chung" (Common) tab fully viewable for no-dept users (READ success) but block every creation path; close the `POST /api/work-plans` RBAC hole.
- Scope overtime plan visibility for no-dept users to participant-or-creator only; keep approval blocked, and preserve participant self-actions (`accept`, `actual-time`) for plans they are on.
- Hide create/edit affordances for no-dept users on the frontend (UI consistency; backend is the source of truth).

**Non-Goals:**
- Introducing a new `/me/attendances` route or changing the attendance URL shape.
- Reseeding Rules with `scope=GLOBAL` or backfilling a synthetic department for every user.
- Changing delegation, ADMIN bypass, `baselineAllow`, `RESOURCE_TO_MODEL` owner-scope, or the `hr -> DEPT_GENERAL` seed mapping.
- Changing `GET /auth/me`, `GET/PATCH /users/profile`, `POST /users/change-password`, or `GET /api/me/history` (already authenticate-only).

## Decisions

### D1 — Self-attendance bypass lives in `requireRule` before the no-department guard

Insert a narrow bypass `isSelfAttendanceRead(req)` checked before `if (departmentIds.length === 0 ...)`. Condition: `resourceCode === 'attendances' && action === 'READ' && req.params.employeeId === ownEmployeeId`, where `ownEmployeeId` is resolved from `Employee.userId === req.user.id`.

Rationale: keeps the fix in one centralized middleware, avoids scattering route-specific exceptions. Narrow scope (one resource, one action, one route param) minimizes blast radius.

Alternatives considered:
- New `GET /me/attendances` endpoint — rejected: adds URL surface and forces frontend URL switch; existing `/employee/:employeeId` plus service check already expresses the intent.
- Seed a `GLOBAL` Rule for `attendances/READ` — rejected: would open all employees' records to every no-dept user, violating the per-user isolation invariant.
- Move the check into `attendanceController` instead of middleware — rejected: the guard would still 403 before the controller is reached; fixing only in the controller would leave all other `requireRule('attendances','READ')` paths (e.g., future routes) inconsistent.

### D2 — Resolve own Employee via `Employee.userId`, not `User` directly

The self check loads `Employee` by `userId` because `Employee.id` is the attendance foreign key while `User.id` is the auth principal. Lookup is a single indexed query; result is compared strictly (`===`) and the bypass fails closed on miss (unknown mapping -> deny).

Alternative considered: storing `employeeId` on the JWT — rejected: token payload is signed at login and would go stale on re-linking; DB lookup is cheap and authoritative.

### D3 — Overtime participant filter at the service layer with an explicit route guard

For no-dept callers, `overtimePlanService.getAll` and `getById` add `where: { OR: [{ nguoiTaoId: userId }, { items: { some: { nguoiThamGiaIds: { has: userId } } } }] }` instead of returning the global query. `getById` returns 403/404 when the caller is neither creator nor participant. `PUT /:id` and `DELETE /:id` gain `requireRule('overtime-plans', 'UPDATE'|'DELETE')` so the no-dept guard denies before the service.

Rationale: service-level filter is definitive (frontend cannot bypass it); adding the route middleware keeps the denial consistent with the rest of the RBAC surface for non-self writes.

Alternative considered: filtering only in `requireRule` via delegation — rejected: delegation is for temporary cross-dept authority, not for participant visibility.

### D4 — Participant self-actions remain allowed (`accept`, `actual-time`)

`PATCH /:id/accept` and `PATCH /:id/actual-time` already gate on `item.nguoiThamGiaIds.includes(userId)` in the service, which is exactly the no-dept allow-list. No `requireRule` is added to these routes for this change, so a no-dept participant can still act on their own item row while a non-participant is denied by the service.

Rationale: disabling these would break the confirmed business flow where participants confirm attendance and log actual hours.

### D5 — Close the `POST /api/work-plans` RBAC hole

Add `requireRule('work-plans', 'CREATE')` to `router.post('/')` ahead of `uploadWorkPlans`. This makes no-dept creation consistently 403 across all Chung write paths.

### D6 — Frontend hiding is non-security (display-only gate)

`CommonManagement` and `OvertimePlanListModal` hide "Create" / edit affordances when the current user has no department (and, for overtime, when `role` is not `TEAM_LEAD+`). This is UI consistency only; the backend denial is the enforcement.

## Risks / Trade-offs

- **Bypass scope creep** -> Mitigation: predicate is triple-narrow (attendances + READ + ownId). Covered by negative tests: `otherId -> 403`, `date-range -> 403`, `EXPORT/CREATE -> 403`. Service re-check (`resolveEmployeeAttendanceAccess`) provides defense-in-depth.
- **Employee mapping missing or stale (`User` with no `Employee` row)** -> Mitigation: bypass fails closed (deny) when `Employee.findUnique({ userId })` returns null; standard case has `Employee` created at onboarding (backfill noted in `format-rbac-position-rules` task 1.1b).
- **Overtime filter performance on large plan sets** -> Mitigation: indexed `nguoiTaoId` + array-contains on `nguoiThamGiaIds`; pagination is bounded (`limit <= 100`); no additional JOINs.
- **Frontend/Backend drift (button hidden vs. backend allowed)** -> Mitigation: document that backend is the source of truth; UI hiding only suppresses affordance, it never grants.
- **Secondary-department users unaffected** -> Mitigation: `departmentIds` includes `UserSecondaryDepartment`; the guard only fires on `length === 0`, so secondary-only users naturally bypass it, consistent with existing `requireRule` semantics.

## Migration Plan

1. Deploy backend with middleware + service + route changes; no migration or seed change.
2. Deploy frontend with button hiding.
3. Verify no-dept manual flows: self-attendance 200 / cross-user 403 / date-range 403 / Chung READ 200 POST 403 / overtime participant-only / work-plans POST 403.
4. Rollback: revert the 6 files; previous 403-only behavior for no-dept users is restored with no data change.
5. Cross-ref: note this change as a sanctioned `REQ-RBAC-006` self-service exception in the in-progress change `format-rbac-position-rules` (its `design.md` / `specs/rule-enforcement-sync` delta) so the future rule matrix does not regress it.

## Open Questions

None — all scope decisions (B/A/B+1B+2A) are locked in the teach-back.

