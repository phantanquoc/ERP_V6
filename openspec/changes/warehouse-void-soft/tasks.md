## 1. Database migration

- [ ] 1.1 Add migration `add_void_to_warehouse_slips` — `ALTER TABLE business.warehouse_receipts/issues ADD COLUMN isVoided BOOLEAN NOT NULL DEFAULT false, voidReason TEXT, voidedAt TIMESTAMPTZ(6), voidedBy TEXT` (+ index on `isVoided` if beneficial) ← (verify: `prisma migrate status` shows applied, `information_schema.columns` has 4 columns per table, `prisma generate` succeeds)
- [ ] 1.2 Update `backend/prisma/schema/business_production.prisma` — `WarehouseReceipt` and `WarehouseIssue` add `isVoided Boolean @default(false)`, `voidReason String?`, `voidedAt DateTime? @db.Timestamptz(6)`, `voidedBy String?`

## 2. Backend validation

- [ ] 2.1 Add `voidReceiptSchema` / `voidIssueSchema` in `backend/src/schemas/index.ts` — `voidReason: z.string().trim().min(1).max(500)` (covers `POST /:id/void`; `unvoid` needs no body) ← (verify: `zodValidate` rejects empty/missing `voidReason` with 400)

## 3. Backend service — WarehouseReceipt

- [ ] 3.1 Implement `void(id, {voidReason, userId})` and `unvoid(id)` in `backend/src/services/warehouseReceiptService.ts` — `SELECT ... FOR UPDATE`, idempotency 409, void: `sumByPackage` + `loadBalances` + `updateMany gte` decrement + set `isVoided/voidReason/voidedAt/voidedBy`; unvoid: increment (no guard) + clear fields; no YCCC/YCMH revert ← (verify: unit test void/unvoid with stock guard, insufficient stock returns 400 `cần N còn M`, already-voided returns 409)
- [ ] 3.2 Update `getAll` / `getById` to filter `where isVoided=false` by default, `includeVoided=true` includes all; inventory aggregations exclude voided ← (verify: `GET /warehouse-receipts` hides voided, `?includeVoided=true` shows them, `pagination.total` excludes voided, `GET /:id` returns voided with metadata)

## 4. Backend service — WarehouseIssue

- [ ] 4.1 Implement `void`/`unvoid` in `backend/src/services/warehouseIssueService.ts` — void: increment per package, unvoid: decrement with `gte` guard ← (verify: mirror tests for issue path)
- [ ] 4.2 Update `getAll`/`getById`/inventory filters for `isVoided` same as receipt ← (verify: issue list/detail hide/show and stock guard)

## 5. Backend controller and routes

- [ ] 5.1 Add `voidWarehouseReceipt` / `unvoidWarehouseReceipt` in `backend/src/controllers/warehouseReceiptController.ts` and `voidWarehouseIssue` / `unvoidWarehouseIssue` in `warehouseIssueController.ts` — extract `voidReason` + `req.user.id`, map 400/403/404/409
- [ ] 5.2 Wire `backend/src/routes/warehouseReceiptRoutes.ts` and `warehouseIssueRoutes.ts` — `POST /:id/void` with `zodValidate(voidSchema)` + `requireRule(..., 'DELETE')`, `POST /:id/unvoid` with `requireRule` ← (verify: unauth → 401, no permission → 403, missing reason → 400, happy path → 200)

## 6. Frontend services

- [ ] 6.1 Add `voidWarehouseReceipt(id, {voidReason})` / `unvoidWarehouseReceipt` in `frontend/src/services/warehouseReceiptService.ts` and same for `warehouseIssueService.ts` ← (verify: service calls `POST /:id/void` with correct payload)

## 7. Frontend UI

- [ ] 7.1 Update `frontend/src/components/WarehouseReceiptTab.tsx` and `WarehouseIssueTab.tsx` — `Vô hiệu hóa` action via `CancelWithReasonModal` (works even when `isLocked`), dimmed row + `Đã vô hiệu` badge when `isVoided`, `isVoided` filter toggle mapping to `includeVoided`, detail shows `voidReason/voidedAt/voidedBy` ← (verify: void flow from tab → row becomes dimmed/badge, default list hides voided unless filter on, detail shows metadata)
- [ ] 7.2 Update `frontend/src/components/WarehouseSlipPrintView.tsx` — overlay `ĐÃ VÔ HIỆU` watermark when `isVoided` for both receipt and issue ← (verify: print view shows watermark only for voided slips)

## 8. Verification

- [ ] 8.1 Run `cd backend && npx tsc --noEmit`, `cd frontend && npx tsc --noEmit -p tsconfig.app.json`, `cd backend && npm test`, `npx prisma migrate deploy && npx prisma generate`; manual void `PN-46/47` and one issue slip then verify `lot_products.soLuong` reverted and `?includeVoided=true` filter ← (verify: typecheck 0 errors, tests pass, manual void/unvoid stock + filter as specified)
