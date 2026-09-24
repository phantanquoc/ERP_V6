## ADDED Requirements

### Requirement: Confirm actual quantity and discrepancy reason together with actual price

Purchasing SHALL confirm actual quantity per item together with actual price via `POST /api/purchase-requests/:id/confirm-actual-price` when the request is in `Đã duyệt`. The request body SHALL be `{ items: {id, giaThucTe?, soLuongThucTe?}[], lyDoChenhLech?: string }`. The server SHALL resolve the effective quantity per item as `soLuongThucTe ?? stored soLuongThucTe ?? soLuong` (KH) and the effective price as `giaThucTe ?? stored giaThucTe ?? giaDuKien`, merging the submitted subset with stored confirmed values. Each effective `giaThucTe` and `soLuongThucTe` SHALL be `>0` and finite; otherwise the server SHALL return `400`. If any effective `soLuongThucTe != soLuong` (KH, epsilon `1e-9`) the server SHALL require `lyDoChenhLech.trim()` non-empty and return `400` when missing. On success the server SHALL persist `PurchaseRequestItem.soLuongThucTe`, `PurchaseRequestItem.giaThucTe`, and `PurchaseRequest.lyDoChenhLech` (trimmed or `null` when no diff) inside a single transaction, and SHALL recompute `InternationalProduct.giaThanh` as a weighted average using the confirmed quantities (existing price-averaging logic but with `boughtQty = soLuongThucTe`). If any non-voided warehouse receipt already exists for the PR, the server SHALL reject a re-confirm with `400` and a message indicating receipts already exist.

#### Scenario: Confirm price and quantity with discrepancy note
- **WHEN** a `Đã duyệt` PR with one item `soLuong=100, giaDuKien=5000` is confirmed with `{ items: [{id, giaThucTe: 5200, soLuongThucTe: 95}], lyDoChenhLech: "Thiếu 5 do hư hỏng" }`
- **THEN** the server returns `200`, the item has `giaThucTe=5200, soLuongThucTe=95`, the header has `lyDoChenhLech="Thiếu 5 do hư hỏng"`, and `InternationalProduct.giaThanh` is updated using `95` as boughtQty

#### Scenario: Fast confirm when TT equals KH
- **WHEN** a `Đã duyệt` PR is confirmed with no `soLuongThucTe` sent (or `soLuongThucTe == soLuong` for every item) and `lyDoChenhLech` omitted
- **THEN** the server returns `200`, each item gets `soLuongThucTe = soLuong` and `lyDoChenhLech` is stored as `null`

#### Scenario: Quantity differs but reason missing is rejected
- **WHEN** a `Đã duyệt` PR is confirmed with `soLuongThucTe=95` vs `soLuong=100` but `lyDoChenhLech` is empty
- **THEN** the server returns `400` with message "Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch."

#### Scenario: Re-confirm after receipt exists is rejected
- **WHEN** a PR already has a non-voided `WarehouseReceipt` linked via `purchaseRequestId`
- **THEN** `POST /:id/confirm-actual-price` returns `400` regardless of payload

#### Scenario: Partial payload keeps prior confirmed values
- **WHEN** a prior confirm stored `giaThucTe=5000, soLuongThucTe=100` for item A and a second call sends only item B
- **THEN** item A's confirmed values are retained and item B is updated; `lyDoChenhLech` validation uses the merged effective quantities

### Requirement: Complete (Hoàn thành) gated on confirmed price, quantity, and reason

Transition `Đã duyệt → Hoàn thành` via `PUT /api/purchase-requests/:id {trangThai: "Hoàn thành"}` SHALL be gated: every `PurchaseRequestItem` MUST have `giaThucTe >0` and `soLuongThucTe >0`; if any `soLuongThucTe != soLuong` then `lyDoChenhLech` (effective — submitted or stored) MUST be non-empty. Violations SHALL return `400` before any status change. Already-Hoàn thành rows existing before this change (with `null` fields) SHALL NOT be retroactively blocked.

#### Scenario: Complete without confirmed quantity is rejected
- **WHEN** a `Đã duyệt` PR without `soLuongThucTe` on at least one item is moved to `Hoàn thành`
- **THEN** the server returns `400` and `trangThai` stays `Đã duyệt`

#### Scenario: Complete with quantity diff but no reason is rejected
- **WHEN** a `Đã duyệt` PR has `soLuongThucTe=95` vs `100` but `lyDoChenhLech` empty
- **THEN** the server returns `400`

#### Scenario: Complete succeeds when all gated fields are present
- **WHEN** a `Đã duyệt` PR has every item with `giaThucTe>0, soLuongThucTe>0` and, if diff exists, a non-empty `lyDoChenhLech`
- **THEN** the server transitions to `Hoàn thành`, creates the `InboundPlan` if not yet present, and returns `200`

### Requirement: Preserve confirmed quantity and reason across item rewrites

