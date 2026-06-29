## Why

Phase 1 (archived 2026-06-28) hardened CRITICAL defects in the Pricing Department module — server-side pagination, RBAC, response envelope, forward-only status helpers, role gating, toasts. The remaining workflow gaps now block traceability and operational efficiency: quotation requests have no status field so screen filtering is impossible, quotation edits silently overwrite prior data with no version history or revert path, prices remain editable indefinitely after the quote has been sent to the customer (creating audit risk for export pricing), there is no audit trail for who changed what, and stakeholders are not notified of pricing workflow events (new RFQ arrived, quote won/lost, order shipped). Quotes also linger forever without an aging signal, so DEPARTMENT_HEADs cannot prioritize follow-up.

## What Changes

- Add `QuotationRequestStatus` enum and `status` column to `QuotationRequest`. Surface status badges and a filter dropdown on the YCBG list. Extend `statusTransitions.ts` with `QUOTATION_REQUEST_STATUS_ORDER` and `advanceQuotationRequestStatus`.
- Add `QuotationRevision` parent-child table that snapshots a quotation before every update. Expose `GET /api/quotations/:id/revisions` and `GET /api/quotations/:id/revisions/:revisionId`. Surface a "Lịch sử phiên bản" tab in the quotation detail popup.
- Add `priceLocked`, `priceLockedAt`, `priceLockedBy` to `Quotation`. Auto-lock when status advances to `DANG_CHO_PHAN_HOI`. Reject price-field edits on locked quotations with `ValidationError`. ADMIN may pass `forceUnlock: true` to bypass (auditable).
- **NEW** `AuditLog` model (`common` schema) storing `before`/`after` JSON snapshots. New helper `@utils/auditLog` records CREATE / UPDATE / DELETE / STATUS_CHANGE / PRICE_UNLOCK across quotation requests, quotations, orders, and export costs. Expose `GET /api/audit-logs` (paginated, ADMIN + DEPARTMENT_HEAD).
- **NEW** Pricing notification triggers: new YCBG → notify department heads/team leads; quotation won/lost → notify creator (and DEPARTMENT_HEAD on loss); order delivered → notify creator; ADMIN price unlock → notify creator + DEPARTMENT_HEAD. All triggers are best-effort (try/catch) so notification failure never bubbles.
- Add quote aging: backend returns `daysOpen` for non-terminal quotations and exposes `GET /api/quotations/aging-warnings?threshold=N`. Frontend renders yellow/red badges by age.
- Add three Prisma migrations (`add_quotation_request_status`, `add_quotation_revision`, `add_quotation_price_lock`, `add_audit_log`) — using `npx prisma migrate dev`, never `db push`.
- **BREAKING**: `Quotation` payload now contains `priceLocked`, `priceLockedAt`, `priceLockedBy`, and a computed `daysOpen` field (non-terminal only). `QuotationRequest` payload contains `status`. Clients reading these payloads must accept the new fields. JSON-only exceptions are `QuotationRevision.snapshot` and `AuditLog.before`/`after` — both immutable audit data, never mutable child rows.

## Capabilities

### New Capabilities

- `audit-log`: Cross-entity audit trail capturing actor, action, before/after snapshots, exposed through a paginated read API gated by ADMIN/DEPARTMENT_HEAD.
- `pricing-notifications`: Workflow notification triggers fired from pricing services into the existing notification system; best-effort so primary writes never fail.

### Modified Capabilities

- `pricing-quotation-request`: Adds the status field, status transition rules, status-aware list filtering, and YCBG audit recording.
- `pricing-quotation`: Adds revision history, price lock semantics, aging metadata, and quotation audit/notification triggers.
- `pricing-order`: Adds order audit recording and delivery notification trigger.
- `pricing-export-cost`: Adds export-cost audit recording (no schema change, no new endpoints beyond audit-log read).
- `status-transitions`: Adds `QUOTATION_REQUEST_STATUS_ORDER` and `advanceQuotationRequestStatus` helper to the shared transition module.

## Impact

- **Schema**: 4 migrations adding 1 enum (`QuotationRequestStatus`), 2 fields on `QuotationRequest`, 4 fields on `Quotation`, 1 new model (`QuotationRevision` in `business`), 1 new model (`AuditLog` in `common`).
- **Backend**: New helper `@utils/auditLog`; updates to `quotationRequestService`, `quotationService`, `orderService`, `exportCostService`, their controllers, and `statusTransitions.ts`. New routes for revisions, audit logs, and aging warnings. Notification triggers added to pricing services.
- **Frontend**: New status column + filter on YCBG list. New "Lịch sử phiên bản" and "Lịch sử hoạt động" tabs in detail popups. Price-lock badge + disabled inputs + ADMIN unlock action. Aging badge on quotation list. New hooks: `useQuotationRevisions`, `useAuditLogs`, `useQuotationAgingWarnings`. New service modules: `quotationRevisionService`, `auditLogService`.
- **APIs added**: `GET /api/quotations/:id/revisions`, `GET /api/quotations/:id/revisions/:revisionId`, `GET /api/audit-logs`, `GET /api/quotations/aging-warnings`.
- **APIs changed**: `GET /api/quotations` response gains `daysOpen` on non-terminal rows. `GET /api/quotation-requests` response gains `status`. `PATCH /api/quotations/:id` may now reject price edits with `ValidationError` when `priceLocked=true` (unless ADMIN passes `forceUnlock: true`).
- **Out of scope (deferred to later phases)**: JSON column teardown for `flowchartData` / `generalCostGroupsData` (Phase 3); `ExportCostCategory` enum and incoterm/HS Code/COO fields (Phase 3); cost sheet view and margin analysis (Phase 3); `/pricing/stats` endpoint and KPI dashboard (Phase 4); win/loss reason, bulk actions, file attachment (Phase 4); component splitting (Phase 4); pretty diff viewer for QuotationRevision (Phase 4 — Phase 2 ships JSON `<pre>`); multi-level approval workflow (not on roadmap); cron scheduler for aging push-notifications (Phase 4 if scheduler infra not yet present).
