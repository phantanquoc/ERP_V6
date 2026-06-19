## Why

Today a `MachineSystem` represents a *type* of equipment (e.g., one record for "Vacuum Frying System") while individual physical machines live in a separate `Machine` model under the Production department. Operators have eight physical vacuum fryers on the shop floor, each with its own components, faults, repair history and maintenance schedule, but the current model forces them to share one detail tree across all eight machines. Two parallel entities also create confusion: technical staff manage `MachineSystem` in QLHTM while production staff manage `Machine` in QLSX, and downstream records (faults, repair items, operations, finished products, quality evaluations, handovers) link inconsistently to one or the other.

This change unifies the two concepts: each physical machine becomes a single `MachineSystem` record with its own component tree, fault history, repair history, operation log, maintenance plan and status timeline. New machines can be cloned from a template machine or created from scratch.

## What Changes

- **BREAKING** Drop the `Machine` model and the `/api/machines` route entirely. The "Quản lý máy móc" tab inside the Production department disappears.
- **BREAKING** `MachineSystem` semantics change: each row now represents one physical machine. New optional fields: `trangThai` (HOAT_DONG / BAO_TRI / NGUNG_HOAT_DONG), `parentSystemId` (template the machine was cloned from).
- **BREAKING** Five models drop their `machineId` column and gain (or already have) `machineSystemId`: `SystemOperation`, `FinishedProduct`, `QualityEvaluation`, `RepairRequestItem`, `AcceptanceHandoverItem`, `FaultRecord`. Existing data is backfilled by following `Machine.machineSystemId`.
- **BREAKING** Replace `MachineActivityReport` (aggregate counts) with `MachineStatusLog` (per-machine status transition: machine, old status, new status, reason, who, when). The QLHTM tab label changes from "Báo cáo hoạt động" to "Nhật ký trạng thái máy".
- `FaultTemplate.machineSystemDetailId` becomes nullable. Templates can hold free-text hints (`tenDetailGoiY`, `loaiDetailGoiY`) so the same template can be reused across machines with different detail trees.
- Add `MachineSystemService.clone(sourceId, overrides)` to copy a template machine's full detail tree into a new machine.
- Add `MachineSystemService.getSummary(systemId)` returning recent faults, repair items, operations, maintenance records and status logs for the drawer.
- Add `MachineSystemService.updateStatus(systemId, newStatus, reason, user)` that writes both the system row and a `MachineStatusLog` entry in one transaction.
- AI agent registry: drop `list_machines` / `get_machine` / `create_machine` / `update_machine` / `delete_machine`; extend `list_machine_systems` with `trangThai` / `khuVuc` / `loaiHeThong` filters; rewrite `create_repair_request` to accept `machineSystemId` instead of free-text `tenHeThong`; add `list_machine_status_logs` and `update_machine_status`. Update `tests/test_registry.py` count.
- Refactor `prisma/seed-machine-system-chien.ts`: seed one template `HT-CCK-MAU` plus eight cloned machines `HT-CCK-01` … `HT-CCK-08`, each with its own detail tree.

## Capabilities

### New Capabilities
- `machine-as-physical-instance`: Owning each physical machine as a single `MachineSystem` record, including create-from-scratch, clone-from-template, status field, and the unified summary view (faults / repairs / operations / maintenance / status timeline).
- `machine-status-log`: Per-machine status transition log replacing the old aggregate activity report.

### Modified Capabilities
- `technical-fault-management`: `FaultTemplate.machineSystemDetailId` becomes optional and templates can carry free-text detail hints.
- `technical-machine-details`: Detail trees are scoped to one physical machine; cloning copies the whole tree under a new owner.
- `technical-repair-item-context`: Repair request items and acceptance handover items drop their `machineId` link and rely on `machineSystemId` + `machineSystemDetailId` for context.

## Impact

- **Database**: `backend/prisma/schema/business_machines.prisma`, `business_production.prisma`, `common.prisma`. New migration drops `machines` and `machine_activity_reports`, creates `machine_status_logs`, adds `MachineSystem.trangThai` / `parentSystemId`, renames `machineId` → `machineSystemId` on five models with data backfill via `Machine.machineSystemId`.
- **Backend services**: `machineService` (delete), `machineActivityReportService` (replace with `machineStatusLogService`), `machineSystemService` (extend), `faultTemplateService`, `faultRecordService`, `repairRequestService`, `acceptanceHandoverService`, `systemOperationService`, `finishedProductService`, `qualityEvaluationService`. ROUTE_MAP in `routes/index.ts` updates.
- **Frontend**: `MachineManagement` (delete), `MachineActivityReport` (replace with `MachineStatusLogList`), `MachineSummaryDrawer`, `MachineSystemList`, `RepairRequestForm`, `AcceptanceHandoverForm`, `SystemOperationForm`, `FinishedProductForm`, `QualityEvaluationForm`, plus `TechnicalQuality` and `ProductionDepartment` page wiring. Hooks/services aligned (`useMachines` removed, `useMachineStatusLogs` and `useCloneMachineSystem` added, `useMachineSystemSummary` extended).
- **AI service**: `ai-service/agent/registry.py` and `ai-service/tests/test_registry.py`.
- **Seed/data**: `backend/prisma/seed-machine-system-chien.ts` rewritten; existing data migrated by the schema migration.
- **Out of scope**: Production module business logic (system_operations, finished_products, quality_evaluations) only renames the FK; maintenance plan/record schema stays unchanged; RBAC/ABAC roles unchanged.
