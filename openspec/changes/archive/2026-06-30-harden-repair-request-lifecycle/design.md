## Context

`RepairRequest` ("Yêu cầu sửa chữa") is the entry point of the technical department repair flow. Each request lists one or more `RepairRequestItem` rows pointing at a machine system / detail, and downstream the technician produces one or more `AcceptanceHandover` ("Nghiệm thu bàn giao") records, each grouping `AcceptanceHandoverItem` rows that reference the original repair items.

Today the lifecycle field `RepairRequest.trangThai` is a free-form `String` defaulted to `"Chờ xử lý"`. The frontend lets a user pick any of `['Chờ xử lý', 'Đang sửa chữa', 'Hoàn thành']` in a `<select>` and send it through `PUT /api/repair-requests/:id`, which writes the value verbatim. Acceptance handover is fully decoupled: `acceptanceHandoverService.createAcceptanceHandover` never touches the parent. The notification registry already declares `ACCEPTANCE_HANDOVER_CREATED`, `REPAIR_REQUEST_CREATED`, `REPAIR_REQUEST_UPDATED`, but the handover controller still calls the legacy `notificationService.createAcceptanceHandoverNotification(...)`, so the registry event is orphaned. There is no audit trail for status changes.

Constraints inherited from `CLAUDE.md` / `AGENTS.md`:
- Status is forward-only and changed only on the server via business-event endpoints, never through a generic update.
- Parent + children must be written in `prisma.$transaction`. Update items via delete-then-recreate.
- Notifications must never bubble errors.
- ADMIN bypasses ABAC.
- API responses use `{ success, data, message?, pagination? }`.

We already have working precedents in this repo: `backend/src/utils/statusTransitions.ts` (forward-only helpers for `QuotationRequest`, `Quotation`, `OrderProduction`) and `backend/src/utils/auditLog.ts` (best-effort audit writer plus `common.AuditLog` table).

## Goals / Non-Goals

**Goals**
- Make every legitimate transition of `RepairRequest.trangThai` go through one server-side helper that enforces forward-only progression.
- Tie acceptance handover to the parent state: handover cannot be raised before the repair starts, and the repair is automatically sealed when every item has been accepted.
- Keep a permanent record of who changed status and when.
- Wire the orphaned `ACCEPTANCE_HANDOVER_CREATED` event through the existing notification registry and notify the original requester when the repair reaches `HOAN_THANH`.
- Surface the status as a coloured badge in the UI and gate handover/edit affordances on the current state so users can no longer mis-sequence the flow.
- Stop the silent frontend filter (`trangThai` query) from being dropped server-side.

**Non-Goals**
- Reworking `maintenance-plan`, `maintenance-record`, `project`, or any other module sharing a similar pattern.
- Changing the `mã yêu cầu` / `mã nghiệm thu` generation format or numbering.
- Adding bulk operations (bulk start, bulk cancel, bulk handover).
- Soft-delete of `RepairRequest` or new RBAC roles.
- Touching the AI service.

## Decisions

### 1. Use a Prisma `enum`, not a free-form string with runtime validation

`RepairRequest.trangThai` becomes `RepairRequestStatus` with values `CHO_XU_LY`, `DANG_SUA_CHUA`, `HOAN_THANH`, `DA_HUY`. The enum is defined in the `common` schema alongside `RepairRequest`.

Why: this is how `QuotationRequest`, `Quotation`, and `OrderProduction` already encode lifecycle in `backend/prisma/schema/business.prisma`. It pushes invalid values to a compile/migrate-time error rather than a runtime string compare. The Vietnamese display strings are derived in code (`statusLabel(...)` map) so we keep DB values stable.

Alternatives considered: keep `String` and validate in service. Rejected — the existing project rule is forward-only via a typed helper, and a string column hides what the legal values are.

### 2. Migration maps existing strings to enum values, with `CHO_XU_LY` fallback

The migration runs a `CASE` over `RepairRequest.trangThai`:
- `'Chờ xử lý'` → `CHO_XU_LY`
- `'Đang sửa chữa'` → `DANG_SUA_CHUA`
- `'Hoàn thành'` → `HOAN_THANH`
- anything else (including NULL, legacy typos) → `CHO_XU_LY`, with a row emitted into `repair_request_status_logs` flagging `reason = 'legacy_migration_fallback'` so we can review them.

