## Why

The current Supply Request feature is limited to one product per request, has only two manual statuses, and lacks the purchase and warehouse linkages needed to track the full procurement lifecycle. This forces purchasing staff to manage multiple disconnected records and prevents employees from knowing where their requests stand.

## What Changes

- **BREAKING** Remove single-item fields (`phanLoai`, `tenGoi`, `soLuong`, `donViTinh`) from `SupplyRequest` model and move them into a new child model `SupplyRequestItem`
- **BREAKING** Remove single-item fields (`phanLoai`, `tenHangHoa`, `soLuong`, `donViTinh`) from `PurchaseRequest` model and move them into a new child model `PurchaseRequestItem`
- Add `SupplyRequestItem` Prisma model (linked many-to-one to `SupplyRequest`)
- Add `PurchaseRequestItem` Prisma model (linked many-to-one to `PurchaseRequest`)
- Add `nhaCungCapId`, `giaDuKien`, and `ghiChuMuaHang` fields to `PurchaseRequest` with FK to `Supplier`
- Expand supply request statuses from 2 to 4: "Chưa cung cấp" → "Đang xử lý" → "Đã duyệt mua" → "Đã cung cấp"
- Automate status transitions triggered by linked PurchaseRequest and WarehouseReceipt events
- Expand notification coverage to notify the original requester and warehouse staff at each status transition
- Update `SupplyRequestModal` to support a dynamic list of product rows (add/remove)
- Update `SupplyRequestManagement` view/edit modal to display all items in a sub-table
- Update `CreatePurchaseRequestModal` to display multi-item table with editable price and supplier fields

## Capabilities

### New Capabilities

- `supply-request-multi-item`: Allow one supply request to contain multiple product items, replacing the previous single-item model
- `supply-request-status-workflow`: Four-stage automated status lifecycle driven by downstream procurement and warehouse events
- `supply-request-notifications`: Event-driven notifications to the original requester and warehouse department at each status transition
- `purchase-request-multi-item`: Allow one purchase request to contain multiple line items pre-filled from supply request items, with per-item quantity/unit and request-level supplier and estimated price
- `purchase-request-supplier-pricing`: Add supplier selection (FK to `Supplier`) and estimated price fields to purchase requests

### Modified Capabilities

<!-- No existing specs directory — no existing named capabilities to delta. -->

## Impact

- **Database**: Two new tables (`supply_request_items`, `purchase_request_items`), new columns on `purchase_requests` (`nhaCungCapId`, `ghiChuMuaHang`); migration required; existing single-item rows must be backfilled into item tables before old columns are dropped
- **Backend services**: `supplyRequestService.ts`, `purchaseRequestService.ts` (if exists) — create/update/get methods all change signatures
- **Backend routes**: `supplyRequestRoutes.ts`, purchase request routes — request body shape changes
- **Frontend components**: `SupplyRequestModal.tsx`, `SupplyRequestManagement.tsx`, `CreatePurchaseRequestModal.tsx`
- **Frontend services**: `supplyRequestService.ts`, `purchaseRequestService.ts` — type definitions change
- **Notification types**: `notification.types.ts` — add new notification type constants for status transitions
- **No new external dependencies** required
