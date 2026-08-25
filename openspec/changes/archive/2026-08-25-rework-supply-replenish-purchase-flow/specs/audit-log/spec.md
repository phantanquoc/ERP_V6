## ADDED Requirements

### Requirement: Supply request decision audit links to replenishment

`SupplyRequestDecision.triggeredPurchaseRequestId` SHALL be a nullable foreign key to `PurchaseRequest.id` (`onDelete: SetNull`) with an index. When warehouse fulfillment creates replenishment purchase requests, each affected decision row SHALL store the id of the purchase request created for its `phanLoai` group, so decision history exposes the replenishment linkage.

#### Scenario: Shortage decision stores its replenishment id
- **WHEN** batch fulfillment groups two shortage lines (same `phanLoai`) into one `SHORTAGE` PR
- **THEN** both resulting `SupplyRequestDecision` rows share the same `triggeredPurchaseRequestId` pointing to that PR

#### Scenario: Non-shortage decision stores no purchase reference
- **WHEN** a line is fulfilled in full with no shortage
- **THEN** its decision row has `triggeredPurchaseRequestId = null`

## MODIFIED Requirements

### Requirement: Cross-entity audit log model

The system SHALL persist an immutable audit record in the `common.AuditLog` table for every CREATE, UPDATE, DELETE, STATUS_CHANGE, and PRICE_UNLOCK action performed on pricing entities (`QuotationRequest`, `Quotation`, `Order`, `ExportCost`). Each record SHALL capture `entityType`, `entityId`, `action`, `actorId`, `actorRole`, optional `before` and `after` JSON snapshots, optional `note`, and `createdAt`. `before` and `after` columns are JSON because the captured payloads are immutable historical snapshots; they MUST NOT be edited after write.

#### Scenario: Audit row written on entity create

- **WHEN** any pricing service successfully creates a new `Quotation`
- **THEN** a row is appended to `common.AuditLog` with `entityType = 'Quotation'`, `action = 'CREATE'`, `before = null`, and `after` containing the created quotation snapshot

#### Scenario: Audit row written on status change

- **WHEN** a pricing service advances an entity's status (no other fields changed)
- **THEN** a row is appended with `action = 'STATUS_CHANGE'`, `before = { status: oldValue }`, `after = { status: newValue }`

#### Scenario: Audit row written on mixed update

- **WHEN** a pricing service updates both status and other fields in the same call
- **THEN** a single row is appended with `action = 'UPDATE'` and full before/after entity snapshots

### Requirement: recordAudit helper is best-effort

The system SHALL expose `recordAudit({ entityType, entityId, action, actorId, actorRole, before?, after?, note? })` from `@utils/auditLog`. The helper MUST wrap its Prisma write in `try/catch` and MUST NEVER propagate errors back to the caller. Audit failures MUST be logged but MUST NOT fail the primary write or any HTTP response.

#### Scenario: Audit write fails

- **WHEN** `recordAudit` is invoked and the underlying Prisma write throws
- **THEN** the helper catches the error, logs a warning, and resolves without rejecting

#### Scenario: Audit call site stays outside the primary transaction

- **WHEN** a service writes to a pricing entity inside `prisma.$transaction`
- **THEN** `recordAudit` is invoked AFTER the transaction commits, not inside it

### Requirement: Audit log read endpoint with RBAC

The system SHALL expose `GET /api/audit-logs` returning paginated audit rows filtered by optional `entityType`, `entityId`, `action`, and `actorId` query params. The endpoint SHALL accept `page` (default 1) and `limit` (default 20, max 100). RBAC SHALL restrict the endpoint to roles `ADMIN` and `DEPARTMENT_HEAD`. The response SHALL use the standard envelope `{ success, data, pagination }`.

#### Scenario: ADMIN reads audit log for a quotation

- **WHEN** an authenticated `ADMIN` calls `GET /api/audit-logs?entityType=Quotation&entityId=abc123&page=1&limit=20`
- **THEN** the system returns `{ success: true, data: [...], pagination: { page, limit, total, totalPages } }`

#### Scenario: TEAM_LEAD denied audit log access

- **WHEN** an authenticated `TEAM_LEAD` calls `GET /api/audit-logs`
- **THEN** the system rejects with HTTP 403 `ForbiddenError`

#### Scenario: Filter rejected for unknown entityType value

- **WHEN** the request supplies `entityType` outside the union `'QuotationRequest' | 'Quotation' | 'Order' | 'ExportCost'`
- **THEN** the system returns HTTP 400 `ValidationError('entityType không hợp lệ')`
