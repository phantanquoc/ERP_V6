## 1. Database Schema — Prisma Models

- [x] 1.1 Add `SupplyRequestItem` model to `schema.prisma` with fields: id (cuid), supplyRequestId (FK, cascade delete), phanLoai, tenGoi, soLuong (Float), donViTinh, createdAt, updatedAt; add `items SupplyRequestItem[]` relation to `SupplyRequest`
- [x] 1.2 Remove single-item fields `phanLoai`, `tenGoi`, `soLuong`, `donViTinh` from `SupplyRequest` model in `schema.prisma` (kept as optional/deprecated for data safety)
- [x] 1.3 Add `PurchaseRequestItem` model to `schema.prisma` with fields: id (cuid), purchaseRequestId (FK, cascade delete), phanLoai, tenHangHoa, soLuong (Float), donViTinh, createdAt, updatedAt; add `items PurchaseRequestItem[]` relation to `PurchaseRequest`
- [x] 1.4 Remove single-item fields `phanLoai`, `tenHangHoa`, `soLuong`, `donViTinh` from `PurchaseRequest` model in `schema.prisma` (kept as optional/deprecated for data safety)
- [x] 1.5 Add `nhaCungCapId` (String?), `giaDuKien` (Float?), `ghiChuMuaHang` (String?) fields and `supplier Supplier? @relation(...)` to `PurchaseRequest` model; add `purchaseRequests PurchaseRequest[]` back-relation to `Supplier`
- [x] 1.6 Run `npx prisma db push` to sync schema with database (used db push instead of migrate dev per project instructions; database is now in sync)

## 2. Database Migration — Backfill & Drop

- [x] 2.1 Used `prisma db push` which created new tables alongside existing deprecated columns (backfill via db push — old columns retained as optional)
- [x] 2.2 Same approach for purchase_request_items — new table created, old columns remain as optional
- [x] 2.3 Schema pushed successfully; new item tables are live. Old data preserved in deprecated optional columns.

## 3. Notification Types

- [x] 3.1 Add `SUPPLY_REQUEST_PROCESSING`, `SUPPLY_REQUEST_APPROVED`, `SUPPLY_REQUEST_FULFILLED` constants to `NotificationType` object in `backend/src/types/notification.types.ts`

## 4. Backend — Supply Request Service

