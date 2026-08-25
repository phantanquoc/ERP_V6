## Why

Supply fulfillment currently skips the “replenishment” step: when the warehouse cannot fully supply a request, the service creates a purchase request directly with the warehouse employee as requester, outside a single transaction, and broadcasts it to the entire purchasing department. The replenishment phase must become an explicit routing stage so the right purchasing sub-team (materials vs equipment) receives it, and the purchase request lifecycle must obey status guards that are currently bypassed.

## What Changes

- Introduce the **replenishment convention** on top of `PurchaseRequest` (no new entity): a `SHORTAGE`-sourced purchase request in `Chờ báo giá` is displayed and treated as a **Yêu cầu bổ sung**; from `Chờ duyệt` onward it is a **Yêu cầu mua hàng** — only the label/title changes, `maYeuCau` and workflow stay the same.
- Warehouse fulfillment groups shortage by `phanLoai` into **one purchase request per group** inside a single transaction with the fulfillment update and decision log; `owner = SR.employeeId` (requester), decided-by stored on `SupplyRequestDecision`.
- Split `PURCHASE_REQUEST_CREATED` notifications by `phanLoai` to `SUBDEPT_PURCHASING_MATERIALS` (NVL/materials) vs `_EQUIPMENT` (equipment) with `DEPT_PURCHASING` fallback; add `?phanLoaiNCC` server-side filter for purchase requests.
- Add **P0 guards**: enforced `ALLOWED_TRANSITIONS` for `PurchaseRequest.trangThai` (including `Chờ báo giá` only via `submitForApproval`, `* → Hoàn thành` only from `Đã duyệt`), correct `RESOURCE_TO_MODEL` owner fields, `requireRule('supply-requests', …)` + ABAC on supply-request routes, `SupplyRequestDecision.triggeredPurchaseRequestId` FK/index, DB `CHECK`/unique fixes, and lost-update/double-create fixes for warehouse stock.
- Frontend: label helper maps `(sourceType, trangThai) → "Yêu cầu bổ sung" / "Yêu cầu mua hàng"`; purchasing tabs filter server-side (`?phanLoaiNCC`), stats use `pagination.total`, supply/request gating via `can('supply-requests'/'purchase-requests', …)`, and a dedicated “replenishment” view for the `Chờ báo giá` stage.
- Add the SupplyRequest status `Chờ bổ sung` between `Đang xử lý` and `Đã duyệt mua` to surface waiting on purchasing.

## Capabilities

### New Capabilities
- `supply-replenishment-routing`: Shortage grouping by `phanLoai`, correct ownership, transactional replenishment purchase requests, sub-department-scoped routing and notifications.
- `purchase-request-transition-guards`: Status allowlist and permission gates for every purchase-request transition, including `submitForApproval`.
- `warehouse-stock-concurrency`: Lost-update-safe stock operations (`LotProduct.soLuong` atomic decrement, upsert for catalog entities, `CHECK`/`unique` safeguards).

### Modified Capabilities
- `supply-request-multi-item`: Add `Chờ bổ sung` to the supply-request status workflow; make warehouse decisions drive it; fix route ABAC.
- `purchase-request-multi-item`: Replenishment purchase requests are a named stage (`Yêu cầu bổ sung`) with supply linkage preserved and server-side filtering by item `phanLoai`.
- `audit-log`: Persist `SupplyRequestDecision.triggeredPurchaseRequestId` as a real FK and surface it in decision history.

## Impact

- **Database**: `business_production.prisma` — FK/index/CHECK/unique on `SupplyRequestDecision`, `LotProduct`, `WarehouseReceipt/Issue`, `Supplier`, `PurchaseRequest`; optional `SupplyRequest.trangThai` extension.
- **Backend**: `supplyRequestService` (fulfillment transactions + grouping + status), `purchaseRequestService` (transition guards + codegen inside tx), `warehouseIssue/ReceiptService` (stock atomicity + upsert), `notificationRegistry` (split recipients), `requireRule` + `supplyRequestRoutes`/`lotProductRoutes` (ABAC/IDOR), `isPricingApprover`/`purchaseRequestRoutes` submission guards.
- **Frontend**: `PurchasingMaterials/Equipment` tabs, `SupplyRequestManagement`, `PartialFulfillmentModal`, `CreatePurchaseRequestModal`, `PurchaseRequestReviewTab`, supply/purchase service clients, hooks.
- **Verification**: `backend npx tsc --noEmit`, `backend npm test` (targeted + full), `frontend npx tsc --noEmit -p tsconfig.app.json`, `frontend npm run lint`, transition matrix tests, replenishment routing tests.
