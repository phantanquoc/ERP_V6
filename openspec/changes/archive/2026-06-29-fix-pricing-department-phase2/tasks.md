## 1. Status helper extension (status-transitions)

- [x] 1.1 Add `QuotationRequestStatus` enum mirror at top of `backend/src/utils/statusTransitions.ts` (string-literal union) plus `QUOTATION_REQUEST_STATUS_ORDER`, `QUOTATION_REQUEST_TERMINAL_STATUSES`, `QUOTATION_REQUEST_CANCEL_TARGETS`
- [x] 1.2 Implement `advanceQuotationRequestStatus(current, next, opts?)` enforcing single-step forward, no-op, cancel-to-HUY, ADMIN bypass; throw `ValidationError('Không thể chuyển trạng thái YCBG từ X sang Y')` for anything else
- [x] 1.3 Add Jest coverage in `backend/src/__tests__/statusTransitions.test.ts` for the 7 helper scenarios (forward, no-op, cancel, jump-rejected, backward-rejected, terminal-rejected, bypass) ← (verify: helper matches status-transitions spec scenarios)

## 2. Migration `add_quotation_request_status`

- [x] 2.1 Edit `backend/prisma/schema.prisma`: declare `enum QuotationRequestStatus { CHO_XU_LY DANG_BAO_GIA DA_BAO_GIA HUY }` under `business` schema and add `status QuotationRequestStatus @default(CHO_XU_LY)` to `QuotationRequest`
- [x] 2.2 Run `cd backend && npx prisma migrate dev --name add_quotation_request_status` (NEVER `db push`); commit the generated migration directory
- [x] 2.3 Update `backend/src/services/quotationRequestService.ts` create/update/cancel paths to call `advanceQuotationRequestStatus`; service create defaults to `CHO_XU_LY`; expose `status` in the typed list/detail result
- [x] 2.4 Update `backend/src/controllers/quotationRequestController.ts` to accept `status` filter on list and a `cancel` action that sends `HUY`; preserve standard envelope and pagination
- [x] 2.5 Update `backend/src/services/quotationService.ts` so that successfully creating a `Quotation` with `quotationRequestId` set advances the linked request to `DA_BAO_GIA` via the helper
- [x] 2.6 Add validation guard in controller for `status` query param against the union; respond `ValidationError` for unknown values ← (verify: YCBG status field + filter + auto-advance flows match `pricing-quotation-request` spec)

## 3. Migration `add_quotation_revision`

- [x] 3.1 Edit `backend/prisma/schema.prisma`: add `QuotationRevision` model under `business` schema with fields and indexes per design D2; add reverse relation on `Quotation`
- [x] 3.2 Run `cd backend && npx prisma migrate dev --name add_quotation_revision`
- [x] 3.3 Modify `quotationService.update` to wrap in `prisma.$transaction`: fetch current quotation + items, compute next `revisionNumber`, insert `QuotationRevision` row with full snapshot JSON, then apply update + items delete/recreate
- [x] 3.4 Add `quotationRevisionService.ts` exposing `listByQuotation(quotationId, page, limit)` and `getById(quotationId, revisionId)`; throw `NotFoundError('Không tìm thấy phiên bản báo giá')` when absent
- [x] 3.5 Add `quotationRevisionController.ts` and routes `GET /api/quotations/:id/revisions`, `GET /api/quotations/:id/revisions/:revisionId` gated by `authorize('ADMIN','DEPARTMENT_HEAD','TEAM_LEAD')`; register in `backend/src/routes/index.ts` ROUTE_MAP
- [x] 3.6 Ensure transaction rollback covers revision insert failure (no orphan quotation update) ← (verify: revision endpoints + transaction rollback match `pricing-quotation` revision scenarios)

## 4. Migration `add_quotation_price_lock`

- [x] 4.1 Edit `backend/prisma/schema.prisma`: add `priceLocked Boolean @default(false)`, `priceLockedAt DateTime?`, `priceLockedBy String?` to `Quotation`
- [x] 4.2 Run `cd backend && npx prisma migrate dev --name add_quotation_price_lock`
- [x] 4.3 Update `quotationService.update`: when `advanceQuotationStatus` transitions into `DANG_CHO_PHAN_HOI`, set `priceLocked=true`, `priceLockedAt=now`, `priceLockedBy=actorUserId` inside the same write
- [x] 4.4 Define `PRICE_FIELDS` constant in service and reject updates touching them (parent or `items[*]`) when `priceLocked=true`, throwing `ValidationError('Báo giá đã khóa giá, không thể sửa giá. Hãy tạo phiên bản mới hoặc liên hệ ADMIN để mở khóa.')`; allow non-price field edits
- [x] 4.5 Implement ADMIN `forceUnlock: true` flow: when `actorRole === 'ADMIN'` AND `forceUnlock === true`, clear lock fields, apply edits, record `PRICE_UNLOCK` audit (placeholder until §6 lands)
- [x] 4.6 Surface `priceLocked`, `priceLockedAt`, `priceLockedBy` on every quotation list/detail payload returned by the service ← (verify: lock semantics enforce per `pricing-quotation` lock scenarios)

