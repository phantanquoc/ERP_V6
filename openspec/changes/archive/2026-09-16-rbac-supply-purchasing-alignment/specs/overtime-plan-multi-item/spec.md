## ADDED Requirements

### Requirement: Work plan and overtime plan routes enforce requireRule

All read and mutation routes for `work-plans` and `overtime-plans` SHALL be protected by `requireRule` with the action matching the operation's semantics, in addition to existing service-level ownership checks. No route for these resources SHALL rely solely on `authenticate`.

- `GET /api/work-plans`, `GET /api/work-plans/my-work-plans`, `GET /api/work-plans/:id` SHALL require `requireRule('work-plans', 'READ')`. `DELETE /api/work-plans/:id` SHALL require `requireRule('work-plans', 'DELETE')`. `POST` and `PUT` remain `CREATE`/`UPDATE` as before.
- `GET /api/overtime-plans`, `GET /api/overtime-plans/my-plans`, `GET /api/overtime-plans/:id` SHALL require `requireRule('overtime-plans', 'READ')`. `PATCH /api/overtime-plans/:id/accept` and `PATCH /api/overtime-plans/:id/actual-time` SHALL require `requireRule('overtime-plans', 'UPDATE')`. The existing `PATCH /:id/approve` gate SHALL use `APPROVE`.

#### Scenario: Cross-department read is blocked at the route
- **WHEN** an authenticated `EMPLOYEE` in `DEPT_ACCOUNTING` calls `GET /api/work-plans` for a plan owned by `DEPT_PRODUCTION`
- **THEN** the server responds with `403` and does not return the plan list

#### Scenario: Cross-department overtime accept is blocked
- **WHEN** an authenticated user outside the overtime plan's department calls `PATCH /api/overtime-plans/:id/accept`
- **THEN** the server responds with `403` and does not modify the plan