When `PUT /api/purchase-requests/:id` rewrites `items` via delete+createMany while in `Đã duyệt`, the server SHALL carry prior `giaThucTe` and `soLuongThucTe` keyed by incoming `id` then fallback `tenHangHoa` lowercased, keeping prior values when the incoming item omits them. `lyDoChenhLech` on the header SHALL be preserved when the caller does not send it and no new quantity diff is introduced; when a new diff is introduced without a reason, the request SHALL be rejected.

#### Scenario: Header edit after approval keeps confirmed quantity
- **WHEN** a `Đã duyệt` PR with confirmed `soLuongThucTe` receives a `PUT` that sends `items` without `soLuongThucTe`
- **THEN** the stored `soLuongThucTe` values are retained

### Requirement: Confirm modal shows KH/TT and mandatory reason

`ConfirmActualPriceModal` SHALL display one row per `PurchaseRequestItem` with columns `SL KH` (disabled, `soLuong`), `SL TT` (editable, default `soLuongThucTe ?? soLuong`), `Giá KH` (disabled), `Giá TT` (editable, default `giaThucTe ?? giaDuKien`), and a footer totals row using `TT * giaThucTe`. A textarea `Lý do chênh lệch` SHALL appear and be required (red border + error message, submit blocked) when any `SL TT != SL KH` (epsilon `1e-9`). Submitting SHALL call `POST /:id/confirm-actual-price` with `{items, lyDoChenhLech}`. When `thenComplete` is true the modal SHALL, on successful confirm, immediately call `PUT /:id {trangThai: "Hoàn thành"}` (passing `lyDoChenhLech` if diff exists) and surface any gate error without closing.

#### Scenario: Fast confirm defaults TT to KH
- **WHEN** the modal opens for a PR with `soLuong=10`
- **THEN** the `SL TT` input is prefilled with `10` and the reason textarea is not required until the user changes TT

#### Scenario: Quantity diff without reason blocks submit
- **WHEN** the user changes any `SL TT` to differ from `SL KH` and leaves `Lý do chênh lệch` empty
- **THEN** the submit button is disabled and an inline error is shown; the API is not called

### Requirement: PR detail and list expose confirmed quantities

`GET /api/purchase-requests` and `GET /api/purchase-requests/:id` SHALL include `PurchaseRequestItem.soLuongThucTe` and `PurchaseRequest.lyDoChenhLech`. `PurchaseRequestDetailModal` SHALL render per-item `SL KH / SL TT` with a diff badge when they differ, and a `Lý do chênh lệch` block when present. `PurchaseRequestSubTabs` list SHALL render inline `xKH→TT` when TT is confirmed, otherwise `xKH`.

#### Scenario: Detail shows discrepancy
- **WHEN** a PR has `soLuong=100, soLuongThucTe=95, lyDoChenhLech="Thiếu 5"`
- **THEN** the detail modal shows the two SL columns, a "Lệch -5" badge, and the reason text

### Requirement: Warehouse receipt prefill inherits confirmed PR quantities and reason

When `CreateWarehouseReceiptModal` is opened with a linked `purchaseRequestId` (via `supplyRequest` or `inboundPlan`), it SHALL prefill each row as `soLuongYeuCau = prItem.soLuong` and `soLuongThucTe = prItem.soLuongThucTe ?? prItem.soLuong`, and prefill the receipt `lyDoChenhLech` from `pr.lyDoChenhLech` (editable). The warehouse receipt reconciliation and plan auto-close SHALL use the confirmed TT when present.

#### Scenario: Receipt inherits confirmed quantity
- **WHEN** a PR with `soLuong=100, soLuongThucTe=95, lyDoChenhLech="Thiếu 5"` is used to create a receipt
- **THEN** the modal shows `SL KH=100, SL TT=95`, the `Lý do chênh lệch` textarea is prefilled with "Thiếu 5", and submitting creates a receipt with those values

### Requirement: Receipt and inbound plan reconciliation use confirmed TT

`warehouseReceiptService.assertMatchesPurchaseRequest`, `applyPurchaseUnitCost`, and `inboundPlanService.onReceiptCreated/recomputeAfterVoid` SHALL use `soLuongThucTe ?? soLuong` as the purchased quantity when the PR has confirmed quantities. The quantity and unit checks and the `received >= planned` plan-close logic SHALL compare against TT when present, falling back to KH.

#### Scenario: Receipt against confirmed TT
- **WHEN** a PR has `soLuong=100, soLuongThucTe=95` and a receipt is created with `soLuongThucTe=95`
- **THEN** the receipt is accepted

#### Scenario: Receipt exceeds confirmed TT is rejected
- **WHEN** a PR has `soLuongThucTe=95` and a receipt tries `soLuongThucTe=96`
- **THEN** the server returns `400` indicating the quantity exceeds the purchased amount
