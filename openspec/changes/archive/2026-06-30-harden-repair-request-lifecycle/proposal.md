## Why

`RepairRequest` currently stores `trangThai` as a free-form `String` defaulted to `"Chờ xử lý"`. Clients can write any value through `POST /api/repair-requests` and `PUT /api/repair-requests/:id`, including jumping or reversing the lifecycle. Acceptance handover creation does not affect the parent repair status, so a handover can be raised before the repair is in progress and a repair can stay open after every item has been handed over. The registered `NotificationEvent.ACCEPTANCE_HANDOVER_CREATED` event is orphaned because the controller calls a legacy direct notification method instead of the registry. There is also no audit trail for who advanced a status and when. These gaps violate the project rules in `CLAUDE.md` ("Status is forward-only", "Status transitions only on the server", "Never expose a generic PATCH /status") and make it easy for staff to mis-sequence the workflow.

## What Changes

- **BREAKING** Convert `RepairRequest.trangThai` from `String` to a typed enum `RepairRequestStatus` with values `CHO_XU_LY`, `DANG_SUA_CHUA`, `HOAN_THANH`, `DA_HUY`. Migration backfills existing rows from the Vietnamese strings.
- Remove `trangThai` writes from `POST /api/repair-requests` and `PUT /api/repair-requests/:id`. The create endpoint always seeds `CHO_XU_LY`; the update endpoint silently drops any `trangThai` field with a warning log.
- Add two business-event endpoints that own all forward-only transitions: `POST /api/repair-requests/:id/start-repair` (`CHO_XU_LY → DANG_SUA_CHUA`) and `POST /api/repair-requests/:id/cancel` (any non-terminal → `DA_HUY`). All transitions go through a new `advanceRepairRequestStatus` helper in `backend/src/utils/statusTransitions.ts`.
- Block `acceptanceHandoverService.createAcceptanceHandover` when the parent repair is not `DANG_SUA_CHUA`. After successful handover creation, in the same transaction check whether every `RepairRequestItem` of the parent has at least one `AcceptanceHandoverItem`; when coverage is complete, auto-advance the parent to `HOAN_THANH` and emit `REPAIR_REQUEST_COMPLETED`.
- Block `acceptanceHandoverService.updateAcceptanceHandover` and `deleteAcceptanceHandover` when the parent repair is `HOAN_THANH` (terminal state must stay sealed).
- Wire the existing `NotificationEvent.ACCEPTANCE_HANDOVER_CREATED` through `notificationService.notify(...)` from inside the service. Remove the legacy `notificationService.createAcceptanceHandoverNotification` call in the controller. Add a new `REPAIR_REQUEST_COMPLETED` event for auto-completion.
- Add `RepairRequestStatusLog` (id, repairRequestId FK cascade, oldStatus, newStatus, actorId?, reason?, createdAt) in the `business` schema, written for every status transition. Expose `GET /api/repair-requests/:id/status-history`.
- Accept `trangThai` filter in `getAllRepairRequests` and `exportToExcel` (the frontend already sends it; the backend silently dropped it).
- **BREAKING** Frontend `RepairRequestList.tsx` removes the free-form status select; status is shown as a coloured badge and changed only through two action buttons ("Bắt đầu sửa chữa", "Hủy yêu cầu") whose visibility depends on current status. The "Nghiệm thu" button is shown only when the repair is `DANG_SUA_CHUA`. `AcceptanceHandoverForm.tsx` shows a coverage progress indicator ("X/Y hạng mục đã nghiệm thu") and refuses to open for repairs not in `DANG_SUA_CHUA`.
- Type the frontend service/hooks against the new enum.

## Capabilities

### New Capabilities

- `repair-request-lifecycle`: Forward-only status machine for `RepairRequest`, server-side enforcement, business-event endpoints (`start-repair`, `cancel`), coverage-driven auto-completion when every repair item has been accepted, and audit trail via `RepairRequestStatusLog`.

### Modified Capabilities

- `status-transitions`: Add `advanceRepairRequestStatus` helper plus `REPAIR_REQUEST_STATUS_ORDER`, `REPAIR_REQUEST_TERMINAL_STATUSES`, `REPAIR_REQUEST_CANCEL_TARGETS` constants alongside the existing quotation/order helpers.

## Impact

**Backend**
- `backend/prisma/schema/common.prisma`: add `RepairRequestStatus` enum + `RepairRequestStatusLog` model; change `RepairRequest.trangThai` to the enum.
- `backend/prisma/migrations/*`: new migration that maps existing strings to enum values and creates the status-log table.
- `backend/src/utils/statusTransitions.ts`: add repair-request helper + constants.
- `backend/src/services/repairRequestService.ts`: seed `CHO_XU_LY` on create, drop `trangThai` from update body, implement `startRepair`, `cancel`, `getStatusHistory`, status-aware filters, status-log writes.
- `backend/src/services/acceptanceHandoverService.ts`: parent-status guard on create/update/delete, full-coverage check + auto-complete, notify via registry.
- `backend/src/services/notificationRegistry.ts` + `backend/src/types/index.ts`: add `REPAIR_REQUEST_COMPLETED` event and its recipient resolver.
- `backend/src/controllers/repairRequestController.ts`: add `startRepair`, `cancel`, `getStatusHistory`; remove client-side `trangThai` writes.
- `backend/src/controllers/acceptanceHandoverController.ts`: remove legacy `notificationService.createAcceptanceHandoverNotification` call.
- `backend/src/routes/repairRequestRoutes.ts`: register the new business-event routes with role-based authorization.

**Frontend**
- `frontend/src/services/repairRequestService.ts`: enum type + new endpoints (start-repair, cancel, status-history).
- `frontend/src/hooks/useRepairRequests.ts`: mutations for `startRepair`, `cancel`; query for status history.
- `frontend/src/components/RepairRequestList.tsx`: status badge + action buttons, conditional "Nghiệm thu" visibility.
- `frontend/src/components/AcceptanceHandoverForm.tsx`: refuse non-`DANG_SUA_CHUA` parents, coverage progress.

**Out of scope**
- Other modules (`maintenance`, `project`, AI service). Existing `mã yêu cầu` / `mã nghiệm thu` format. Bulk operations.
