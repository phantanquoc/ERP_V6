# Proposal: Fix Maintenance Plan <-> Record Linkage

## Why

Ticking a month cell in the maintenance plan auto-generates a `MaintenanceRecord` (`sourceLogId` 1:1), but deleting that auto-generated record from the Records tab leaves the plan cell green (orphan log), and creating a manual record that matches the same device/content never auto-ticks the plan — causing split ledgers and false "Hoan thanh" progress.

## What Changes

- **P0 - Guard orphan on auto-record delete:** Deleting a `MaintenanceRecord` whose `sourceLogId != null` is blocked (or reverts the linked `MaintenancePlanItemLog.hoanThanh`), preventing green cells without backing records.
- **P1 - Duplicate warning on manual create:** Creating a manual `MaintenanceRecord` that matches an existing plan item (same `machineSystemDetailId` + normalized `noiDung`) returns a warning when a completed log already exists for the record's year.
- **P2 - Opt-in plan linkage on manual create:** When a manual record matches exactly one plan item, the UI offers an opt-in checkbox to also tick the corresponding plan month (derived from `ngayThucHien` month, user-confirmed) in the same transaction, linking `sourceLogId`.
- **P3 - Cycle guard on toggle:** `toggleMonth` validates that the requested `(thang, lanThu)` is within the item's applicable months and `lanThu <= FREQUENCY_TIMES[tanSuat]`, rejecting out-of-cycle ticks that inflate `totalCompleted`.

## Capabilities

### New Capabilities

- `maintenance/plan-record-linkage`: Rules for linking, guarding, and warning between maintenance plans, plan item logs, and maintenance records (orphan prevention, duplicate detection, opt-in tick, cycle validation).

### Modified Capabilities

- `maintenance-performers`: No requirement change - linkage is orthogonal; performers (`nguoiPhu`) continue to propagate as before.

## Impact

- **Backend:** `maintenanceRecordService` (delete guard + duplicate check), `maintenancePlanService.toggleMonth` (cycle guard) + new transactional helper for P2 manual->log linkage, `maintenancePlanController`/`maintenanceRecordController` (warning payload, delete error mapping), routes unchanged.
- **Frontend:** `MaintenanceRecordForm` (warning + opt-in tick checkbox), `MaintenanceRecordList` (delete error toast for auto-records), `maintenanceRecordService` client (handle warning field).
- **DB:** No schema change; `MaintenanceRecord.sourceLogId @unique` and `MaintenancePlanItemLog (itemId,thang,lanThu) @unique` remain as-is.
- **Risk:** Low - additive guards and opt-in behavior; no breaking API contract (warning is additive, delete guard returns 400).
