## MODIFIED Requirements

### Requirement: PurchaseRequestItem fields
Each `PurchaseRequestItem` SHALL contain: `id` (cuid), `purchaseRequestId` (FK), `phanLoai` (String, required), `tenHangHoa` (String, required), `soLuong` (Float, required, > 0, the planned/KH quantity), `donViTinh` (String, required), `nhaCungCapId` (nullable FK), `giaDuKien` (Float, nullable, planned price), `giaThucTe` (Float, nullable, confirmed actual price), `soLuongThucTe` (Float, nullable, confirmed actual quantity; `null` means not yet confirmed; when confirmed, defaults to `soLuong` if not otherwise set), `createdAt`, `updatedAt`. Deleting the parent `PurchaseRequest` SHALL cascade-delete all child items. `PurchaseRequest` SHALL have `lyDoChenhLech String?` (header discrepancy reason, required when any `soLuongThucTe != soLuong`).

#### Scenario: Items cascade-deleted with parent
- **WHEN** a `PurchaseRequest` is deleted
- **THEN** all associated `PurchaseRequestItem` records are deleted

#### Scenario: Confirm stores actual quantity and reason
- **WHEN** `POST /api/purchase-requests/:id/confirm-actual-price` is called with `{ items: [{id, soLuongThucTe: 95}], lyDoChenhLech: "Thiếu 5" }` for an item with `soLuong=100`
- **THEN** the item stores `soLuongThucTe=95` and the header stores `lyDoChenhLech="Thiếu 5"`

### Requirement: Pre-fill purchase request items from supply request
When creating a PurchaseRequest from a SupplyRequest (i.e., `supplyRequestId` is provided), the system SHALL pre-populate the `items` array with entries derived from the linked SupplyRequest's items: `phanLoai` → `phanLoai`, `tenGoi` → `tenHangHoa`, `soLuong` → `soLuong`, `donViTinh` → `donViTinh`.

#### Scenario: Pre-fill items on purchase request creation from supply request
- **WHEN** the frontend opens CreatePurchaseRequestModal with a selected SupplyRequest
- **THEN** the items table is pre-populated with rows matching the supply request's items

#### Scenario: User can edit pre-filled items before saving
- **WHEN** items are pre-filled from a supply request
- **THEN** the user can change soLuong, donViTinh, phanLoai, or tenHangHoa before submitting

### Requirement: Replenishment purchase requests are a named stage

A `PurchaseRequest` whose `sourceType = 'SHORTAGE'` and `trangThai = 'Chờ báo giá'` SHALL be treated as a **Yêu cầu bổ sung** and labeled as such in every UI surface (tabs, cards, notification titles, detail header) via a shared label helper. From `Chờ duyệt` onward the same record SHALL render as **Yêu cầu mua hàng**. The label is purely presentational; `maYeuCau` and the status workflow remain unchanged.

#### Scenario: Shortage ticket renders as replenishment in the waiting stage
- **WHEN** a `SHORTAGE` purchase request in `Chờ báo giá` is listed in the purchasing tabs
- **THEN** the list row and detail header show the label "Yêu cầu bổ sung" and its card is counted under the replenishment count, not the purchase count

#### Scenario: Approved replenishment ticket renders as a purchase request
- **WHEN** the same `SHORTAGE` ticket is advanced to `Chờ duyệt` via `submitForApproval`
- **THEN** the list row and detail header show "Yêu cầu mua hàng" and the purchasing stats for "Đã duyệt" include it

#### Scenario: Manual or QUICK tickets are never labeled as replenishment regardless of status
- **WHEN** a `MANUAL` or `QUICK` purchase request is in `Chờ báo giá`
- **THEN** it renders as "Yêu cầu mua hàng"

### Requirement: Purchase request list and detail include items
The GET list and GET by ID endpoints for purchase requests SHALL include the `items` relation with `soLuongThucTe`, `giaThucTe`, `giaDuKien`, and the header `lyDoChenhLech`.

#### Scenario: Fetch purchase request by ID returns items with confirmed fields
- **WHEN** a client calls GET /api/purchase-requests/:id
- **THEN** the response includes an `items` array with `soLuong`, `soLuongThucTe`, `giaDuKien`, `giaThucTe` per item and `lyDoChenhLech` on the header

#### Scenario: List supports filtering replenishment vs purchase by goods class and stage
- **WHEN** a caller calls `GET /api/purchase-requests?phanLoai=Nguyên vật liệu` or filters by `sourceType=SHORTAGE` in the purchasing tabs
- **THEN** only requests matching the class are returned and `pagination.total` reflects the filtered count

### Requirement: Confirm actual price is an operational update, not an approval

The `POST /api/purchase-requests/:id/confirm-actual-price` endpoint SHALL be gated by `requireRule('purchase-requests', 'UPDATE')` (not `APPROVE`). Its service layer SHALL accept the actor when any of the following holds: the actor is `ADMIN`; the actor's resolved department code is `DEPT_PURCHASING` (any role); or the actor is a `GENERAL/pricing` approver (`isPricingApprover`). A department lookup, not a hard-coded id, SHALL determine purchasing membership. The endpoint SHALL accept per-item `soLuongThucTe` and header `lyDoChenhLech` as described in `purch-actual-qty-confirm` and SHALL enforce quantity/price positivity and discrepancy-reason requirements.

#### Scenario: Purchasing employee confirms actual price
- **WHEN** an `EMPLOYEE` whose primary or secondary department resolves to `DEPT_PURCHASING` calls `POST /api/purchase-requests/:id/confirm-actual-price` on a request in `Đã duyệt`
- **THEN** the system records the actual prices and returns `200`

#### Scenario: Unrelated department employee cannot confirm actual price
- **WHEN** an `EMPLOYEE` whose departments do not include `DEPT_PURCHASING` or `DEPT_GENERAL/pricing` calls `POST /api/purchase-requests/:id/confirm-actual-price`
- **THEN** the system returns `403`

#### Scenario: General pricing approver retains confirm access
- **WHEN** a `DEPT_GENERAL` user in `SUBDEPT_GENERAL_PRICING` (role `EMPLOYEE` or higher) calls `POST /api/purchase-requests/:id/confirm-actual-price`
- **THEN** the system returns `200`

### Requirement: Submit-for-approval is an operational update

The `POST /api/purchase-requests/:id/submit-approval` endpoint SHALL be gated by `requireRule('purchase-requests', 'UPDATE')`, so an in-department `EMPLOYEE` can hand a ticket to the approver. The actual approval transition to `Đã duyệt`/`Từ chối` SHALL remain restricted to a real approver check.

#### Scenario: Purchasing employee submits a quoted request for approval
- **WHEN** an `EMPLOYEE` in `DEPT_PURCHASING` with a complete-quoted `Chờ báo giá` request calls `POST /api/purchase-requests/:id/submit-approval`
- **THEN** the request moves to `Chờ duyệt` and the system returns `200`

#### Scenario: Real approval still gated
- **WHEN** an `EMPLOYEE` not a pricing approver calls `PUT /api/purchase-requests/:id` with `trangThai: 'Đã duyệt'`
- **THEN** the system returns `403`
