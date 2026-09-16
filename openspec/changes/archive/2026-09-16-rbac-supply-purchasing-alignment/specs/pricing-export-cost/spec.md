## MODIFIED Requirements

### Requirement: Role-based authorization on export-cost routes

All `/api/export-costs` routes SHALL require authentication and SHALL enforce authorization through `requireRule` with the action matching the operation's true semantics. Read operations (`GET` list and detail) SHALL use `EXPORT` and be available to `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, and `EMPLOYEE`. Create (`POST`) SHALL use `CREATE`; update (`PATCH`/`PUT`) SHALL use `UPDATE`; both follow the baseline that any authenticated in-department user (including `EMPLOYEE`) may perform them. Delete (`DELETE`) SHALL use `DELETE` and remain restricted to `DEPARTMENT_HEAD` and `ADMIN` by baseline.

#### Scenario: Employee can list export costs

- **WHEN** an `EMPLOYEE` calls `GET /api/export-costs`
- **THEN** the server responds with HTTP 200 and a paginated list

#### Scenario: In-department employee can create an export cost

- **WHEN** an authenticated `EMPLOYEE` in a department granted `export-costs/CREATE` calls `POST /api/export-costs` with valid data
- **THEN** the server responds with HTTP 201 and the row is inserted

#### Scenario: Employee cannot delete an export cost

- **WHEN** an `EMPLOYEE` calls `DELETE /api/export-costs/:id`
- **THEN** the server responds with HTTP 403 and the row remains

#### Scenario: Department head can delete an export cost

- **WHEN** a `DEPARTMENT_HEAD` calls `DELETE /api/export-costs/:id` for an existing row
- **THEN** the server responds with HTTP 200 and the row is removed
