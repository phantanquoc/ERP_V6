## Context

The ERP system manages supply requests (yêu cầu bổ sung/cung cấp) from employees to the purchasing department, which then creates purchase requests and ultimately issues warehouse receipts. Currently each supply request holds exactly one product line, has only two manually-set statuses ("Chưa cung cấp" / "Đã cung cấp"), sends notifications only on creation, and the purchase request form has no supplier or pricing fields.

This design covers: adding child item tables to both SupplyRequest and PurchaseRequest, automating the 4-stage status lifecycle, wiring notifications to each transition, and updating the affected React components.

Affected layers: Prisma schema → database migration → backend service/controller/route layer → frontend services → frontend components.

## Goals / Non-Goals

**Goals:**
- Allow one supply request and one purchase request to each contain multiple product line items
- Automate status transitions ("Đang xử lý", "Đã duyệt mua", "Đã cung cấp") based on downstream events
- Send targeted notifications at each transition
- Expose supplier selection and estimated price on purchase requests
- Backfill existing single-item rows so existing data is preserved

**Non-Goals:**
- Splitting one supply request across multiple purchase requests (all items go into one PurchaseRequest)
- Per-item supplier assignment (supplier is set at the PurchaseRequest level)
- File attachment per item (fileKemTheo stays at the request header level)
- Real-time websocket push for notifications (existing polling/REST pattern is sufficient)
- Changes to WarehouseReceipt or WarehouseIssue models beyond reading their existence

## Decisions

### D1: Child item tables rather than JSON columns
Items are stored as relational child rows (`supply_request_items`, `purchase_request_items`) rather than a JSON array column. This allows proper indexing, cascading deletes, and future per-item queries without schema changes.

Alternatives considered: JSON column (simpler migration, but no referential integrity and harder to query), array fields (not idiomatic in Prisma/Postgres for this use case).

### D2: Status transitions are server-side only — no direct client status writes
Status is never written directly by the client after initial creation. All transitions happen in service methods triggered by events (PurchaseRequest created, PurchaseRequest approved, WarehouseReceipt/Issue linked). This prevents out-of-order status updates.

Exception: the existing admin "manual override" edit path in `updateSupplyRequest` will be removed for `trangThai` — status becomes read-only from the client perspective.

### D3: Single PurchaseRequest per SupplyRequest
All items from a supply request are grouped into one purchase request. This matches the current 1-to-many `supplyRequests → purchaseRequests` schema (a supply request already has a `purchaseRequests` relation array). The auto-transition to "Đang xử lý" fires on the first PurchaseRequest linked to a SupplyRequest.

### D4: "Đã cung cấp" triggers when any WarehouseReceipt or WarehouseIssue is linked
The `warehouseReceipts` relation on SupplyRequest already exists. When a new WarehouseReceipt or WarehouseIssue referencing the supply request is created, the service sets status to "Đã cung cấp". The requirement "ALL items fulfilled" is approximated by "a warehouse document has been created for this request" — full per-item quantity tracking is a future enhancement outside this scope.

### D5: Backfill migration — copy then drop
Migration sequence:
1. Add new `supply_request_items` table
2. Run data migration: for each existing `supply_requests` row with non-null `phanLoai`/`tenGoi`/`soLuong`/`donViTinh`, insert one row into `supply_request_items`
3. Same for `purchase_request_items`
4. Drop old columns from `supply_requests` and `purchase_requests`

This is a single Prisma migration file with raw SQL steps for the data copy.

### D6: Notification types added to existing constants file
New constants `SUPPLY_REQUEST_PROCESSING`, `SUPPLY_REQUEST_APPROVED`, `SUPPLY_REQUEST_FULFILLED` are added to `notification.types.ts`. The existing `SUPPLY_REQUEST` constant is kept for the creation notification.

### D7: Frontend item rows use local state array — no intermediate API calls
The multi-item form in `SupplyRequestModal` and `CreatePurchaseRequestModal` manages item rows as local React state. The full items array is submitted in a single POST/PUT. No per-item save endpoints are needed.

## Risks / Trade-offs

- [Migration data loss] If a supply request has `phanLoai` but null `soLuong`, the backfill inserts a row with `soLuong: null` which violates future NOT NULL constraints → Mitigation: migration sets `soLuong` default 0 and `donViTinh` default '' for backfill rows; review existing data before deploying
- [Status irreversibility] Once status advances it cannot go back. If a PurchaseRequest is deleted after being approved, the supply request stays at "Đã duyệt mua" → Mitigation: document as known limitation; future work can add a revert mechanism
- [Breaking API change] Removing single-item fields from request bodies will break any existing API consumers (e.g., scripts, Postman collections, other frontend code reading `item.phanLoai` directly) → Mitigation: communicate breaking change; update all frontend service types in the same PR
- [Form UX complexity] Multi-row forms with per-row validation increase frontend complexity → Mitigation: keep row validation simple (non-empty tenGoi and soLuong > 0); show inline row errors

## Migration Plan

1. Create Prisma migration (`add_multi_item_supply_purchase`) with:
   - Create `supply_request_items` table
   - Create `purchase_request_items` table
   - Add `nhaCungCapId`, `ghiChuMuaHang` columns to `purchase_requests`
   - Raw SQL: backfill items from existing header columns
   - Drop `phanLoai`, `tenGoi`, `soLuong`, `donViTinh` from `supply_requests`
   - Drop `phanLoai`, `tenHangHoa`, `soLuong`, `donViTinh` from `purchase_requests`
2. Deploy backend with updated Prisma client
3. Deploy frontend (components already expect `items` array)

Rollback: restore dropped columns from backup; the backfill is one-directional. A pre-migration database snapshot is required.

## Open Questions

- Should `giaDuKien` (estimated price) live on `PurchaseRequestItem` per line or on `PurchaseRequest` header? Decision taken: per request header for now (one supplier = one price negotiated for the whole order). Revisit if multi-supplier per request is needed later.
- Should the "Đã cung cấp" trigger check that quantities match, or just that any warehouse document exists? Decision taken: any warehouse document for simplicity (see D4).
