## ADDED Requirements

### Requirement: Mutation Endpoints Require Role Tier And Department

The system SHALL restrict ProductionProcess mutation endpoints as follows: `POST /api/production-processes` and `PATCH /api/production-processes/:id` require `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)`; `DELETE /api/production-processes/:id` requires `authorize(ADMIN)`. Read endpoints (`GET`) remain authenticated-only. In addition, controllers for POST/PATCH/DELETE SHALL enforce that the caller's `departmentCode` is one of `{'DEPT_PRODUCTION', 'DEPT_QUALITY'}`. Users with `role === 'ADMIN'` SHALL bypass the department check.

#### Scenario: Unauthenticated request is rejected at authenticate middleware
- **WHEN** a request without a valid JWT hits `POST /api/production-processes`
- **THEN** HTTP 401 is returned

#### Scenario: EMPLOYEE in Production is rejected by authorize
- **WHEN** a user with `role === 'EMPLOYEE'` in `DEPT_PRODUCTION` POSTs `/api/production-processes`
- **THEN** HTTP 403 is returned with a role message

#### Scenario: TEAM_LEAD in Accounting is rejected by department guard
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_ACCOUNTING` POSTs `/api/production-processes`
- **THEN** HTTP 403 is returned with a department message

#### Scenario: TEAM_LEAD in Quality can create ProductionProcess
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_QUALITY` POSTs `/api/production-processes` with a valid Sản xuất template
- **THEN** the ProductionProcess is created

#### Scenario: DEPARTMENT_HEAD in Production can update
- **WHEN** a user with `role === 'DEPARTMENT_HEAD'` in `DEPT_PRODUCTION` PATCHes an existing ProductionProcess
- **THEN** the update succeeds

#### Scenario: TEAM_LEAD cannot delete
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_PRODUCTION` DELETEs a ProductionProcess
- **THEN** HTTP 403 is returned (only ADMIN may delete)

#### Scenario: ADMIN bypasses department check
- **WHEN** a user with `role === 'ADMIN'` (irrespective of departmentCode) POSTs `/api/production-processes`
- **THEN** the request proceeds past both authorize and the department guard

### Requirement: Only Sản Xuất Templates May Be Instantiated

The system SHALL reject `POST /api/production-processes` when the referenced `Process.loaiQuyTrinh !== 'Sản xuất'`. The rejection SHALL return HTTP 400 with a Vietnamese message stating that only production-type templates can be instantiated. This check runs inside `productionProcessService.createProductionProcess` after the parent Process is fetched, before the transactional insert.

#### Scenario: Instantiate a maintenance template is rejected
- **GIVEN** a Process row with `loaiQuyTrinh = "Bảo dưỡng"`
- **WHEN** an authorized user POSTs `/api/production-processes` referencing that `processId`
- **THEN** HTTP 400 is returned with a message containing "Sản xuất"
- **AND** no ProductionProcess row is created

#### Scenario: Instantiate a production template succeeds
- **GIVEN** a Process row with `loaiQuyTrinh = "Sản xuất"`
- **WHEN** an authorized user POSTs `/api/production-processes` referencing that `processId` with valid payload
- **THEN** a new ProductionProcess row is created
- **AND** HTTP 201 is returned

#### Scenario: Legacy or custom non-Sản-xuất values are rejected
- **GIVEN** a Process row with `loaiQuyTrinh = "Đóng gói"` (legacy) or `loaiQuyTrinh = "Kiểm định"` (custom, non-Sản-xuất)
- **WHEN** POST is called
- **THEN** the request is rejected with HTTP 400

### Requirement: Frontend Guards Match Backend

The system SHALL mirror the backend permission checks in the frontend so unauthorized users do not encounter dead ends. In `ProductionProcessManagement`, the "Tạo mới" button SHALL be hidden when the current user's `role` is not in `{ADMIN, DEPARTMENT_HEAD, TEAM_LEAD}` OR the user's `departmentCode` is not in `{DEPT_PRODUCTION, DEPT_QUALITY}` (ADMIN bypasses the department check). The template picker SHALL only list Process rows with `loaiQuyTrinh === 'Sản xuất'`.

#### Scenario: Template picker excludes non-Sản-xuất Processes
- **WHEN** the ProductionProcessManagement create modal opens
- **THEN** the "Chọn quy trình mẫu" dropdown lists only Process rows where `loaiQuyTrinh === 'Sản xuất'`

#### Scenario: Create button hidden for user in Accounting department
- **WHEN** a `TEAM_LEAD` in `DEPT_ACCOUNTING` opens the ProductionProcessManagement page
- **THEN** the "Tạo mới" button is not rendered
- **AND** existing rows are still readable

#### Scenario: Quality department head sees the create button
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_QUALITY` opens the page
- **THEN** the "Tạo mới" button is rendered and functional

### Requirement: Quality Page Exposes A ProductionProcess Tab

The system SHALL restructure the `QualityProcess` page tabs to `[processList, productionProcess, orderList, inspection]`. The `processList` tab SHALL render `<ProcessManagement showToggleHienThi>` without the `filterLoaiQuyTrinh` prop (which SHALL be removed from the component's API). The `productionProcess` tab SHALL render `<ProductionProcessManagement>`. Deep-link URLs referencing the removed tab ids (`processProduction`, `processGeneral`) SHALL fall back to the default `processList` tab.

#### Scenario: Old tab deep-link falls back to processList
- **WHEN** a user navigates to `/quality/process?tab=processProduction`
- **THEN** the page loads with `processList` active
- **AND** the URL is not overwritten unexpectedly to another tab

#### Scenario: Quality user creates a ProductionProcess via the new tab
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_QUALITY` opens `/quality/process?tab=productionProcess`
- **THEN** the ProductionProcessManagement component renders
- **AND** the "Tạo mới" action creates a ProductionProcess successfully
