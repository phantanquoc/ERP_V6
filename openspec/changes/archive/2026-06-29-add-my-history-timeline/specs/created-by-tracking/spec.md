## ADDED Requirements

### Requirement: Add createdById to thirteen models

The Prisma schema SHALL add a nullable `createdById String?` column with `@@index([createdById])` to the following 13 models: `FaultRecord`, `MaintenancePlan`, `MaintenanceRecord`, `AcceptanceHandover`, `MaterialEvaluation`, `FinishedProduct`, `QualityEvaluation`, `ProductionReport`, `InternalInspection`, `CustomerFeedback`, `Invoice`, `RepairRequest`, `TaxReport`. The column SHALL reference `auth.User.id` but SHALL NOT be enforced as a foreign-key constraint at the database level (kept as a soft reference for backfill leniency). The existing free-text creator fields SHALL be preserved without modification.

#### Scenario: Schema includes new column on every model
- **WHEN** `prisma generate` is run after applying the migration
- **THEN** each of the 13 models in the generated client exposes a `createdById: string | null` property and the database has an index on that column

#### Scenario: Existing rows remain queryable
- **WHEN** the migration is applied against a database with existing data
- **THEN** existing rows retain their values for every other column and have `createdById = NULL` until backfilled

### Requirement: Migration is additive and reversible

The migration `add-created-by-tracking` SHALL only ADD columns and indexes. It SHALL NOT drop, rename, or alter any existing column, type, default, or constraint. The migration SHALL be reversible by dropping the 13 added columns and their indexes with no data loss for any column that pre-existed.

#### Scenario: Forward migration applies cleanly
- **WHEN** an operator runs `npx prisma migrate dev --name add-created-by-tracking` against a clean database with existing seed data
- **THEN** the migration completes without errors and no pre-existing data is altered

#### Scenario: Down migration is safe
- **WHEN** an operator manually rolls back by dropping the added columns and indexes
- **THEN** the database returns to the pre-migration schema and all pre-existing data remains intact

### Requirement: Best-effort backfill script with dry-run

The repository SHALL include `backend/prisma/scripts/backfillCreatedById.ts` that, for each Group-B model with a free-text creator field, builds a `Map<fullName, userId>` from the `User` table and attempts to populate `createdById` on rows where the text field is non-empty AND `createdById IS NULL`. The script SHALL support a `--dry-run` flag that reports proposed updates without writing. Rows where the text does not uniquely match exactly one user SHALL be skipped and logged with the entity name, row id, and reason. The existing free-text fields SHALL NEVER be modified. `RepairRequest` and `TaxReport` SHALL NOT be backfilled (no source data).

#### Scenario: Dry-run reports without writing
- **WHEN** an operator runs the backfill script with `--dry-run`
- **THEN** the script prints a summary of how many rows would be updated per model and how many were skipped (with reasons), and the database remains unchanged

#### Scenario: Unique name match populates createdById
- **WHEN** the script runs without `--dry-run` and a `FaultRecord` has `nguoiPhatHien = 'Trần Văn B'` and exactly one `User` has `fullName = 'Trần Văn B'`
- **THEN** that record's `createdById` is set to the matching user's id and its `nguoiPhatHien` text is left unchanged

#### Scenario: Ambiguous name is skipped
- **WHEN** the script runs and a row's text-name matches two or more users
- **THEN** the script logs the row id with reason "ambiguous: N users named '<name>'" and leaves `createdById = NULL`

#### Scenario: Unknown name is skipped
- **WHEN** the script runs and a row's text-name does not match any user
- **THEN** the script logs the row id with reason "no match" and leaves `createdById = NULL`

### Requirement: Service create-paths set createdById

The thirteen service modules `faultRecordService`, `maintenancePlanService`, `maintenanceRecordService`, `materialEvaluationService`, `finishedProductService`, `qualityEvaluationService`, `productionReportService`, `internalInspectionService`, `customerFeedbackService`, `invoiceService`, `acceptanceHandoverService`, `repairRequestService`, and `taxReportService` SHALL accept the creator's `userId` on their create function and SHALL persist it as `createdById`. The corresponding controllers SHALL pass `req.user.id` into the service.

#### Scenario: Creating a new fault record populates createdById
- **WHEN** an authenticated user submits `POST /api/fault-records` with a valid payload
- **THEN** the persisted `FaultRecord` row has `createdById = req.user.id` and the existing `nguoiPhatHien` text field is set from the request payload as before

#### Scenario: Backwards-compatible service signature
- **WHEN** the create function is called without an explicit `userId` from internal callers (e.g., seed scripts)
- **THEN** the row is created with `createdById = NULL` and no error is raised
