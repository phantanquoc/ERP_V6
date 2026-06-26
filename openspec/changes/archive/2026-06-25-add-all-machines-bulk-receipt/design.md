## Context

Hệ thống ERP An Binh Foods quản lý đầu ra của 5–8 máy sấy trái cây. Mỗi mẻ (`maChien`) chạy song song trên nhiều máy; mỗi bản ghi `FinishedProduct` chia ra 8 grade khối lượng (A, B, B Dầu, C, vụn lớn, vụn nhỏ, phế phẩm, ướt). Hiện tại quản lý có thể xem tổng hợp theo mẻ ở tab "Tổng các máy" nhưng tab này chỉ là view chỉ đọc — không điều chỉnh được, không nhập kho được. Quản lý phải mở từng máy, sửa số, rồi nhập kho từng `FinishedProduct` qua `FinishedProductWarehouseReceiptModal` đã có.

**Codebase hiện tại đã có:**
- `confirmFinishedProductWarehouseReceipt(finishedProductId, warehouseId, lotId, rows, userId)` cho single-product receipt.
- `updateFinishedProduct(id, data, userId)` recalculate `tongKhoiLuong` + 8 percentages + sync `QualityEvaluation`.
- `warehouseReceiptService.batchCreate` để tạo nhiều rows nhập kho trong 1 transaction.
- `nextYearlyCode(lastCode, 'PN', year)` để generate `maPhieuNhap` tuần tự.
- Sentinel `TOTAL_ALL_MACHINES = '__TOTAL_ALL_MACHINES__'` + `aggregatedByMaChien` memo ở `FinishedProductManagement.tsx`.

## Goals / Non-Goals

**Goals:**
- Cho phép quản lý từ tab "Tổng các máy" tick chọn nhiều mẻ và nhập kho một lần vào CHUNG một kho + CHUNG một lô.
- Cho phép sửa khối lượng gốc của mẻ bằng cách mở rộng từng máy thuộc mẻ đó (không suy diễn auto theo tỉ lệ).
- Chống nhập kho 2 lần bằng cờ `daNhapKho` trên `FinishedProduct`.
- Tái sử dụng tối đa code/spec đã có (`updateFinishedProduct`, `warehouseReceiptService.batchCreate`, `FinishedProductWarehouseReceiptModal`).

**Non-Goals:**
- KHÔNG tự động chia tỉ lệ khi sửa tổng (đã chốt: "Mở rộng sửa từng máy").
- KHÔNG consolidate theo loại sản phẩm — vẫn group theo `maChien`.
- KHÔNG cho phép chọn nhiều kho/lô khác nhau trong 1 lần bulk receipt.
- KHÔNG thêm endpoint `PATCH /status` chung cho `FinishedProduct`.
- KHÔNG roll back: mẻ đã đánh dấu `daNhapKho=true` không cho un-receipt qua UI bulk.

## Decisions

### D1. Schema: thêm field `daNhapKho` thay vì soft-mark từ side table
- **Chọn**: Thêm `daNhapKho Boolean @default(false)` trực tiếp vào `FinishedProduct`.
- **Alternative**: Tạo join table `FinishedProductReceiptStatus`.
- **Rationale**: Một-một với `FinishedProduct`, đọc nhanh trong list query, không cần join. Default `false` an toàn cho data cũ. Migration chỉ thêm column, không phá hủy.

### D2. Bulk receipt API: nhận `maChien[]` thay vì `finishedProductId[]`
- **Chọn**: Endpoint nhận `{ maChienList: string[], warehouseId, lotId }`. Service tự lookup tất cả `FinishedProduct` thuộc các mẻ này (cross-machine) → sum 8 grades → build rows → gọi `batchCreate` → set `daNhapKho=true` cho ALL FP của các mẻ đó.
- **Alternative**: Nhận `finishedProductId[]` raw.
- **Rationale**: Aggregate semantically là theo mẻ. Nếu client gửi FP ids, có thể quên một máy trong mẻ → data không khớp với cái UI hiển thị. Nhận `maChien` ép service phải gom toàn bộ máy của mẻ, đảm bảo nhất quán.

