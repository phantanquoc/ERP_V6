# Tasks: no-dept-self-service-access

## 1. Backend — self-attendance READ bypass (the no-department guard exception)

- [ ] 1.1 Add a narrow bypass in `backend/src/middlewares/requireRule.ts` before the `departmentIds.length === 0 && resourceCode !== 'auth'` guard: when `resourceCode === 'attendances' && action === 'READ' && req.params.employeeId` is present, resolve the caller's own `Employee.id` via `Employee.userId === req.user.id` and allow the request to continue only when `req.params.employeeId === ownEmployeeId`; otherwise fall through to the existing 403 path; on missing Employee mapping, deny. Fail closed, no delegation interaction, and no change to other attendances routes. ← (verify: `GET /attendances/employee/:ownId` returns 200 for a no-dept EMPLOYEE while `GET /attendances/employee/:otherId` and `GET /attendances/date-range` remain 403; inspect middleware order — bypass precedes guard, service `resolveEmployeeAttendanceAccess` still re-checks ownership)
- [ ] 1.2 Confirm `backend/src/services/attendanceService.ts` `resolveEmployeeAttendanceAccess` is left intact as defense-in-depth for cross-user reads (no behavior change). ← (verify: EMPLOYEE reading another employeeId still yields the service's AuthorizationError even if middleware were bypassed)

## 2. Backend — overtime plan participant-scoped visibility for no-department users

- [ ] 2.1 Update `backend/src/services/overtimePlanService.ts` `getAll`, `getMyPlans`, and `getById`: when the caller has no department (resolved via `departmentIds` / `UserSecondaryDepartment` absence as in `requireRule`), constrain the query to `where: { OR: [{ nguoiTaoId: userId }, { items: { some: { nguoiThamGiaIds: { has: userId } } } }] }`; `getById` returns 403/404 when the caller is neither creator nor participant. Keep existing pagination and population behavior. ← (verify: no-dept `GET /overtime-plans` lists only creator-or-participant plans — `pagination.total` matches filtered count; `GET /:id` for a non-participant plan returns 403/404)
- [ ] 2.2 Harden `backend/src/routes/overtimePlanRoutes.ts`: add `requireRule('overtime-plans', 'UPDATE')` to `PUT /:id` and `requireRule('overtime-plans', 'DELETE')` to `DELETE /:id`; keep `requireRule('overtime-plans','CREATE')` on `POST /` and `PATCH /:id/approve`; leave `PATCH /:id/accept` and `PATCH /:id/actual-time` participant-gated at the service (no route middleware added) so a no-dept participant can still act on their own item while a non-participant is denied. ← (verify: no-dept `POST /overtime-plans` -> 403, `PUT /:id` -> 403, `DELETE /:id` -> 403, `PATCH /:id/approve` -> 403; `PATCH /:id/accept` and `PATCH /:id/actual-time` succeed for own item and 403 for another's item)

## 3. Backend — close the work-plan creation RBAC hole

- [ ] 3.1 Add `requireRule('work-plans', 'CREATE')` to `router.post('/')` in `backend/src/routes/workPlanRoutes.ts` (ahead of `uploadWorkPlans`), matching the existing `PUT /:id` pattern which already has `requireRule('work-plans','UPDATE')`; `GET /` and `GET /my-work-plans` remain `authenticate`-only. ← (verify: no-dept `POST /api/work-plans` returns 403 with `"Không thuộc phòng ban nào"`; `GET /api/work-plans` still returns 200)

## 4. Frontend — hide creation affordances for no-department users (display-only)

- [ ] 4.1 Update `frontend/src/pages/CommonManagement.tsx` to hide "Create" buttons for Chung entities (work plans, supply requests, tasks, private feedback, repair requests) when the current user has no department; derive department presence from `user.departmentId` / `AuthContext` consistently with `requireRule`'s `departmentIds`. ← (verify: logged-in EMPLOYEE with no department sees the Chung cards but no "Create" button; a department-assigned TEAM_LEAD still sees it)
- [ ] 4.2 Update `frontend/src/components/OvertimePlanListModal.tsx` to hide the "Create" button and plan-level edit/delete/approve controls for no-department users; keep item-level `accept` / `actual-time` controls visible only for the participant's own row when the plan includes them. ← (verify: no-dept participant sees accept/actual-time on their row; no-dept non-participant plan is not listed at all; no create/edit/delete/approve buttons are rendered for no-dept)

## 5. Verification

- [ ] 5.1 Run `cd backend && npx tsc --noEmit` — must pass with 0 errors. ← (verify: typecheck passes)
- [ ] 5.2 Run `cd backend && npm run lint` — must pass. ← (verify: lint passes)
- [ ] 5.3 Run `cd backend && npm test` — all tests pass; added tests cover self-attendance bypass (own 200 / other 403 / date-range 403), overtime participant filter (list filtered, detail 403, accept self 200 vs other 403, actual-time self 200 vs other 403), and work-plan POST 403 for no-dept. ← (verify: new negative tests are green; no existing tests regress)
- [ ] 5.4 Run `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — must pass with 0 errors. ← (verify: typecheck passes)
- [ ] 5.5 Run `cd frontend && npm run lint` — must pass. ← (verify: lint passes)
- [ ] 5.6 Manual check: log in as a no-department EMPLOYEE — `GET /attendances/employee/:ownId` 200, cross-user 403, `GET /date-range` 403; Chung READ 200 / POST 403 for supply/task/private-feedback/repair/work-plans/overtime; `GET /overtime-plans` only shows plans containing the user and `PATCH /accept` + `PATCH /actual-time` succeed only for own item; `POST /work-plans` 403; `GET /auth/me` and `PATCH /users/profile` still 200. ← (verify: manual flows match the spec's Scenario table)
- [ ] 5.7 Cross-reference this change as a sanctioned `REQ-RBAC-006` self-service exception in the in-progress change `format-rbac-position-rules` (note in its `design.md` / `specs/rule-enforcement-sync` delta) so the future rule matrix does not regress it.
