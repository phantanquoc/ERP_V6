## MODIFIED Requirements

### Requirement: Mutation Endpoints Require Role Tier And Department

The system SHALL restrict ProductionProcess mutation endpoints as follows: `POST /api/production-processes` and `PATCH /api/production-processes/:id` require `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)`; `DELETE /api/production-processes/:id` requires `authorize(ADMIN)`. Read endpoints (`GET`) remain authenticated-only. In addition, controllers for POST/PATCH/DELETE SHALL enforce that the caller's `departmentCode` is exactly `'DEPT_PRODUCTION'`. Users with `role === 'ADMIN'` SHALL bypass the department check. `DEPT_QUALITY` is NOT part of the mutation whitelist — Quality users receive read-only access to ProductionProcess.

#### Scenario: Unauthenticated request is rejected at authenticate middleware
- **WHEN** a request without a valid JWT hits `POST /api/production-processes`
- **THEN** HTTP 401 is returned

#### Scenario: EMPLOYEE in Production is rejected by authorize
- **WHEN** a user with `role === 'EMPLOYEE'` in `DEPT_PRODUCTION` POSTs `/api/production-processes`
- **THEN** HTTP 403 is returned with a role message

#### Scenario: TEAM_LEAD in Accounting is rejected by department guard
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_ACCOUNTING` POSTs `/api/production-processes`
- **THEN** HTTP 403 is returned with a department message

#### Scenario: TEAM_LEAD in Quality cannot create ProductionProcess
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_QUALITY` POSTs `/api/production-processes` with a valid Sản xuất template
- **THEN** HTTP 403 is returned with a department message
- **AND** no ProductionProcess row is created

#### Scenario: DEPARTMENT_HEAD in Quality cannot update ProductionProcess
- **WHEN** a user with `role === 'DEPARTMENT_HEAD'` in `DEPT_QUALITY` PATCHes an existing ProductionProcess
- **THEN** HTTP 403 is returned with a department message
- **AND** the row remains unchanged

#### Scenario: DEPARTMENT_HEAD in Production can update
- **WHEN** a user with `role === 'DEPARTMENT_HEAD'` in `DEPT_PRODUCTION` PATCHes an existing ProductionProcess
- **THEN** the update succeeds

#### Scenario: TEAM_LEAD cannot delete
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_PRODUCTION` DELETEs a ProductionProcess
- **THEN** HTTP 403 is returned (only ADMIN may delete)

#### Scenario: ADMIN bypasses department check
- **WHEN** a user with `role === 'ADMIN'` (irrespective of departmentCode, including DEPT_QUALITY) POSTs `/api/production-processes`
- **THEN** the request proceeds past both authorize and the department guard

#### Scenario: Quality user can still read ProductionProcess
- **WHEN** a user with any role in `DEPT_QUALITY` calls `GET /api/production-processes` or `GET /api/production-processes/:id`
- **THEN** HTTP 200 is returned with the data
- **AND** the department guard does NOT run on read paths

### Requirement: Frontend Guards Match Backend

The system SHALL mirror the backend permission checks in the frontend so unauthorized users do not encounter dead ends. In `ProductionProcessManagement`, the "Tạo mới" button SHALL be hidden when the current user's `role` is not in `{ADMIN, DEPARTMENT_HEAD, TEAM_LEAD}` OR the user's `departmentCode` is not `'DEPT_PRODUCTION'` (ADMIN bypasses the department check). The template picker SHALL only list Process rows with `loaiQuyTrinh === 'Sản xuất'`. Row-level Edit/Delete actions SHALL follow the same visibility rule as "Tạo mới".

#### Scenario: Template picker excludes non-Sản-xuất Processes
- **WHEN** the ProductionProcessManagement create modal opens (for an authorized user)
- **THEN** the "Chọn quy trình mẫu" dropdown lists only Process rows where `loaiQuyTrinh === 'Sản xuất'`

#### Scenario: Create button hidden for user in Accounting department
- **WHEN** a `TEAM_LEAD` in `DEPT_ACCOUNTING` opens the ProductionProcessManagement page
- **THEN** the "Tạo mới" button is not rendered
- **AND** existing rows are still readable

#### Scenario: Create button hidden for Quality department head
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_QUALITY` opens the page
- **THEN** the "Tạo mới" button is not rendered
- **AND** existing rows are still readable

#### Scenario: Production department head sees the create button
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_PRODUCTION` opens the page
- **THEN** the "Tạo mới" button is rendered and functional

#### Scenario: ADMIN sees the create button regardless of department
- **WHEN** a user with `role === 'ADMIN'` opens the page
- **THEN** the "Tạo mới" button is rendered

### Requirement: Quality Page Exposes A ProductionProcess Tab

The system SHALL restructure the `QualityProcess` page tabs to `[processList, productionProcess, orderList, inspection]`. The `processList` tab SHALL render `<ProcessManagement showToggleHienThi>` without the `filterLoaiQuyTrinh` prop (which SHALL be removed from the component's API). The `productionProcess` tab SHALL render `<ProductionProcessManagement>` in a read-only posture for Quality users — the tab remains visible so Quality can inspect production instances but the create/edit affordances are hidden per the Frontend Guards requirement above. Deep-link URLs referencing the removed tab ids (`processProduction`, `processGeneral`) SHALL fall back to the default `processList` tab.

#### Scenario: Old tab deep-link falls back to processList
- **WHEN** a user navigates to `/quality/process?tab=processProduction`
- **THEN** the page loads with `processList` active
- **AND** the URL is not overwritten unexpectedly to another tab

#### Scenario: Quality user opens the ProductionProcess tab in read-only mode
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_QUALITY` opens `/quality/process?tab=productionProcess`
- **THEN** the ProductionProcessManagement component renders
- **AND** existing ProductionProcess rows are visible in the table
- **AND** the "Tạo mới" button is NOT rendered
- **AND** any attempt to POST to `/api/production-processes` from that session returns HTTP 403

#### Scenario: Production user in same route sees mutation controls
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_PRODUCTION` opens `/quality/process?tab=productionProcess` (they may reach it via any URL)
- **THEN** the "Tạo mới" button IS rendered and functional
