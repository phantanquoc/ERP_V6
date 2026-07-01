## Why

Two operationally adjacent modules — **Sửa chữa & Nghiệm thu QLHTM** (RepairRequest workflow, hardened forward-only state machine with audit log) and **Danh sách lỗi Cơ điện** (FaultRecord catalog, rich dashboard with stat cards, recurrence detection, monthly trend, heatmap) — currently evolve in isolation. This has produced three concrete problems:

1. **No data bridge**: A FaultRecord can generate a repair job, but nothing links the resulting RepairRequestItem back to the fault. When the repair completes, the FaultRecord stays "Đang theo dõi" forever until a user manually flips it. Analytics on both sides diverge from reality.
2. **UX/analytics asymmetry**: RepairRequest list has zero dashboard while FaultRecord list has a rich analytics surface. Managers get insight into faults but flying blind on the actual repair workload.
3. **Lifecycle inconsistency**: FaultRecord.trangThai is a free-form `String` — no enum, no forward-only guard, no audit log — even though it drives operational decisions. RepairRequest already went through the same hardening; FaultRecord is the last free-form status in this workflow.

On top of these three, the two components duplicate visual primitives (status badge, severity/priority pill, collapsible section, stat card) with slightly different implementations, making cross-module consistency brittle.

Doing all four at once (rather than sequentially) lets a single migration cycle cover both schema additions (`RepairRequestItem.faultRecordId`, `FaultRecordStatus` enum, `FaultRecordStatusLog`) and produces one round of frontend refactor instead of four.

## What Changes

**A. Link RepairRequestItem ↔ FaultRecord**
- Add optional FK `RepairRequestItem.faultRecordId` (`String?`, `onDelete: SetNull`) — additive, does not touch existing rows.
- New `GET /fault-records/typeahead?trangThai=DANG_THEO_DOI,TAI_PHAT&search=` endpoint for form pickers.
- On RepairRequest auto-transition to `HOAN_THANH`, service scans linked FaultRecords and calls `faultRecordService.markResolvedFromRepair(id, repairRequestId, actorId)` inside the same transaction (source = `auto_from_repair`). Wrapped in try/catch — notification/audit failures never bubble.
- **BREAKING (data model)**: New optional column requires migration. No behavior change for records without link.

**B. Port dashboard to RepairRequestList**
- New `GET /repair-requests/stats?dateFrom=&dateTo=&machineSystemId=` returning: total, byStatus, avg completion time, delta vs. previous period, topMachines, recurringRequests (same `machineSystemDetailId` appearing >2× within 90 days), monthlyTrend (6-12 months), recentlyCreated (10 latest unresolved).
- Frontend adds 4 stat cards + 4 collapsible sections mirroring FaultRecordList shape, wired via new `useRepairRequestStats` hook.

**C. Enum FaultRecord.trangThai + audit trail**
- New Prisma enum `FaultRecordStatus`: `DANG_THEO_DOI`, `DA_XU_LY`, `TAI_PHAT`. Forward-only helper `advanceFaultRecordStatus` follows the existing `advanceStatus` pattern.
- **BREAKING (API surface)**: `PUT /fault-records/:id` silently drops `trangThai` field from body (log warning for one release). Status transitions move to:
  - `POST /fault-records/:id/mark-resolved` — ADMIN / DEPT_HEAD / TEAM_LEAD
  - `POST /fault-records/:id/mark-recurred` — ADMIN / DEPT_HEAD (or auto-triggered by system)
  - `GET /fault-records/:id/status-history`
- New table `FaultRecordStatusLog` (id CUID, faultRecordId FK cascade, oldStatus, newStatus, actorId?, reason?, source? — `manual` / `auto_from_repair` / `recurrence_detected`, createdAt).
- Auto-recurrence detector: when a new FaultRecord shares `machineSystemDetailId` + `loaiLoi` with a `DA_XU_LY` record ≤ 90 days old, log a `recurrence_detected` event on the new record and surface a banner. Existing `DA_XU_LY` record is NOT auto-flipped to `TAI_PHAT` (manual decision).
- Migration maps existing `String` values: `"Đang theo dõi"` → `DANG_THEO_DOI`, `"Đã xử lý"` → `DA_XU_LY`, `"Tái phát"` → `TAI_PHAT`; anything else → `DANG_THEO_DOI` with warning log. `"Đang áp dụng"` / `"Tạm dừng"` belong to `RepairSolution` and are NOT touched.

**D. Extract shared UI primitives**
- New `frontend/src/components/shared/` folder with:
  - `StatusBadge` (label + tone + size, tone-driven color)
  - `SeverityBadge` (`Nghiêm trọng` / `Trung bình` / `Nhẹ`)
  - `PriorityBadge` (`Cao` / `Trung bình` / `Thấp`)
  - `CollapsibleSection` (title + icon + defaultOpen + children, chevron animation)
  - `StatCard` (label, value, delta?, deltaLabel?, subCounts?, icon)
