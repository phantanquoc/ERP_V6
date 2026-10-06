# Spec Delta

## MODIFIED Requirements

### Requirement: Shortage advances to Chờ bổ sung

**Previously**: When warehouse fulfillment records at least one shortage and creates replenishment requests, the parent `SupplyRequest.trangThai` advances to "Chờ bổ sung".

**Now**: When fulfillment is invoked via `CreateWarehouseIssueModal`'s supply-request path (warehouse issue from YCCC), shortage SHALL NOT create replenishment requests and SHALL NOT advance `SupplyRequest.trangThai` to "Chờ bổ sung". The `routeShortageToPurchase` flag on each `BatchFulfillLine` controls this: when `false`, no `ReplenishmentRequest` is created, no `SupplyRequestDecision` has `triggeredReplenishmentRequestId`, and the status bridge to "Chờ bổ sung" is skipped. The generic fulfillment path (partial fulfill outside this modal) retains the old behavior when `routeShortageToPurchase` is true or absent. Fulfillment status per item SHALL still be `Đã cấp đủ` / `Đã cấp một phần` / `Không cấp` based on quantities.

#### Scenario: Warehouse issue from YCCC does not create replenishment requests

- **WHEN** `batchFulfill` is called with `routeShortageToPurchase: false` and at least one line has `shortage > 0`
- **THEN** no `ReplenishmentRequest` is created and `SupplyRequest.trangThai` is not advanced to "Chờ bổ sung"

#### Scenario: shortage still recorded as partial fulfillment

- **WHEN** `batchFulfill` is called with `routeShortageToPurchase: false` and a line has `fulfilledQty = 5` for `soLuong = 10`
- **THEN** the item's `fulfillmentStatus` is set to "Đã cấp một phần" and `fulfilledQty` reflects `5`

#### Scenario: Generic path still routes shortage when flag is true

- **WHEN** `batchFulfill` is called with `routeShortageToPurchase: true` and a line has shortage
- **THEN** replenishment requests are created per `phanLoai` bucket and status may advance to "Chờ bổ sung" as before

#### Scenario: Shortage advances to Chờ bổ sung

- **WHEN** warehouse fulfillment records at least one shortage and creates replenishment purchase requests for the SR
- **THEN** the parent `SupplyRequest.trangThai` advances to "Chờ bổ sung" if it was "Đang xử lý"
