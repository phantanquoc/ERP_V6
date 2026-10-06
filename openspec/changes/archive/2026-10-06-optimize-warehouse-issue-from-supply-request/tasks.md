# Tasks

## 1. Backend — disable shortage → purchasing for warehouse issue path

- [x] 1.1 Ensure `batchFulfill` respects `routeShortageToPurchase: false` to skip `ReplenishmentRequest` creation, `SupplyRequestDecision.triggeredReplenishmentRequestId`, and the `Chờ bổ sung` status bridge, and verify `backend npx tsc --noEmit` passes and existing supply-request tests still pass
- [x] 1.2 Confirm `frontend/src/services/supplyRequestService.ts` `BatchFulfillLine` type documents `routeShortageToPurchase` and defaults correctly for the modal path

## 2. Frontend — auto-suggest best package per line

- [x] 2.1 Add `suggestBestPackage(row, warehouses, usedPackageIds?)` ranking: sufficient stock first → largest `soLuong` → `maKien` asc (FIFO), reusing `productMatches`/`normalizeName`, and verify unit logic handles ties and multi-warehouse candidates
- [x] 2.2 Pre-fill `warehouseId`/`lotId`/`lotProductId` for each pending `IssueRow` on modal open when a candidate exists, without overwriting already-filled rows, and verify opening the modal with a multi-item YCCC auto-fills expected rows
- [x] 2.3 Add header actions "Tự động điền tất cả" and "Xóa gợi ý" plus per-row stock badges (selected package `soLuong`/`donViTinh`, insufficient warning) and an aggregate summary (auto-filled count), and verify UI states render correctly ← (verify: auto-fill, clear, and badges match spec scenarios)
- [x] 2.4 Add "Tách kiện" action to split one YCCC line into two rows sharing `supplyRequestItemId` (new row auto-suggests next-best unused package) and verify repeated splits cover fragmented stock across packages

## 3. Frontend — submit aggregation and editable confirmation

- [x] 3.1 On submit, aggregate split rows by `supplyRequestItemId` into one `BatchFulfillLine.fulfilledQty = sum(soLuongXuat)` per item while building `WarehouseIssue` with N `WarehouseIssueItem` rows (one per package) in one transaction, and verify a split case (e.g., 40+60) sends correct `fulfilledQty` and creates N issue rows
- [x] 3.2 Make the confirmation overlay editable: `soLuongThucTe` as number input and `Kiện` as `LotProductCombobox` per row with live validation (`0 < qty ≤ package.soLuong`) and disabled Confirm when over-stock, and verify inline errors appear and Confirm disables/enables correctly
- [x] 3.3 Enforce `lyDoChenhLech` required when any row has `soLuongYeuCau ≠ soLuongThucTe` in planned mode within the confirm step, and verify missing reason disables Confirm and shows validation ← (verify: editable confirm with live stock/reason validation end-to-end)

## 4. Integration verification

- [x] 4.1 Run `frontend npx tsc --noEmit -p tsconfig.app.json` and `backend npx tsc --noEmit` (0 errors) and verify no new `any`/`console.log` introduced
- [x] 4.2 Manual flow: open YCCC detail with 3+ lines across multiple warehouses → "Tự động điền tất cả" → optionally split one line → edit quantity/package in confirm → submit → verify `WarehouseIssue` created with correct per-package rows and `SupplyRequestItem.fulfilledQty` updated without creating `ReplenishmentRequest` or moving to `Chờ bổ sung` ← (verify: full YCCC → issue flow with stock fragmentation and editable confirm)