Why: we don't know whether all production rows are clean, and dropping rows is unacceptable. Falling back to `CHO_XU_LY` is reversible because the status machine still allows forward movement from there.

Alternatives considered: hard-fail the migration on unknown values. Rejected — too risky for prod data integrity. Insert a `MIGRATION_PENDING` enum value. Rejected — keeps invalid state alive and pollutes business logic forever.

### 3. Status transitions through `advanceRepairRequestStatus(current, next, { bypass? })`

Add to `backend/src/utils/statusTransitions.ts`:

```ts
export const REPAIR_REQUEST_STATUS_ORDER = [
  'CHO_XU_LY',
  'DANG_SUA_CHUA',
  'HOAN_THANH',
] as const;
export const REPAIR_REQUEST_TERMINAL_STATUSES = new Set(['HOAN_THANH', 'DA_HUY']);
export const REPAIR_REQUEST_CANCEL_TARGETS = new Set(['DA_HUY']);
export function advanceRepairRequestStatus(current, next, opts?): RepairRequestStatus;
```

The helper accepts: no-op (`current === next`), single-step forward along the order, or cancel to `DA_HUY` from any non-terminal. Bypass returns `next` unchanged (used by ADMIN actions). All other transitions throw `ValidationError('Không thể chuyển trạng thái yêu cầu sửa chữa từ X sang Y')`.

Why: this mirrors `advanceQuotationRequestStatus` and `advanceOrderProductionStatus` byte-for-byte so any tooling/test pattern already in the repo applies. Centralising the rule prevents drift across the create/start-repair/cancel/auto-complete paths.

### 4. Business-event endpoints own all forward movement

We do NOT expose `PATCH /repair-requests/:id/status`. Instead:
- `POST /api/repair-requests/:id/start-repair` — transitions `CHO_XU_LY → DANG_SUA_CHUA`. Roles: `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`.
- `POST /api/repair-requests/:id/cancel` — accepts JSON body `{ reason?: string }`, transitions any non-terminal status → `DA_HUY`. Roles: `ADMIN`, `DEPARTMENT_HEAD`.
- `HOAN_THANH` is reached only as a side effect of `createAcceptanceHandover` when full coverage is achieved (no endpoint).

`POST /api/repair-requests` always seeds `trangThai = CHO_XU_LY`. `PUT /api/repair-requests/:id` silently drops any `trangThai` field with a `logger.warn` line.

Why: this is the explicit CLAUDE.md rule. Each endpoint can attach its own role check, audit reason, and notification.

### 5. Coverage rule, not "auto-complete on first handover"

After the new `AcceptanceHandoverItem` rows are inserted (still inside the original `prisma.$transaction`), `acceptanceHandoverService.createAcceptanceHandover` counts:
- `total`: every `RepairRequestItem` of the parent.
- `covered`: distinct `repairRequestItemId` values that appear in any `AcceptanceHandoverItem` of the parent (including the one we just inserted).

If `covered === total` and the parent is currently `DANG_SUA_CHUA`, the service calls `advanceRepairRequestStatus('DANG_SUA_CHUA', 'HOAN_THANH')`, updates the parent, writes a `RepairRequestStatusLog` row, and emits `REPAIR_REQUEST_COMPLETED` after commit. If `covered < total`, the parent stays at `DANG_SUA_CHUA`.

Why: a single repair often gets nghiệm thu in chunks. Closing the repair when only one out of three items has been handed over would let the technician forget the remaining items. Coverage gives a deterministic, auditable rule that matches what the user described as "đánh giá hoàn thành" — every item has actually been accepted.

Alternatives considered: a manual "Đánh giá hoàn thành" button after the last handover. Rejected — yet another step the staff can forget; the system can compute it. Auto-complete on first handover. Rejected — exactly the bug the user reported.

### 6. Block handover when parent is not `DANG_SUA_CHUA`; block edits/deletes when parent is `HOAN_THANH`

