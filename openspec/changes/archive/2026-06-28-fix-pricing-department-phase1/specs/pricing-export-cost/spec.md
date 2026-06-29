## ADDED Requirements

### Requirement: Role-based authorization on export-cost routes

All `/api/export-costs` routes SHALL require authentication and SHALL enforce role-based authorization. Read operations (`GET` list and detail) SHALL be available to `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, and `EMPLOYEE`. Create and update operations (`POST`, `PATCH`) SHALL be restricted to `ADMIN` and `DEPARTMENT_HEAD`. Delete operations (`DELETE`) SHALL be restricted to `ADMIN`.

#### Scenario: Employee can list export costs

- **WHEN** an `EMPLOYEE` calls `GET /api/export-costs`
- **THEN** the server responds with HTTP 200 and a paginated list

#### Scenario: Employee cannot create an export cost

- **WHEN** an `EMPLOYEE` calls `POST /api/export-costs`
- **THEN** the server responds with HTTP 403 and no row is inserted

#### Scenario: Team lead cannot delete an export cost

- **WHEN** a `TEAM_LEAD` calls `DELETE /api/export-costs/:id`
- **THEN** the server responds with HTTP 403 and the row remains

#### Scenario: Admin can delete an export cost

- **WHEN** an `ADMIN` calls `DELETE /api/export-costs/:id`
- **THEN** the server responds with HTTP 200 and the row is removed

### Requirement: Standard response envelope for export-cost endpoints

All `/api/export-costs` endpoints SHALL return responses wrapped in the project-standard envelope `{ success: boolean, message?: string, data?: T, pagination?: { page, limit, total, totalPages } }`. Raw entity payloads SHALL NOT be returned.

#### Scenario: Get by id returns envelope

- **WHEN** a client calls `GET /api/export-costs/:id` for an existing row
- **THEN** the response body is `{ success: true, data: { ...exportCost } }`

#### Scenario: Create returns envelope with Vietnamese message

- **WHEN** a `DEPARTMENT_HEAD` calls `POST /api/export-costs` with valid data
- **THEN** the response body is `{ success: true, message: 'Tạo chi phí thành công', data: { ...exportCost } }` and HTTP status is 201

#### Scenario: Delete returns envelope

- **WHEN** an `ADMIN` calls `DELETE /api/export-costs/:id` for an existing row
- **THEN** the response body is `{ success: true, message: 'Xóa chi phí thành công' }`

#### Scenario: Not found returns standard error

- **WHEN** a client calls `GET /api/export-costs/:id` for a non-existent row
- **THEN** the response body is the standard error envelope produced by `NotFoundError('Không tìm thấy chi phí')`

### Requirement: Server-driven pagination for export-cost list

The `GET /api/export-costs` endpoint SHALL accept `page`, `limit`, `search`, and `loaiChiPhi` query parameters and paginate server-side. `limit` MUST be one of `10`, `20`, `50`, `100` with default `20`.

#### Scenario: Search filters server-side

- **WHEN** a client calls `GET /api/export-costs?search=freight`
- **THEN** the server returns only rows whose searchable fields match "freight" within the requested page
