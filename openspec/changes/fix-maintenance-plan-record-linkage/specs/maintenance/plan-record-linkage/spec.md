# Spec Delta: maintenance/plan-record-linkage

## Purpose

Governs the linkage and mutual consistency between maintenance plans, plan item completion logs, and maintenance records — orphan prevention, duplicate detection, opt-in ticking, and cycle validation.

## ADDED Requirements

### Requirement: Block deletion of auto-generated records (orphan prevention)
The system MUST prevent deletion of a `MaintenanceRecord` that was auto-generated from a plan log (`sourceLogId != null`) via the records API, leaving the plan cell green without backing record.

#### Scenario: Delete auto-generated record is rejected
- **WHEN** a client calls `DELETE /maintenance-records/:id` where the record has `sourceLogId != null`
- **THEN** the API responds with 400 and message indicating the record must be removed by unticking the plan cell

#### Scenario: Delete manual record succeeds
- **WHEN** a client calls `DELETE /maintenance-records/:id` where `sourceLogId == null`
- **THEN** the record is deleted normally with 200

### Requirement: Warn on duplicate manual record matching a completed plan log
When a manual record is created whose device and normalized content match a plan item that already has a completed log in the same year, the API MUST return a soft warning alongside success.

#### Scenario: Manual create matching completed log returns warning
- **WHEN** a client creates a manual record with `machineSystemDetailId` and `noiDung` matching a plan item (same `machineSystemId`, same year as `ngayThucHien`) that has a `hoanThanh=true` log
- **THEN** the API responds 201 with `data` created and `warning.code == "DUPLICATE_PLAN_LOG"` and `warning.planId`

#### Scenario: Manual create with no match returns no warning
- **WHEN** a manual record does not match any completed plan log
- **THEN** the API responds 201 without a `warning` field

### Requirement: Opt-in manual record to plan linkage
When a manual record matches exactly one plan item in the target year, the client MAY request that the record simultaneously tick the corresponding plan month, creating/linking the log in one transaction.

#### Scenario: Manual create with opt-in link creates log and links sourceLogId
- **WHEN** a client creates a record with `linkPlan: { planId, itemId, thang, lanThu }` referencing the matched item and a valid `(thang, lanThu)`
- **THEN** the system creates (or updates to `hoanThanh=true`) the `MaintenancePlanItemLog` and creates the record with `sourceLogId` equal to that log's id in one transaction

#### Scenario: Opt-in linkage rejects already-completed cell
- **WHEN** `linkPlan` references a `(itemId, thang, lanThu)` that already has `hoanThanh=true`
- **THEN** the API responds with 409

### Requirement: Cycle guard on plan tick
Toggling a plan month cell MUST be rejected if the requested month is outside the item's applicable months or the occurrence exceeds the frequency's per-month limit.

#### Scenario: Tick outside applicable months is rejected
- **WHEN** `POST /maintenance-plans/:planId/items/:itemId/toggle-month` is called with `thang` not in `getApplicableMonths(tanSuat, thangBatDau)`
- **THEN** the API responds with 400

#### Scenario: Tick with lanThu exceeding frequency limit is rejected
- **WHEN** `lanThu > FREQUENCY_TIMES[tanSuat]` (e.g., HANG_THANG with lanThu=2)
- **THEN** the API responds with 400

#### Scenario: Valid tick succeeds
- **WHEN** `(thang, lanThu)` is within applicable months and within per-month limit
- **THEN** the toggle succeeds as before and auto-record is created/linked