`acceptanceHandoverService.createAcceptanceHandover` first loads the parent inside the transaction with `select: { id: true, maYeuCau: true, trangThai: true }`. If `trangThai !== 'DANG_SUA_CHUA'` we throw `ValidationError('Yêu cầu sửa chữa phải ở trạng thái "Đang sửa chữa" trước khi nghiệm thu')`.

`updateAcceptanceHandover` and `deleteAcceptanceHandover` load the parent the same way; if `trangThai === 'HOAN_THANH'` they throw `ValidationError('Không thể chỉnh sửa nghiệm thu của yêu cầu đã hoàn thành')` / `'Không thể xóa nghiệm thu của yêu cầu đã hoàn thành'`. ADMIN bypass: when `actorRole === 'ADMIN'` we pass `{ bypass: true }` through and allow the operation, but we always write the `RepairRequestStatusLog` with `actorRole = 'ADMIN'` and `reason = 'admin_override'` so the override is auditable.

Why: a sealed repair is a permanent record. Once `HOAN_THANH` is reached, mutating the handover would silently corrupt the coverage check and the audit trail.

### 7. `RepairRequestStatusLog` table, not reuse of `common.AuditLog`

Add a dedicated `business.RepairRequestStatusLog` model:

```prisma
model RepairRequestStatusLog {
  id              String              @id @default(cuid())
  repairRequestId Int
  repairRequest   RepairRequest       @relation(fields: [repairRequestId], references: [id], onDelete: Cascade)
  oldStatus       RepairRequestStatus
  newStatus       RepairRequestStatus
  actorId         String?
  actorRole       String?
  reason          String?
  createdAt       DateTime            @default(now())

  @@index([repairRequestId])
  @@index([createdAt])
  @@map("repair_request_status_logs")
  @@schema("business")
}
```

Why dedicated, not `common.AuditLog`: `AuditLog` is currently restricted to pricing entities (`QuotationRequest | Quotation | Order | ExportCost` — see `backend/src/utils/auditLog.ts:5`). Extending that union would force a cross-cutting change to its RBAC and read endpoint. A dedicated table keeps the schema close to where it is used, lets us expose `GET /api/repair-requests/:id/status-history` with the same RBAC as the parent resource, and uses typed enum columns instead of `String`. We also keep a single `recordAudit(...)` for pricing concerns; this status log is its repair-specific equivalent.

The write goes inside the same `prisma.$transaction` as the status update so the log can never drift from reality. This differs from `recordAudit` (which writes after commit and tolerates failures); for repair status the log is authoritative for the audit endpoint, so we accept the trade-off of failing the whole transaction if the log write fails.

### 8. Notification wiring

- `ACCEPTANCE_HANDOVER_CREATED`: move the call out of `acceptanceHandoverController.ts` into `acceptanceHandoverService.createAcceptanceHandover` (after commit). Use `notificationService.notify(NotificationEvent.ACCEPTANCE_HANDOVER_CREATED, { entityId, metadata: { maNghiemThu, maYeuCauSuaChua, tenHeThongThietBi, nguoiBanGiao, nguoiNhanId }, targetEmployeeIds: nguoiNhanId ? [nguoiNhanId] : [] })` so the existing `resolveDirectRecipients` resolver picks the receiver. Drop the legacy `createAcceptanceHandoverNotification` method.
- `REPAIR_REQUEST_COMPLETED`: new entry in `notificationRegistry.ts`, recipients = `createdById` of the repair plus the same quality/admin pool used by `REPAIR_REQUEST_CREATED` (re-use that resolver). Title: `"Yêu cầu sửa chữa đã hoàn thành"`, body includes `maYeuCau`. Emitted after the auto-complete transaction commits, wrapped in `try/catch`.
- Add `NotificationEvent.REPAIR_REQUEST_COMPLETED = 'REPAIR_REQUEST_COMPLETED'` to `backend/src/types/notification.types.ts`.

### 9. Frontend changes are scoped to two components plus the service/hook layer

