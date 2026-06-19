## 1. Pre-flight checks and Prisma schema migration

- [x] 1.1 Run a SQL pre-flight query against the production-mirror database to count `(maChien, machineSystemId)` collisions that would arise after backfilling `FinishedProduct.machineSystemId` and `QualityEvaluation.machineSystemId`; abort and surface to ops if the count is greater than zero
- [x] 1.2 Capture a `pg_dump` of the `business` schema in dev and document the rollback command in the change directory before touching the schema
- [x] 1.3 Update `backend/prisma/schema/business_machines.prisma`: add `parentSystemId String?` and `trangThai MachineStatus @default(HOAT_DONG)` to `MachineSystem`, add the self-relation for `parentSystemId`, and add the `statusLogs MachineStatusLog[]` back-relation
- [x] 1.4 Add the new `MachineStatusLog` model in `business_machines.prisma` with fields `id`, `machineSystemId`, `trangThaiCu`, `trangThaiMoi`, `nguyenNhan`, `nguoiCapNhat`, `ghiChu`, `thoiDiem`, `createdAt`, `updatedAt`, indexes on `[machineSystemId]` and `[thoiDiem]`, and an `onDelete: Cascade` relation to `MachineSystem`
- [x] 1.5 Make `FaultTemplate.machineSystemId` and `FaultTemplate.machineSystemDetailId` nullable, switch their relations to `onDelete: SetNull`, and add `tenDetailGoiY String?` and `loaiDetailGoiY String?`
- [x] 1.6 Remove the `Machine` model and the `machines` back-relation from `MachineSystem`; delete the `MachineActivityReport` model
- [x] 1.7 In `business_production.prisma`, drop `machineId` and `tenMay`/`machine` relation fields from `SystemOperation`, `FinishedProduct`, and `QualityEvaluation`; add `machineSystemId String?` with `onDelete: SetNull` relations to `MachineSystem`; replace unique constraints `[maChien, machineId]` with `[maChien, machineSystemId]` on `finished_products` and `quality_evaluations`
- [x] 1.8 In the repair-request and acceptance-handover schema files, drop the `machineId` column and `Machine` relation from `RepairRequestItem` and `AcceptanceHandoverItem`, keep `machineSystemId` and `machineSystemDetailId`
- [x] 1.9 In `business_machines.prisma` `FaultRecord`, drop `machineId` and the `Machine` relation while keeping `machineSystemId` (already nullable)
- [x] 1.10 Generate the Prisma migration with `npx prisma migrate dev --name refactor_machine_as_physical_instance --create-only` and edit the generated SQL so backfill steps run before column drops in the same transaction: (a) add new columns, (b) create `machine_status_logs` table, (c) insert placeholder `MachineSystem` rows for orphan `Machine` rows where `machineSystemId IS NULL`, (d) backfill `<table>.machineSystemId = COALESCE(machine.machineSystemId, placeholder)` for the five downstream tables, (e) drop `machineId` columns and FKs, (f) swap unique constraints, (g) drop `machines` and `machine_activity_reports` tables
- [x] 1.11 Run the migration in dev with `npx prisma migrate dev` and verify the `machines` and `machine_activity_reports` tables are gone, `machine_status_logs` exists, and all five downstream tables expose `machineSystemId` only ← (verify: schema matches design.md decisions 1-4, migrations run without errors, and all backfilled rows have non-null `machineSystemId` where the source `machineId` was non-null)

## 2. Backend services and routes

- [x] 2.1 Delete `machineService.ts`, `machineController.ts`, and `machineRoutes.ts` (or equivalents) from `backend/src/`
- [x] 2.2 Replace `machineActivityReportService.ts`, controller, and route with `machineStatusLogService.ts`, `machineStatusLogController.ts`, and `machineStatusLogRoutes.ts`; expose `GET /api/machine-status-logs` with filters `machineSystemId`, `trangThaiMoi`, date range, and pagination
- [x] 2.3 Extend `machineSystemService.ts` with `clone(sourceId, overrides)` implementing top-down BFS that copies the entire detail tree inside one `prisma.$transaction`, regenerates unique `maChiTiet` codes by suffixing the destination machine's identifier, and sets `parentSystemId` on the new row
- [x] 2.4 Add `machineSystemService.getSummary(systemId, limits)` returning recent fault records, repair items, handover items, system operations, maintenance records, and status logs scoped to that `machineSystemId`
- [x] 2.5 Add `machineSystemService.updateStatus(systemId, newStatus, reason, user, note?)` that wraps the `MachineSystem.trangThai` write and `MachineStatusLog` insert in one `prisma.$transaction`, rejects same-value transitions, and rejects empty `nguyenNhan`
- [x] 2.6 Update `machineSystemController` to expose `POST /api/machine-systems/:id/clone`, `GET /api/machine-systems/:id/summary`, and `POST /api/machine-systems/:id/status`; ensure the generic `PUT /api/machine-systems/:id` strips any `trangThai` field server-side
- [x] 2.7 Update `faultTemplateService.ts` to allow `machineSystemId` and `machineSystemDetailId` as nullable inputs, persist `tenDetailGoiY` and `loaiDetailGoiY`, and reject inactive detail links
- [x] 2.8 Update `faultRecordService.ts`, `repairRequestService.ts`, and `acceptanceHandoverService.ts` to drop the `machineId` parameter from all create/update payloads and reject any payload containing it; ensure relational links are stored under `machineSystemId` and `machineSystemDetailId`
- [x] 2.9 Update `systemOperationService.ts`, `finishedProductService.ts`, and `qualityEvaluationService.ts` to use `machineSystemId` everywhere, including the new `[maChien, machineSystemId]` unique check; rewrite the production-side `tenMay` lookup to fetch from `MachineSystem.tenHeThong`
- [x] 2.10 In `backend/src/routes/index.ts`, remove the `/api/machines` entry from `ROUTE_MAP`, rename `/api/machine-activity-reports` to `/api/machine-status-logs`, and register the new `/api/machine-systems/:id/clone`, `/summary`, and `/status` routes ← (verify: server logs list the new routes, `/api/machines` returns 404, and all updated services match the spec scenarios in `machine-as-physical-instance/spec.md`)