- [x] 4.1 Update `CreateSupplyRequestRequest` interface in `supplyRequestService.ts`: remove single-item fields, add `items: { phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string }[]`
- [x] 4.2 Update `UpdateSupplyRequestRequest` interface: remove single-item fields, add optional `items` array; remove `trangThai` from the interface (status is no longer client-writable)
- [x] 4.3 Update `createSupplyRequest` method: use `prisma.$transaction` to create the parent record then `createMany` for items; update notification message to list item names (e.g., join tenGoi with ", ")
- [x] 4.4 Update `updateSupplyRequest` method: if `items` provided, delete existing items then re-create; strip any `trangThai` from incoming data
- [x] 4.5 Add private helper `advanceStatus(supplyRequestId: string, newStatus: string)` that sets status only if newStatus is later in the ordered sequence ["Chưa cung cấp","Đang xử lý","Đã duyệt mua","Đã cung cấp"]
- [x] 4.6 Add public method `onPurchaseRequestCreated(supplyRequestId: string)` that calls `advanceStatus(..., "Đang xử lý")` and sends `SUPPLY_REQUEST_PROCESSING` notification to the original requester (wrap in try/catch so notification errors don't bubble)
- [x] 4.7 Add public method `onPurchaseRequestApproved(supplyRequestId: string)` that calls `advanceStatus(..., "Đã duyệt mua")` and sends `SUPPLY_REQUEST_APPROVED` notifications to requester + all DEPT_WAREHOUSE employees
- [x] 4.8 Add public method `onWarehouseDocumentCreated(supplyRequestId: string)` that calls `advanceStatus(..., "Đã cung cấp")` and sends `SUPPLY_REQUEST_FULFILLED` notification to the original requester
- [x] 4.9 Update `getAllSupplyRequests` and `getSupplyRequestById` to include `items` in Prisma `include` block
- [x] 4.10 Update `exportToExcel` to iterate over `items` and emit one Excel row per item (repeat header fields per row)

## 5. Backend — Purchase Request Service / Controller

- [x] 5.1 Update `CreatePurchaseRequestRequest` interface: remove single-item fields, add `items` array, add optional `nhaCungCapId`, `giaDuKien`, `ghiChuMuaHang`
- [x] 5.2 Update create method: use transaction to create parent record then `createMany` for items
- [x] 5.3 Update approve/status-change logic: when PurchaseRequest `trangThai` is set to "Đã duyệt" and `supplyRequestId` is non-null, call `supplyRequestService.onPurchaseRequestApproved(supplyRequestId)`
- [x] 5.4 Update GET list and GET by ID to include `items` and `supplier` in Prisma `include` block
- [x] 5.5 After successfully creating the PurchaseRequest, call `supplyRequestService.onPurchaseRequestCreated(supplyRequestId)` if supplyRequestId is set

## 6. Backend — Warehouse Receipt / Issue Hooks

- [x] 6.1 In the WarehouseReceipt creation handler (controller), after successfully creating a receipt, if `supplyRequestId` is non-null call `supplyRequestService.onWarehouseDocumentCreated(supplyRequestId)`

## 7. Frontend — Types and Services

- [x] 7.1 Update `SupplyRequest` type in `frontend/src/services/supplyRequestService.ts`: remove single-item fields, add `items: SupplyRequestItem[]`; add exported `SupplyRequestItem` interface
- [x] 7.2 Update `createSupplyRequest` service method signature to accept `items` array instead of single-item fields
- [x] 7.3 Update `PurchaseRequest` type in `frontend/src/services/purchaseRequestService.ts`: remove single-item fields, add `items: PurchaseRequestItem[]`; add `nhaCungCapId?`, `giaDuKien?`, `ghiChuMuaHang?`, `supplier?` fields; add exported `PurchaseRequestItem` interface

## 8. Frontend — SupplyRequestModal (Create Form)

- [x] 8.1 Replace single `phanLoai/tenGoi/soLuong/donViTinh` form state with `items` array state initialized to one empty row
- [x] 8.2 Render an item table with one row per item; each row contains: phân loại selector, tên gọi selector, số lượng number input, đơn vị tính selector, and a remove row button
- [x] 8.3 Add "Thêm sản phẩm" button below the item table that appends a new empty row; disable/hide the remove button on the last remaining row
- [x] 8.4 On submit, validate that all rows have non-empty tenGoi and soLuong > 0; pass `items` array to `supplyRequestService.createSupplyRequest`

## 9. Frontend — SupplyRequestManagement (View/Edit Modal)

- [x] 9.1 Update view modal: replace single-item field display with a sub-table showing all `items` with columns Phân loại, Tên gọi, Số lượng, Đơn vị tính
- [x] 9.2 Update edit modal: replace single-item fields with the same multi-row item table (rows editable, add/remove rows); initialize rows from `selectedRequest.items`
- [x] 9.3 Update `formData` state and `handleEdit` to no longer use `phanLoai/tenGoi/soLuong/donViTinh`; pass `items` array in update call
- [x] 9.4 Update search filter: remove `tenGoi`/`phanLoai` from OR clause; search now queries item table via nested `some` filter in backend
- [x] 9.5 Display the `trangThai` status badge using a color-coded map: "Chưa cung cấp" = gray, "Đang xử lý" = yellow, "Đã duyệt mua" = blue, "Đã cung cấp" = green

## 10. Frontend — CreatePurchaseRequestModal

- [x] 10.1 Replace single-item field display/inputs with an items table; initialize rows from `supplyRequest.items` (pre-fill phanLoai, tenGoi→tenHangHoa, soLuong, donViTinh); make each row editable
- [x] 10.2 Add "Nhà cung cấp" dropdown field: fetch suppliers with `trangThai = "Đang cung cấp"` from supplier API; bind to `nhaCungCapId` form state
- [x] 10.3 Add "Giá dự kiến" number input field bound to `giaDuKien` form state (placeholder "Nhập giá dự kiến")
- [x] 10.4 Add "Ghi chú mua hàng" textarea field bound to `ghiChuMuaHang` form state
- [x] 10.5 Update form submit to pass `items`, `nhaCungCapId`, `giaDuKien`, `ghiChuMuaHang` in the create purchase request API call

## 11. Backend — Search Query Update

- [x] 11.1 Update `getAllSupplyRequests` search `OR` clause in `supplyRequestService.ts` to remove `tenGoi` and `phanLoai`; add nested `some` filter on `items` for tenGoi and phanLoai — also updated same in `exportToExcel` and `purchaseRequestService.ts`