- `frontend/src/services/repairRequestService.ts`: export `type RepairRequestStatus = 'CHO_XU_LY' | 'DANG_SUA_CHUA' | 'HOAN_THANH' | 'DA_HUY'` and a `STATUS_LABELS` map. Add `startRepair(id)`, `cancel(id, reason?)`, `getStatusHistory(id)`. Strip `trangThai` from the update payload.
- `frontend/src/hooks/useRepairRequests.ts`: new mutations `useStartRepair`, `useCancelRepair`; new query `useRepairStatusHistory`. After success, invalidate `repairRequestKeys.lists()` and `repairRequestKeys.detail(id)`.
- `frontend/src/components/RepairRequestList.tsx`: replace the status `<select>` with a coloured badge driven by `STATUS_LABELS`. The action menu shows: View, Edit (always), Bắt đầu sửa chữa (only when `CHO_XU_LY`), Nghiệm thu (only when `DANG_SUA_CHUA`), Hủy (when not terminal), Delete (ADMIN/DEPT_HEAD only and only when `CHO_XU_LY` or `DA_HUY`). The edit form drops the status field entirely.
- `frontend/src/components/AcceptanceHandoverForm.tsx`: only allow choosing a parent with `trangThai === 'DANG_SUA_CHUA'`. Show "X/Y hạng mục đã nghiệm thu" derived from the parent's existing `acceptanceHandovers[*].items[*].repairRequestItemId`. When the user submits the last covering item, show a toast hint "Yêu cầu sửa chữa sẽ được đánh dấu hoàn thành sau khi lưu".

### 10. Backend filter takes `trangThai` (singular, enum value)

`getAllRepairRequests(page, limit, filters?: { search?, trangThai? })` accepts a single enum value (the frontend sends one at a time today). The `where` clause adds `trangThai: filters.trangThai` when set. `exportToExcel` accepts the same filter shape. The frontend continues to pass it; the only change is that the backend now actually applies it.

## Risks / Trade-offs

- [Existing `trangThai` strings in production may not match the canonical four labels] → Migration maps the three known labels; anything else falls back to `CHO_XU_LY` and is logged in `repair_request_status_logs` with `reason = 'legacy_migration_fallback'`. After deploy, run a query against that log to spot rows that need manual reclassification.
- [Frontend that still sends `trangThai` on `PUT /:id` would silently lose the value] → Backend logs a `warn` line for every drop; we also wrap a Jest test asserting the field is ignored. Combined with the FE rewrite the dropped field becomes dead-on-arrival within one release.
- [Coverage check inside the same transaction adds an extra round-trip per handover create] → The new query is `SELECT DISTINCT repair_request_item_id FROM acceptance_handover_items WHERE acceptance_handover_id IN (SELECT id FROM acceptance_handovers WHERE repair_request_id = ?)`; it runs against an indexed FK column, well under a millisecond on the sizes we see in this system.
- [If the status log write fails the whole handover transaction rolls back] → Acceptable, the log is authoritative for the audit endpoint and the user simply retries. The pricing `recordAudit` helper remains the choice when we want best-effort logging.
- [ADMIN bypass on terminal-state handover edits could hide tampering] → We always write the status log on the bypass path with `actorRole = 'ADMIN'` and `reason = 'admin_override'`. The audit endpoint surfaces it the same as any other entry.
- [Existing `RepairRequest` rows already at `HOAN_THANH` cannot have new handovers added even by non-admins] → That is the new contract. Migration tooling for legacy reconciliation lives outside this change.

## Migration Plan

1. Merge schema and migration on a feature branch; run `npx prisma migrate dev` locally to confirm clean apply on a copy of prod.
2. Verify the migration's `CASE WHEN` covers every distinct `trangThai` value currently in the prod DB (`SELECT DISTINCT trangThai FROM repair_requests`). Add any extra mappings before merge.
3. Deploy backend and frontend together. Status field is dropped from `PUT /:id`; if old clients are still calling with `trangThai`, the warn logs surface it but nothing breaks because the field is silently dropped.
4. After deploy, check `repair_request_status_logs WHERE reason = 'legacy_migration_fallback'` and reconcile any flagged rows manually if needed.
5. Rollback: revert the migration with the down step (cast the enum back to text, restoring the Vietnamese labels via the same map). The `repair_request_status_logs` table is preserved as a historical record even on rollback.