## 3. Frontend

- [x] 3.1 Delete `MachineManagement.tsx` and the `useMachines` hook; remove the `/quan-ly-may-moc` (or equivalent) tab from `ProductionDepartment.tsx`
- [x] 3.2 Replace `MachineActivityReport.tsx` and `useMachineActivityReports` with `MachineStatusLogList.tsx` and `useMachineStatusLogs`; rename the QLHTM tab label to "Nhật ký trạng thái máy"
- [x] 3.3 Add `useCloneMachineSystem` and `useUpdateMachineStatus` hooks plus a `MachineStatusUpdateDialog` component that posts to `/api/machine-systems/:id/status`
- [x] 3.4 Extend `useMachineSystemSummary` to return faults, repairs, operations, maintenance, and status logs; update `MachineSummaryDrawer.tsx` to render the unified summary sections from one response
- [x] 3.5 Update `MachineSystemList.tsx` to surface the `trangThai` column, the "Nhân bản" action triggering the clone flow with overrides for `maHeThong`/`tenHeThong`, and a "Cập nhật trạng thái" action
- [x] 3.6 Build a shared `MachineSystemSelect` component (with optional `loaiHeThong`, `khuVuc`, `trangThai` filters) and replace the machine selector in `RepairRequestForm`, `AcceptanceHandoverForm`, `SystemOperationForm`, `FinishedProductForm`, and `QualityEvaluationForm`
- [x] 3.7 Update the form schemas/types so submitted payloads use `machineSystemId` only and never send `machineId`; align the affected services and hooks
- [x] 3.8 Update `TechnicalQuality.tsx` tab wiring to swap the activity-report tab for the status-log tab and confirm the five tabs render consistently with `openspec/ui-dna.md` ← (verify: every refactored form selects machines via `MachineSystemSelect`, no `machineId` reference remains in the frontend, the QLHTM tabs match the spec, and the Production "Quản lý máy móc" tab is gone)

## 4. AI service registry and tests

- [x] 4.1 In `ai-service/agent/registry.py`, remove `list_machines`, `get_machine`, `create_machine`, `update_machine`, and `delete_machine`
- [x] 4.2 Extend `list_machine_systems` with optional `trangThai`, `khuVuc`, and `loaiHeThong` filters
- [x] 4.3 Rewrite `create_repair_request` to require `machineSystemId` (drop `tenHeThong` text input) and reject calls that omit it
- [x] 4.4 Add `list_machine_status_logs` (read) and `update_machine_status` (write, `is_write: True`) wired to the new backend endpoints
- [x] 4.5 Update `ai-service/tests/test_registry.py` total tool count to match the new net delta and adjust any per-tool fixtures referenced in tests ← (verify: `cd ai-service && python3 -m pytest tests/test_registry.py -x -q` passes and no removed tool name appears anywhere in `ai-service/`)

## 5. Seed data refresh

- [x] 5.1 Rewrite `backend/prisma/seed-machine-system-chien.ts` to upsert one template machine `HT-CCK-MAU` with the full vacuum-fryer detail tree
- [x] 5.2 Iterate `HT-CCK-01` through `HT-CCK-08` and call the new clone service or replicate its logic to seed eight cloned machines, each with its own detail rows and unique `maChiTiet` codes
- [x] 5.3 Re-run the seed in dev (`npx ts-node --transpile-only prisma/seed-machine-system-chien.ts`) and verify the eight cloned machines render in `/technical/quality?tab=machineSystems` with independent detail trees ← (verify: nine `MachineSystem` rows exist after seeding, every cloned machine has its own non-shared `MachineSystemDetail` rows, and no `Machine` rows remain in the database)

## 6. Verification, smoke tests, and rollout

- [x] 6.1 Run `cd backend && npx tsc --noEmit && npm run lint && npm test` and resolve every error
- [x] 6.2 Run `cd frontend && npx tsc --noEmit && npm run lint` and resolve every error
- [x] 6.3 Run `cd ai-service && python3 -m pytest tests/ -x -q` and resolve every failure
- [x] 6.4 Smoke test in the dev UI: open `/technical/quality?tab=machineSystems`, clone `HT-CCK-MAU` once, edit a detail on the cloned machine, update its status, and confirm the status entry shows up in the "Nhật ký trạng thái máy" tab
- [x] 6.5 Smoke test the production module: create one `SystemOperation`, one `FinishedProduct`, and one `QualityEvaluation` against a cloned machine and confirm the unique constraint `[maChien, machineSystemId]` rejects duplicates
- [x] 6.6 Document the rollback procedure (restore the `business` schema from the dump captured in 1.2) in the change directory and add release notes flagging the renamed QLHTM tab and the removed Production tab ← (verify: every spec scenario in `specs/**/*.md` has a matching observable behavior in the dev environment, and the migration plan in `design.md` has been executed end to end)