## 5. Migration `add_audit_log`

- [x] 5.1 Edit `backend/prisma/schema.prisma`: add `AuditLog` model under `common` schema per design D4 with indexes `(entityType, entityId)`, `(actorId)`, `(createdAt)`
- [x] 5.2 Run `cd backend && npx prisma migrate dev --name add_audit_log`
- [x] 5.3 Create `backend/src/utils/auditLog.ts` exporting `AuditEntityType`, `AuditAction` union types, and `recordAudit(params)` wrapping the Prisma write in `try/catch` and logging warnings on failure (never throw)
- [x] 5.4 Call `recordAudit` from `quotationRequestService` (CREATE/UPDATE/DELETE/STATUS_CHANGE) after primary commit
- [x] 5.5 Call `recordAudit` from `quotationService` (CREATE/UPDATE/DELETE/STATUS_CHANGE/PRICE_UNLOCK) after primary commit; ensure STATUS_CHANGE is recorded separately from UPDATE per design D4
- [x] 5.6 Call `recordAudit` from `orderService` (CREATE/UPDATE/DELETE/STATUS_CHANGE)
- [x] 5.7 Call `recordAudit` from `exportCostService` (CREATE/UPDATE/DELETE)
- [x] 5.8 Add `auditLogService.listAudit({ entityType?, entityId?, action?, actorId?, page, limit })` with envelope+pagination; validate `entityType` against union
- [x] 5.9 Add `auditLogController.ts` and route `GET /api/audit-logs` gated by `authorize('ADMIN','DEPARTMENT_HEAD')`; register in ROUTE_MAP
- [x] 5.10 Plumb `req.user.id` and `req.user.role` from controllers into service signatures for the 4 pricing services (extend Phase 1 plumbing); fail compile if absent ← (verify: audit rows recorded for all listed actions and read endpoint matches `audit-log` spec)

## 6. Pricing notification triggers

- [x] 6.1 Add helper to resolve recipients by role+departmentId once per call (no caching)
- [x] 6.2 Fire YCBG-create notification to all `DEPARTMENT_HEAD` + `TEAM_LEAD` in creator's department after `quotationRequestService.create` commits; template `"Có YCBG mới: {tenKhachHang} từ {nguoiTao}"`; try/catch
- [x] 6.3 Fire win notification to creator on `Quotation` status → `DA_DAT_HANG`; loss notification to creator + `DEPARTMENT_HEAD`s on `KHONG_DAT_HANG`; both try/catch
- [x] 6.4 Fire delivery notification to creator on `Order` production status → `DA_GIAO_CHO_KHACH_HANG`; try/catch
- [x] 6.5 Fire ADMIN unlock notification to creator + `DEPARTMENT_HEAD`s on `PRICE_UNLOCK`; try/catch
- [x] 6.6 Ensure every trigger runs AFTER the primary `$transaction` commits, never inside it; logger.warn on failure ← (verify: all 5 triggers honor the fire-and-forget + post-commit rules in `pricing-notifications` spec)

## 7. Quote aging

- [x] 7.1 Define `NON_TERMINAL_QUOTATION_STATUSES` constant in `quotationService` (excluding `DA_DAT_HANG`, `KHONG_DAT_HANG`, `EXPIRED`, `REJECTED`)
- [x] 7.2 In `quotationService.list`, after Prisma returns, compute `daysOpen = Math.floor((now - createdAt) / msPerDay)` for non-terminal rows; omit field otherwise
- [x] 7.3 Implement `quotationService.listAgingWarnings({ threshold })` that fetches non-terminal quotations, derives `daysOpen` in TS, filters where `daysOpen >= threshold`, sorts desc by `daysOpen`, and groups counts into `{ yellow, red }`
- [x] 7.4 Add controller + route `GET /api/quotations/aging-warnings?threshold=` gated by `authorize('ADMIN','DEPARTMENT_HEAD')`; whitelist `threshold` integer 1-90 with default 7; register in ROUTE_MAP ← (verify: endpoint, threshold whitelist, sort order, and bands match `pricing-quotation` aging scenarios)

