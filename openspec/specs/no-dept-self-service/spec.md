# no-dept-self-service Specification

## Purpose

Define the self-service access contract for authenticated employees who have no department assignment. The contract is a narrow, sanctioned exception to the baseline RBAC no-department guard (otherwise `403 "Không thuộc phòng ban nào"`): no-department users SHALL be able to read their own attendance, use the full Chung tab (read AND create supply requests, repair requests, tasks, work plans, and private feedback) — with the sole exception that overtime plan creation remains denied — and see only the overtime plans that include them as participant or creator. All other attendance operations, overtime creation/approval/editing, and cross-user reads remain denied.
## Requirements
### Requirement: Self-attendance read for department-less employees

The system SHALL allow an authenticated employee with no department assignment to read their own attendance via `GET /api/attendances/employee/:employeeId` when the `employeeId` path parameter identifies the caller's own `Employee` record. The check SHALL be performed before the baseline no-department guard and SHALL be re-validated at the service layer so that cross-user reads remain denied. No other attendance operation SHALL be relaxed for no-department users.

#### Scenario: No-department employee reads own attendance
- **WHEN** an authenticated EMPLOYEE with `departmentIds = []` calls `GET /api/attendances/employee/:ownEmployeeId?startDate=...&endDate=...` where `:ownEmployeeId` is the `Employee.id` linked to `req.user.id`
- **THEN** the system returns `200` with the caller's attendance records for the requested date range

#### Scenario: No-department employee blocked from reading another employee
- **WHEN** an authenticated EMPLOYEE with `departmentIds = []` calls `GET /api/attendances/employee/:otherEmployeeId` where `:otherEmployeeId` differs from their own `Employee.id`
- **THEN** the system returns `403` (or `401` for role `EMPLOYEE` cross-user as implemented) and does not return the other employee's data

#### Scenario: No-department employee blocked from manager-scoped attendance reads
- **WHEN** an authenticated employee with `departmentIds = []` calls `GET /api/attendances/date-range?startDate=...&endDate=...`
- **THEN** the system returns `403` with message `"Không thuộc phòng ban nào"` regardless of role

#### Scenario: No-department employee blocked from attendance export, import, and check-in/out creation
- **WHEN** an authenticated employee with `departmentIds = []` calls any of `GET /api/attendances/export/excel/calendar`, `POST /api/attendances/import/excel/calendar`, `POST /api/attendances/check-in`, `POST /api/attendances/check-out`, `POST /api/attendances/overtime-check-in`, `POST /api/attendances/overtime-check-out`, or `POST /api/attendances`
- **THEN** the system returns `403` with message `"Không thuộc phòng ban nào"`

#### Scenario: No-department employee blocked from attendance update and delete
- **WHEN** an authenticated employee with `departmentIds = []` calls `PUT /api/attendances/:id` or `DELETE /api/attendances/:id`
- **THEN** the system returns `403` with message `"Không thuộc phòng ban nào"`

#### Scenario: No-department user with no Employee mapping is still denied
- **WHEN** an authenticated user with `departmentIds = []` and no linked `Employee` row calls `GET /api/attendances/employee/:anyId`
- **THEN** the system returns `403` and does not leak existence of the target employee

### Requirement: Chung tab full access for no-department employees

An authenticated employee with no department assignment SHALL have full access to Chung resources: both READ and CREATE for supply requests, repair requests, tasks, work plans, and private feedback. The `POST /api/work-plans` RBAC hole (missing `requireRule`) SHALL remain closed so its behavior matches other Chung write paths — but the no-department bypass SHALL allow no-dept users through it. Profile, password, dashboard, and personal history operations that already require only `authenticate` SHALL remain unchanged.

#### Scenario: No-department employee can read Chung resources
- **WHEN** an authenticated employee with `departmentIds = []` calls `GET /api/supply-requests`, `GET /api/tasks`, `GET /api/private-feedbacks`, `GET /api/repair-requests`, `GET /api/processes`, `GET /api/overtime-plans`, or `GET /api/work-plans` (including `GET /api/work-plans/my-work-plans`)
- **THEN** each call returns `200` with the standard paginated response (no department-scoped broadening beyond what each service already returns for the caller)

#### Scenario: No-department employee can create Chung entities (except overtime)
- **WHEN** an authenticated employee with `departmentIds = []` calls `POST /api/supply-requests`, `POST /api/repair-requests`, `POST /api/tasks`, `POST /api/private-feedbacks`, or `POST /api/work-plans` with a valid request body
- **THEN** the system returns `200` (or `201`) and the entity is created

#### Scenario: No-department employee blocked from creating overtime plans
- **WHEN** an authenticated employee with `departmentIds = []` calls `POST /api/overtime-plans`
- **THEN** the system returns `403` with message `"Không thuộc phòng ban nào"` and no overtime plan is created

