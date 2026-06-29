## ADDED Requirements

### Requirement: Unified personal history feed

The system SHALL provide a single, paginated, time-ordered history feed that aggregates every record an authenticated user has created or is related to across the 25 supported entity types, returned as a uniform row shape with `entityType`, `entityId`, `group`, `title`, optional `code`, optional `status`, `createdAt`, `role` (`creator` | `related`), optional `metadata`, and `routeHint`.

The five groups are: `Yêu cầu`, `Nhiệm vụ`, `Kế hoạch`, `Báo cáo`, `Phiếu`. Items SHALL be sorted by `createdAt` descending. If the same physical row qualifies under both `creator` and `related` definitions, the system SHALL emit a single item with `role = 'creator'`.

#### Scenario: Employee fetches own history with default params
- **WHEN** an authenticated EMPLOYEE calls `GET /api/me/history` without query parameters
- **THEN** the system returns `{ success: true, data: { items, total, page, totalPages, groupCounts }, pagination }` where `items` contains records created within the last 90 days by that user across all 25 entity types, sorted by `createdAt` descending, with `limit = 20` and `page = 1`

#### Scenario: Task assigned to user surfaces as related
- **WHEN** an authenticated user calls `GET /api/me/history` and the user is in the `nguoiNhanIds` array of a `Task` but is not `nguoiGiaoId`
- **THEN** the returned item has `entityType = 'task'`, `group = 'Nhiệm vụ'`, and `role = 'related'`

#### Scenario: Task created by and assigned to the same user
- **WHEN** an authenticated user calls `GET /api/me/history` and the user is both `nguoiGiaoId` and contained in `nguoiNhanIds` of a `Task`
- **THEN** the system returns the task exactly once with `role = 'creator'`

#### Scenario: AcceptanceHandover surfaces as related via nguoiNhanId
- **WHEN** an authenticated user calls `GET /api/me/history` and there exists an `AcceptanceHandover` where `nguoiNhanId` equals the user's `employeeId` and `createdById` does not equal the user's `userId`
- **THEN** the returned item has `entityType = 'acceptance-handover'`, `group = 'Phiếu'`, and `role = 'related'`

### Requirement: Filtering, search, and date range

The history endpoint SHALL accept the query parameters `dateFrom` (YYYY-MM-DD), `dateTo` (YYYY-MM-DD), `types[]` (subset of entity types), `statuses[]` (string list), `roleFilter` (`created` | `related` | `both`, default `both`), `search` (case-insensitive substring), `page` (default 1), and `limit` (default 20, max 100).

`dateFrom` and `types[]` SHALL be applied at the database layer (WHERE clauses on each `findMany`). `statuses[]`, `roleFilter`, `search`, and pagination SHALL be applied after merging the per-entity result sets. The response SHALL include `groupCounts` reflecting the counts per group AFTER filters but BEFORE pagination.

#### Scenario: Filter by group narrows the database queries
- **WHEN** an authenticated user calls `GET /api/me/history?types=quotation-request&types=supply-request`
- **THEN** the system executes only the Prisma queries for the requested entity types and skips the others, and the response contains only items in those types

#### Scenario: Search matches title or code
- **WHEN** an authenticated user calls `GET /api/me/history?search=NCC123`
- **THEN** the system returns only items whose `title` or `code` contains the substring `NCC123` (case-insensitive)

#### Scenario: Role filter limits to created items
- **WHEN** an authenticated user calls `GET /api/me/history?roleFilter=created`
- **THEN** the response items SHALL all have `role = 'creator'`

#### Scenario: Limit exceeding maximum is clamped
- **WHEN** an authenticated user calls `GET /api/me/history?limit=500`
- **THEN** the system responds successfully with `limit = 100` enforced and returns at most 100 items per page

#### Scenario: Invalid date range rejected
- **WHEN** an authenticated user calls `GET /api/me/history?dateFrom=2026-12-31&dateTo=2026-01-01`
- **THEN** the system returns a 400 response with a Vietnamese validation message indicating the date range is invalid

### Requirement: Permission model for viewing another user's history