## 8. Frontend — YCBG status column + filter

- [x] 8.1 Update `frontend/src/services/quotationRequestService.ts` to include `status` in the typed payload and to accept `status` query param on list
- [x] 8.2 Update `frontend/src/hooks/useQuotationRequests.ts` query key factory to include `status` and pass it through
- [x] 8.3 Update `QuotationRequestManagement.tsx`: add status filter dropdown (CHO_XU_LY / DANG_BAO_GIA / DA_BAO_GIA / HUY / Tất cả); reset page to 1 on change
- [x] 8.4 Render Vietnamese-labeled badge per status with the design D1 color map ← (verify: badge colors + filter wiring match `pricing-quotation-request` frontend scenarios)

## 9. Frontend — Quotation revision tab

- [x] 9.1 Create `frontend/src/services/quotationRevisionService.ts` typed to `QuotationRevision` with list + detail calls and standard envelope handling
- [x] 9.2 Create `frontend/src/hooks/useQuotationRevisions.ts` with key factory `{ all, lists, list({ quotationId, page, limit }), detail(quotationId, revisionId) }`
- [x] 9.3 Add "Lịch sử phiên bản" tab inside the quotation detail popup listing revisions with timestamp, user, optional note, paginated
- [x] 9.4 Open a modal on revision click showing the snapshot inside `<pre className="whitespace-pre-wrap">` (no pretty diff) ← (verify: tab + modal match `pricing-quotation` revision scenarios)

## 10. Frontend — Price lock UI

- [x] 10.1 Add `priceLocked`, `priceLockedAt`, `priceLockedBy` to the Quotation service type and propagate through the hook layer
- [x] 10.2 Render "Đã khóa giá" badge on list rows where `priceLocked=true`
- [x] 10.3 Disable price inputs (`donGia`, `soLuong`, `thanhTien`, `vat`, `totalAmount`, item-level price inputs) when `priceLocked=true`; keep non-price inputs editable
- [x] 10.4 Show "Mở khóa giá" button only when current user role is `ADMIN`; clicking opens `ConfirmDialog`; on confirm send `forceUnlock: true` with the next save ← (verify: badge, disabled inputs, ADMIN-only unlock + confirmation match `pricing-quotation` lock UI scenarios)

## 11. Frontend — Audit log tab

- [x] 11.1 Create `frontend/src/services/auditLogService.ts` typed to `AuditLog` with list call and envelope handling
- [x] 11.2 Create `frontend/src/hooks/useAuditLogs.ts` with key factory `{ all, lists, list({ entityType, entityId, action?, actorId?, page, limit }) }`
- [x] 11.3 Add "Lịch sử hoạt động" tab inside the Quotation, Order, and ExportCost detail popups (QuotationRequest optional) listing entries with action chip, actor, timestamp, and expandable JSON before/after
- [x] 11.4 Hide the tab when current user role is not `ADMIN` or `DEPARTMENT_HEAD` ← (verify: tab + RBAC visibility match `audit-log` read scenarios)

## 12. Frontend — Aging badge

- [x] 12.1 Add `daysOpen` to the Quotation list type as optional `number`
- [x] 12.2 Create `frontend/src/services/quotationAgingService.ts` (or extend `quotationService`) to call `/api/quotations/aging-warnings` and `frontend/src/hooks/useQuotationAgingWarnings.ts` with key factory `{ all, lists, list({ threshold }) }`
- [x] 12.3 In `QuotationManagement.tsx`, render the aging badge per design D6 bands on non-terminal rows ← (verify: thresholds + colors match `pricing-quotation` aging frontend scenarios)

## 13. Verification gates

- [x] 13.1 `cd backend && npx prisma migrate dev` runs clean against a fresh database; all 4 migration directories committed
- [x] 13.2 `cd backend && npx tsc --noEmit` returns zero errors
- [x] 13.3 `cd backend && npm run lint` passes
- [x] 13.4 `cd backend && npm test` passes (including the new `statusTransitions.test.ts` cases)
- [x] 13.5 `cd frontend && npx tsc --noEmit` returns zero errors
- [x] 13.6 `cd frontend && npm run lint` passes ← (verify: every gate is green before requesting archive)