#### Scenario: No-department employee blocked from updating and deleting Chung entities
- **WHEN** an authenticated employee with `departmentIds = []` calls `PUT /api/work-plans/:id`, `PUT /api/tasks/:id`, `PATCH /api/private-feedbacks/:id`, or the corresponding `DELETE` endpoints
- **THEN** the system returns `403` and the target entity is unchanged

#### Scenario: Dashboard, profile, password, and personal history remain authenticate-only
- **WHEN** an authenticated employee with `departmentIds = []` calls `GET /auth/me`, `GET /users/profile`, `PATCH /users/profile`, `POST /users/change-password`, or `GET /api/me/history`
- **THEN** the system returns `200` (or the operation's success response) without requiring a department

### Requirement: Overtime plan participant-scoped access for no-department employees

For authenticated employees with no department assignment, overtime plan list and detail reads SHALL be scoped to plans where the caller is either `nguoiTaoId` or appears in an item's `nguoiThamGiaIds`; all other plans SHALL be hidden (detail returns `403` or `404`). Creation, editing, deletion, and approval SHALL remain denied for no-department users. Participant self-actions on plans that include the caller SHALL remain allowed: the caller MAY accept/decline their own participation and log their own actual time for items they are on, while actions on items they are not on SHALL be denied.

#### Scenario: No-department employee lists only own overtime plans
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `GET /api/overtime-plans` or `GET /api/overtime-plans/my-plans`
- **THEN** the system returns `200` with only plans satisfying `nguoiTaoId = U OR items.some(item.nguoiThamGiaIds has U)`; plans that do not include `U` are absent from the response and from `pagination.total`

#### Scenario: No-department employee can read detail of a plan that includes them
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `GET /api/overtime-plans/:id` where `U` is `nguoiTaoId` or appears in `nguoiThamGiaIds` of the plan
- **THEN** the system returns `200` with the plan detail including populated participant arrays

#### Scenario: No-department employee hidden from plans that do not include them
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `GET /api/overtime-plans/:id` where `U` is neither `nguoiTaoId` nor contained in any `nguoiThamGiaIds`
- **THEN** the system returns `403` (or `404` as implemented for hidden resources) and does not return plan data

#### Scenario: No-department employee blocked from creating, editing, deleting, and approving overtime plans
- **WHEN** an authenticated employee with `departmentIds = []` calls `POST /api/overtime-plans`, `PUT /api/overtime-plans/:id`, `DELETE /api/overtime-plans/:id`, or `PATCH /api/overtime-plans/:id/approve`
- **THEN** the system returns `403` and the plan collection is unchanged (approval state is not mutated)

#### Scenario: No-department participant can accept or decline their own item
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `PATCH /api/overtime-plans/:planId/accept` with `itemId` identifying an item where `U` is in `nguoiThamGiaIds`, and `U` is not acting on behalf of another user
- **THEN** the system returns `200` and the item's `trangThaiTiepNhan[U]` is updated to the requested state

#### Scenario: No-department non-participant blocked from accepting another's item
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `PATCH /api/overtime-plans/:planId/accept` for an `itemId` where `U` is not in `nguoiThamGiaIds`
- **THEN** the system returns `403` (or `400`/`403` as implemented for non-participant) and the item is unchanged

#### Scenario: No-department participant can log own actual time
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `PATCH /api/overtime-plans/:planId/actual-time` with `itemId` identifying an item where `U` is in `nguoiThamGiaIds`, providing `actualTimes` keyed by `U`
- **THEN** the system returns `200` and the item's `gioThucTe[U]` is updated

#### Scenario: No-department non-participant blocked from logging actual time
- **WHEN** an authenticated employee with `departmentIds = []` and `userId = U` calls `PATCH /api/overtime-plans/:planId/actual-time` for an `itemId` where `U` is not in `nguoiThamGiaIds`
- **THEN** the system returns `403` and the item is unchanged

### Requirement: Frontend full Chung tab with overtime-only create restriction for no-department employees

The Chung tab SHALL render all category cards (full tab) for authenticated employees regardless of department assignment. Only the overtime plan creation affordance SHALL be hidden for no-department employees. This is a display-only consistency layer; the backend denials defined above remain the enforcement source and SHALL NOT be bypassed by client state.

#### Scenario: No-department employee sees full Chung tab with all cards
- **WHEN** an authenticated employee with `departmentIds = []` opens the Chung tab
- **THEN** all category cards are rendered including "Đã ban hành", "Tạo yêu cầu" (all 4 items), "Tạo nhiệm vụ và kế hoạch công việc" (all 2 items), and "Góp ý riêng" (all 2 items); the overtime plan list modal shows no "Create" button

#### Scenario: No-department participant sees accept/actual-time controls on their own overtime items
- **WHEN** an authenticated employee with `departmentIds = []` opens the `OvertimePlanListModal` and is a participant on a plan item
- **THEN** the accept/actual-time controls for that user's own row remain visible and functional

