## 1. Database migration

- [ ] 1.1 Add `PurchaseRequest.lyDoChenhLech String?` and `PurchaseRequestItem.soLuongThucTe Float?` to `backend/prisma/schema/business_production.prisma`, run `npx prisma migrate dev` and `npx prisma generate` ← (verify: migration applies cleanly, `npx prisma validate` passes, no existing tests broken)

## 2. Backend — confirmActualPrice extended

- [ ] 2.1 Extend `POST /api/purchase-requests/:id/confirm-actual-price` to accept `items: {id, giaThucTe?, soLuongThucTe?}[]` + header `lyDoChenhLech?: string` in `purchaseRequestService.ts` and `purchaseRequestController.ts`; resolve effective `soLuongThucTe/giaThucTe` by merging submitted subset with stored confirmed values, default `soLuongThucTe` to `soLuong` when still null
- [ ] 2.2 Validate each effective `giaThucTe` and `soLuongThucTe` as `>0` finite; when any `soLuongThucTe != soLuong` (epsilon `1e-9`) require `lyDoChenhLech.trim()` non-empty with `400`; persist per-item `soLuongThucTe` and header `lyDoChenhLech` (trimmed/`null`) in the same transaction
- [ ] 2.3 Update `InternationalProduct.giaThanh` weighted-average to use `soLuongThucTe` as `boughtQty`; reject re-confirm when any non-voided `WarehouseReceipt` exists for the PR (check `purchaseRequestId` + `isVoided=false`) ← (verify: new confirm scenarios from spec — fast confirm, diff without reason rejected, re-confirm after receipt rejected, partial payload, and `giaThanh` uses TT quantity)

## 3. Backend — transition gate and preserve

- [ ] 3.1 Gate `PUT /api/purchase-requests/:id` `Đã duyệt → Hoàn thành` to require every item has `giaThucTe>0` and `soLuongThucTe>0`; when quantity differs require `lyDoChenhLech` (effective submitted or stored); reject `400` before any write, keep existing `ALLOWED_TRANSITIONS` and TOCTOU `updateMany where trangThai='Đã duyệt'` pattern
- [ ] 3.2 Preserve `soLuongThucTe` (and existing `giaThucTe`) across `PUT` item rewrites (delete+createMany) keyed by incoming `id` then fallback `tenHangHoa` lowercased; preserve `lyDoChenhLech` when caller omits it and no new diff is introduced ← (verify: edit after `Đã duyệt` keeps confirmed TT, Hoàn thành gate blocks missing TT/price/reason and passes when all present)

## 4. Backend — warehouse receipt and inbound plan reconciliation

- [ ] 4.1 Update `warehouseReceiptService.assertMatchesPurchaseRequest` to build `purchased` quantities from `soLuongThucTe ?? soLuong` per PR item; same for cumulative `already received` check (sum non-voided receipts, exclude current on update) and unit check
- [ ] 4.2 Update `warehouseReceiptService.applyPurchaseUnitCost` to use `soLuongThucTe ?? soLuong` for quantity-weighted unit cost
- [ ] 4.3 Update `inboundPlanService.onReceiptCreated` and `recomputeAfterVoid` to treat `soLuongThucTe ?? soLuong` as the planned quantity when the PR has confirmed TT; keep fallback to `soLuong` for unconfirmed PRs ← (verify: receipt within TT accepted, receipt exceeding TT rejected, plan auto-close compares against TT when confirmed)

## 5. Frontend — confirm modal, detail, list, and receipt prefill

- [ ] 5.1 Extend `frontend/src/services/purchaseRequestService.ts` `confirmActualPrice(id, items, lyDoChenhLech?)` and `PurchaseRequestItem`/`PurchaseRequest` types (`soLuongThucTe`, `lyDoChenhLech`); update `ConfirmActualPriceModal.tsx` to show `SL KH` (disabled) + `SL TT` (editable, default `soLuongThucTe ?? soLuong`) alongside `Giá KH/TT`, add mandatory `Lý do chênh lệch` textarea when any `TT != KH`, block submit and show inline error, totals use `TT * giaThucTe`, and implement `thenComplete` as confirm-then-complete sequential calls surfacing gate errors
- [ ] 5.2 Update `PurchaseRequestDetailModal.tsx` to render per-item `SL KH / SL TT` with diff badge and header `Lý do chênh lệch` block; update `PurchaseRequestSubTabs.tsx` list inline to `xKH→TT` when TT confirmed; ensure `GET` detail/list include new fields
- [ ] 5.3 Update `CreateWarehouseReceiptModal.tsx` (and `EditWarehouseReceiptModal.tsx` if applicable) prefill for linked PR: `soLuongYeuCau = prItem.soLuong`, `soLuongThucTe = prItem.soLuongThucTe ?? prItem.soLuong`, and prefill `lyDoChenhLech` from `pr.lyDoChenhLech` (editable); keep existing KH/TT column and reason textarea behavior ← (verify: fast confirm defaults TT=KH without reason, diff without reason blocked in modal, detail/list show TT and badge, receipt modal inherits TT and reason from PR, receipt create still enforces its own lyDoChenhLech when edited to differ)

## 6. Verification

- [ ] 6.1 Run `cd backend && npx tsc --noEmit`, `cd backend && npx jest --runInBand` (or targeted suites: `src/__tests__/purchaseRequest*.test.ts`, `src/__tests__/warehouseReceipt*.test.ts`), `cd frontend && npx tsc --noEmit -p tsconfig.app.json`, and manual E2E: confirm qty+price → complete → create receipt prefilled → receipt within TT accepted → receipt exceeding TT rejected ← (verify: typecheck 0 errors, tests pass, E2E gate and prefill behave per spec)