- Both `FaultRecordList` and `RepairRequestList` (plus MaintenanceTab where applicable) refactored to consume the primitives. No visual regression — style-parity with existing FaultRecordList look.

## Capabilities

### New Capabilities
- `fault-record-lifecycle`: Status enum, forward-only transitions, audit log, mark-resolved / mark-recurred endpoints, auto-recurrence detection, auto-close from linked RepairRequest completion.
- `repair-request-analytics`: Backend stats aggregation + frontend dashboard (stat cards, top machines, recurring items, monthly trend, recently created) for the RepairRequest workflow.
- `shared-ui-primitives`: Reusable frontend components (`StatusBadge`, `SeverityBadge`, `PriorityBadge`, `CollapsibleSection`, `StatCard`) consumed across technical modules.

### Modified Capabilities
- `repair-request-lifecycle`: Adds `RepairRequestItem.faultRecordId` optional FK; on `HOAN_THANH` auto-transition, cascades `markResolvedFromRepair` to linked FaultRecords inside the same transaction.
- `fault-records`: Migrates `trangThai` from free-form `String` to `FaultRecordStatus` enum; removes direct `trangThai` writes from `PUT /fault-records/:id`; adds typeahead endpoint.
- `status-transitions`: Adds `advanceFaultRecordStatus` helper following existing pattern.

## Impact

**Backend**
- `backend/prisma/schema/common.prisma`: `RepairRequestItem.faultRecordId`, `FaultRecordStatus` enum, `FaultRecordStatusLog` model, relation updates.
- `backend/prisma/migrations/`: two additive migrations (link column, then enum + audit table with data map).
- `backend/src/services/repairRequestService.ts`: `getStats(filters)`, hook `cascadeFaultRecordResolution` in the transaction that flips to `HOAN_THANH`.
- `backend/src/services/faultRecordService.ts`: `getForTypeahead`, `markResolved`, `markRecurred`, `markResolvedFromRepair`, `getStatusHistory`, drop `trangThai` from update payload, recurrence detector.
- `backend/src/utils/statusTransitions.ts`: `advanceFaultRecordStatus` + order array.
- `backend/src/controllers/repairRequestController.ts`, `faultRecordController.ts`: new endpoint handlers.
- `backend/src/routes/repairRequestRoutes.ts`, `faultRecordRoutes.ts`: register new routes.
- `backend/src/types/`: export `FaultRecordStatus` type.
- `backend/src/services/notificationRegistry.ts`: optionally register `FAULT_RECORD_STATUS_CHANGED` (only if a real notification target exists — otherwise defer).

**Frontend**
- `frontend/src/components/shared/`: 5 new primitives + barrel `index.ts`.
- `frontend/src/services/repairRequestService.ts`: `getStats`, `getFaultRecordsForTypeahead`.
- `frontend/src/services/faultRecordService.ts`: `markResolved`, `markRecurred`, `getStatusHistory`, `getForTypeahead`.
- `frontend/src/hooks/useRepairRequests.ts`: `useRepairRequestStats`.
- `frontend/src/hooks/useFaultRecords.ts`: `useMarkResolved`, `useMarkRecurred`, `useFaultRecordStatusHistory`, `useFaultRecordsForTypeahead`.
- `frontend/src/components/RepairRequestList.tsx`: dashboard section, primitives adoption.
- `frontend/src/components/FaultRecordList.tsx`: primitives adoption, `trangThai` selector → readonly badge + action buttons, typed enum.
- `frontend/src/components/RepairRequestForm.tsx` / `AcceptanceHandoverForm.tsx`: FaultRecord typeahead per item.

**Out of scope**
- `RepairSolution.trangThai` (distinct entity with its own UI).
- MachineSystem, Order, Maintenance modules.
- Bulk actions, code-format changes for `maYeuCau` / `maNghiemThu`.
- AI service.

**Verification gates**
- `cd backend && npx tsc --noEmit` must pass.
- `cd backend && npm run lint`, `cd backend && npm test` (new tests for `advanceFaultRecordStatus`, stats aggregation, `markResolvedFromRepair` cascade).
- `cd frontend && npx tsc --noEmit` must pass.
- `cd frontend && npm run lint`.
- Migration idempotency: forward migration must be safe to re-run (guarded); down migration restores `String` field best-effort.
- Manual smoke: create RepairRequest with item linked to a `DANG_THEO_DOI` FaultRecord → complete via handover coverage → verify FaultRecord flips to `DA_XU_LY` and log entry exists with `source: auto_from_repair`.
