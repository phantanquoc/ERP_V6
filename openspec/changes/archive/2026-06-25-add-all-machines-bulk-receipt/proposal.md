## Why

Quản lý cần nhìn khách quan đầu ra của toàn bộ hệ thống máy sấy theo từng mẻ (`maChien`) và thực hiện điều chỉnh khối lượng gốc + nhập kho hàng loạt mà không phải mở từng máy. Hiện tại tab "Tổng các máy" chỉ là view chỉ đọc; không có nút điều chỉnh, không có nút nhập kho, dẫn đến phải lặp lại thao tác trên từng máy và dễ sai lệch số liệu giữa các máy.

## What Changes

- Mở rộng tab "Tổng các máy" trong `FinishedProductManagement.tsx`:
  - Hiện tick chọn nhiều mẻ (default = tất cả mẻ chưa nhập kho).
  - Hiện một nút **"Nhập kho toàn bộ"** ở header; mẻ đã nhập kho hiển thị dimmed và không tick được.
  - Hiện hành động **"Điều chỉnh"** trên từng dòng mẻ: mở modal "Mở rộng sửa từng máy" để chỉnh trực tiếp 8 khối lượng gốc của từng máy thuộc mẻ đó (không tự suy diễn tỉ lệ).
- Thêm cờ `daNhapKho Boolean @default(false)` vào model `FinishedProduct` (Prisma migration mới) để chống nhập kho 2 lần.
- Backend: thêm service method bulk receipt nhận danh sách `maChien` + một `warehouseId` + một `lotId`, tổng hợp 8 khối lượng (skip grade = 0) trên tất cả máy của mỗi mẻ, generate `maPhieuNhap` tuần tự bằng `nextYearlyCode('PN', year)`, gọi `warehouseReceiptService.batchCreate`, set `daNhapKho=true` cho tất cả `FinishedProduct` thuộc các mẻ vừa nhập. Thêm controller + route mới (KHÔNG dùng `PATCH /status`).
- Frontend: thêm service types + TanStack Query mutation hook cho bulk receipt; sau success invalidate query của finished products + warehouse + lot products.
- Tái sử dụng `updateFinishedProduct` hiện có cho luồng "Điều chỉnh từng máy" — không tạo endpoint mới.

## Capabilities

### New Capabilities
<!-- Không thêm capability mới. -->

### Modified Capabilities
- `finished-product-warehouse-receipt`: bổ sung yêu cầu bulk receipt nhiều mẻ cross-machine + field `daNhapKho` + chống nhập kho lặp.
- `production-output-statistics`: bổ sung yêu cầu cho tab "Tổng các máy" — tick chọn nhiều mẻ, điều chỉnh khối lượng gốc per-machine, hiển thị trạng thái đã nhập kho.

## Impact

- **Schema**: `backend/prisma/schema/business_production.prisma` — thêm `daNhapKho` field; migration mới `add_finished_product_da_nhap_kho`.
- **Backend**:
  - `backend/src/services/finishedProductService.ts` — thêm `confirmBulkFinishedProductWarehouseReceipt`.
  - `backend/src/controllers/finishedProductController.ts` — thêm handler `bulkConfirmReceipt`.
  - `backend/src/routes/finishedProductRoutes.ts` + `backend/src/routes/index.ts` — đăng ký endpoint mới `POST /finished-products/bulk-warehouse-receipt`.
- **Frontend**:
  - `frontend/src/services/finishedProductService.ts` — thêm types + API call bulk receipt.
  - `frontend/src/hooks/useFinishedProducts.ts` — thêm mutation hook + invalidation.
  - `frontend/src/components/FinishedProductManagement.tsx` — tick chọn, nút "Nhập kho toàn bộ", hành động "Điều chỉnh".
  - `frontend/src/components/FinishedProductWarehouseReceiptModal.tsx` — mở rộng để hỗ trợ bulk preview rows.
- **Dependencies**: không thêm package; tái sử dụng `warehouseReceiptService.batchCreate`, `nextYearlyCode`.
- **Migration risk**: field mới có default `false` → an toàn cho data cũ.