### D3. "Điều chỉnh" reuse `updateFinishedProduct` per machine
- **Chọn**: Modal "Mở rộng sửa từng máy" hiển thị danh sách máy của mẻ đó, mỗi máy 8 ô input. Submit → frontend gọi `updateFinishedProduct(id, ...)` tuần tự (hoặc Promise.all) cho từng máy.
- **Alternative**: Tạo endpoint mới `PATCH /finished-products/by-machien/:maChien`.
- **Rationale**: Tránh duplicate logic recalculate tỉ lệ + sync `QualityEvaluation`. Endpoint hiện đã đúng và tested.

### D4. Skip-zero rule kế thừa từ `buildReceiptRowsForFinishedProduct`
- **Chọn**: Service bulk gọi logic tương đương `buildReceiptRowsForFinishedProduct` nhưng trên dữ liệu sum cấp mẻ. Grade nào sum = 0 thì skip row.
- **Rationale**: Cùng quy tắc với receipt single → consistent.

### D5. Receipt code generation tuần tự trong transaction
- **Chọn**: Trước loop tạo receipts, query `lastCode` 1 lần, sau đó dùng `nextYearlyCode(lastCode, 'PN', year)` lặp và update biến `lastCode` mỗi vòng. Set `daNhapKho=true` cùng transaction.
- **Rationale**: Đảm bảo không trùng `maPhieuNhap` cho bulk operation. Transactional → rollback nếu một step lỗi.

### D6. UI: tick checkbox và nút bulk chỉ hiện ở tab "Tổng các máy"
- **Chọn**: Khi `selectedMachineSystemId === TOTAL_ALL_MACHINES`, render thêm cột checkbox + select-all + nút "Nhập kho toàn bộ" + nút "Điều chỉnh" per row.
- **Rationale**: Tab cá nhân máy vẫn hoạt động như cũ — không phá vỡ flow hiện có.

## Risks / Trade-offs

- **Risk**: Concurrent bulk receipt từ 2 user cho cùng `maChien` → có thể tạo 2 phiếu nhập kho trùng.
  - **Mitigation**: Đặt việc set `daNhapKho=true` + tạo receipts trong cùng `prisma.$transaction`. Check trong transaction: nếu bất kỳ FP nào của mẻ đã `daNhapKho=true` thì throw `ConflictError`.
- **Risk**: User chọn warehouse/lot không khớp `tenHangHoa` của các mẻ.
  - **Mitigation**: Validate `warehouseId` và `lotId` tồn tại; phụ thuộc vào logic của `warehouseReceiptService.batchCreate` để khớp lot-product. Hiển thị preview rows trong modal để user xác nhận trước khi submit.
- **Trade-off**: Modal "Mở rộng sửa từng máy" gọi N request `updateFinishedProduct`.
  - **Impact**: Chấp nhận — số máy/mẻ thường ≤ 8. Có thể parallelize bằng `Promise.all`. Nếu sau này thấy bottleneck mới gom thành endpoint bulk update.

## Migration Plan

1. **Schema**: Thêm `daNhapKho Boolean @default(false)` vào `FinishedProduct` trong `business_production.prisma`.
2. **Migration**: `npx prisma migrate dev --name add_finished_product_da_nhap_kho`. Vì có default → data cũ tự fill `false`.
3. **Backfill (optional)**: Nếu prod đã có FP đã nhập kho thì có thể chạy script set `daNhapKho=true` cho FP có warehouse receipt liên quan (out-of-scope cho change này, dev decide tại deploy).
4. **Rollback**: Nếu rollback, có thể giữ column (orphan) — không phá compatibility.

## Open Questions

- Có cần thêm UI để xem "phiếu nhập kho liên quan" cho mẻ đã `daNhapKho=true` không? — **Tạm thời không**, scope chốt là chỉ dimmed + untickable. Có thể mở change tiếp theo nếu user yêu cầu.