The system SHALL expose `GET /api/users/:userId/history` and SHALL gate it by the existing RBAC+ABAC middleware chain. `ADMIN` SHALL be allowed regardless of department. `DEPARTMENT_HEAD` SHALL be allowed only when the target user's employee record has the same `departmentId` as the caller. All other roles SHALL receive a 403 response.

#### Scenario: ADMIN views any user
- **WHEN** an authenticated ADMIN calls `GET /api/users/<anyUserId>/history`
- **THEN** the system returns the target user's history regardless of department

#### Scenario: DEPARTMENT_HEAD views same-department subordinate
- **WHEN** an authenticated DEPARTMENT_HEAD calls `GET /api/users/<userId>/history` and the target user's employee record has the same `departmentId` as the caller
- **THEN** the system returns the target user's history

#### Scenario: DEPARTMENT_HEAD blocked from other departments
- **WHEN** an authenticated DEPARTMENT_HEAD calls `GET /api/users/<userId>/history` and the target user belongs to a different department
- **THEN** the system returns a 403 response with a Vietnamese message indicating access is denied

#### Scenario: EMPLOYEE blocked from others
- **WHEN** an authenticated EMPLOYEE or TEAM_LEAD calls `GET /api/users/<userId>/history`
- **THEN** the system returns a 403 response

#### Scenario: Target user not found
- **WHEN** an authenticated ADMIN calls `GET /api/users/<nonexistentUserId>/history`
- **THEN** the system returns a 404 response with a Vietnamese message indicating the user was not found

### Requirement: Deep-link route hints

Each returned history item SHALL include a `routeHint` string that identifies the canonical management page for the entity (e.g., `/quotations/:id`, `/tasks/:id`). The frontend SHALL use this hint to render an "Mở ở trang gốc" button on the read-only detail modal that navigates to the actual app route for that entity.

#### Scenario: Quotation deep-link
- **WHEN** an authenticated user fetches history and an item has `entityType = 'quotation'` and `entityId = 'cu1xy...'`
- **THEN** that item's `routeHint` equals `/quotations/cu1xy...`

#### Scenario: RepairRequest stringified id
- **WHEN** an authenticated user fetches history and an item has `entityType = 'repair-request'`
- **THEN** that item's `entityId` is a string representation of the integer primary key, and `routeHint` ends with the same string

### Requirement: Graceful partial-failure handling

The service SHALL isolate failures from individual entity queries so that a database error in one entity type SHALL NOT cause the entire response to fail. Each branch of the parallel `Promise.all` SHALL catch its own error, log it, and contribute an empty array to the merged result.

#### Scenario: One entity query fails
- **WHEN** an authenticated user calls `GET /api/me/history` and the `MaintenanceRecord` query throws a database error
- **THEN** the system logs the error server-side and returns a successful response containing all other entity types, with `MaintenanceRecord` represented by zero items

### Requirement: Frontend timeline page and quick action

The system SHALL expose a `/my-history` route on the frontend that renders a sticky filter bar (date-range quick picker for 30/90/365/all/custom, group checkboxes, status select, role toggle, search input), a day-grouped timeline, and pagination controls. Clicking an item SHALL open a read-only detail modal containing the item's metadata and a button labelled "Mở ở trang gốc" that navigates to the route resolved from `routeHint`. The `EmployeeDashboard` page SHALL show a quick-action card labelled "Lịch sử của tôi" linking to `/my-history`.

#### Scenario: User opens history page
- **WHEN** an authenticated user navigates to `/my-history`
- **THEN** the page loads the unified history via the `useMyHistory` hook with default filters (last 90 days, all groups, role both) and renders the timeline grouped by day in `DD/MM/YYYY` headers

#### Scenario: User clicks an item
- **WHEN** the user clicks a row on the timeline
- **THEN** a modal opens showing the item's `title`, `code`, `status`, `createdAt`, role badge, and metadata, plus a button "Mở ở trang gốc" that navigates to `routeHint`

#### Scenario: Quick action visible on dashboard
- **WHEN** an authenticated EMPLOYEE opens `EmployeeDashboard`
- **THEN** the dashboard renders a quick-action card titled "Lịch sử của tôi" that navigates to `/my-history` when clicked
