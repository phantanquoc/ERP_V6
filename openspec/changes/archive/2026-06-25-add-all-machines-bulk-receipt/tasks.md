## 1. Schema & Migration

- [x] 1.1 Thêm field `daNhapKho Boolean @default(false)` vào model `FinishedProduct` trong `backend/prisma/schema/business_production.prisma`
- [x] 1.2 Chạy `npx prisma migrate dev --name add_finished_product_da_nhap_kho` (tạo migration mới trong `backend/prisma/migrations/`)
- [x] 1.3 Chạy `npx prisma generate` để cập nhật Prisma client

## 2. Backend — Service

- [x] 2.1 Trong `backend/src/services/finishedProductService.ts`, sửa `confirmFinishedProductWarehouseReceipt` để set `daNhapKho=true` cho `FinishedProduct` đã nhập kho và throw `ConflictError` nếu `daNhapKho` đã `true`
- [x] 2.2 Thêm method `confirmBulkFinishedProductWarehouseReceipt(maChienList, warehouseId, lotId, userId)`: validate inputs (`ValidationError` nếu empty/missing), lookup tất cả `FinishedProduct` theo `maChien IN (...)`, throw `NotFoundError` nếu mẻ rỗng, throw `ConflictError` nếu bất kỳ FP nào `daNhapKho=true`, sum 8 grades per mẻ, build rows skip grade=0, generate `maPhieuNhap` tuần tự bằng `nextYearlyCode`, gọi `warehouseReceiptService.batchCreate`, set `daNhapKho=true` cho tất cả FP của mẻ — TẤT CẢ trong 1 `prisma.$transaction`
- [x] 2.3 Đảm bảo error messages tiếng Việt và dùng typed errors từ `@utils/errors`

## 3. Backend — Controller & Route

- [x] 3.1 Thêm controller handler `bulkConfirmReceipt` trong `backend/src/controllers/finishedProductController.ts` (HTTP only, gọi service, return shape chuẩn)
- [x] 3.2 Thêm route `POST /bulk-warehouse-receipt` trong `backend/src/routes/finishedProductRoutes.ts` với `authenticate` + RBAC phù hợp (giống endpoint single receipt hiện có)
- [x] 3.3 Xác nhận route đã được đăng ký qua `ROUTE_MAP` trong `backend/src/routes/index.ts` (finishedProductRoutes đã có sẵn → chỉ cần verify endpoint mới được mount)

## 4. Frontend — Service & Hook

- [ ] 4.1 Trong `frontend/src/services/finishedProductService.ts`, thêm types `BulkReceiptPayload`, `BulkReceiptResponse` và function `bulkConfirmWarehouseReceipt(payload)` gọi `POST /finished-products/bulk-warehouse-receipt`
- [ ] 4.2 Trong `frontend/src/hooks/useFinishedProducts.ts`, thêm mutation hook `useBulkConfirmFinishedProductReceipt()` invalidate `finishedProductKeys.lists()`, `warehouseKeys.all`, `lotProductKeys.all` sau success

## 5. Frontend — UI on "Tổng các máy" tab

- [x] 5.1 Trong `frontend/src/components/FinishedProductManagement.tsx`, mở rộng `AggregatedProduct` thêm `daNhapKho: boolean` (= all FP của mẻ đã `daNhapKho=true`)
- [x] 5.2 Thêm cột checkbox + header "select all" chỉ khi `selectedMachineSystemId === TOTAL_ALL_MACHINES`; default tick các mẻ chưa nhập kho; disable checkbox cho mẻ đã nhập kho
- [x] 5.3 Thêm nút "Nhập kho toàn bộ" ở header tab, disabled khi không có row nào được tick; mở `FinishedProductWarehouseReceiptModal` với prop bulk
- [x] 5.4 Thêm action "Điều chỉnh" trên từng aggregate row, disabled khi `daNhapKho=true`; mở modal "Mở rộng sửa từng máy"
- [x] 5.5 Render aggregate row dimmed (e.g. opacity/text-gray) khi `daNhapKho=true`

## 6. Frontend — Receipt Modal & Per-machine Adjust Modal

- [x] 6.1 Mở rộng `frontend/src/components/FinishedProductWarehouseReceiptModal.tsx` để hỗ trợ bulk mode: nhận `maChienList` + danh sách sum-grade rows per mẻ; chia thành sections per mẻ với rows pre-filled từ sum cross-machine, skip grade=0; vẫn dùng một bộ warehouse/lot selector
- [x] 6.2 Submit ở bulk mode gọi `useBulkConfirmFinishedProductReceipt` với `{ maChienList, warehouseId, lotId }`
- [x] 6.3 Tạo modal "Mở rộng sửa từng máy" trong `FinishedProductManagement.tsx` (hoặc component con): list các `FinishedProduct` của `maChien`, mỗi máy 8 inputs grade; submit gọi `updateFinishedProduct` per machine qua `Promise.all`; sau success invalidate query

## 7. Verification (bắt buộc trước khi kết thúc)

- [x] 7.1 `cd backend && npx tsc --noEmit` PHẢI pass [verify]
- [x] 7.2 `cd backend && npm run lint` không có error mới [verify]
- [x] 7.3 `cd backend && npm test` — Jest pass; thêm test cho `confirmBulkFinishedProductWarehouseReceipt` (happy path + conflict + empty list + zero-grade skip) [verify]
- [x] 7.4 `cd frontend && npx tsc --noEmit` PHẢI pass [verify]
- [x] 7.5 `cd frontend && npm run lint` không có error mới [verify]
- [ ] 7.6 Smoke test thủ công: mở tab "Tổng các máy", tick chọn 2 mẻ, "Nhập kho toàn bộ" với 1 kho+1 lô → verify `daNhapKho=true` và row dimmed; "Điều chỉnh" trên một mẻ chưa nhập → sửa khối lượng máy → verify percentages recalculate và `QualityEvaluation` sync [verify]
