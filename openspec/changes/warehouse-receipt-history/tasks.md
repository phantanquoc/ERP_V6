# Tasks: Warehouse Receipt History & Drill-Down

## 1. Schema + Migration

- [ ] 1.1 Thêm `mucDich String?` vào model `WarehouseReceipt` trong `backend/prisma/schema/business_production.prisma`
- [ ] 1.2 Chạy `npx prisma migrate dev --name add_warehouse_receipt_muc_dich` để tạo migration
- [ ] 1.3 Chạy `npx prisma generate` để regenerate Prisma client

## 2. Backend — Service

- [ ] 2.1 Cập nhật interface `CreateReceiptInput` trong `warehouseReceiptService.ts` — thêm `mucDich?: string`
- [ ] 2.2 Cập nhật interface `UpdateReceiptInput` — thêm `mucDich?: string`
- [ ] 2.3 Cập nhật method `create()` — truyền `mucDich` vào `prisma.warehouseReceipt.create()`
- [ ] 2.4 Cập nhật method `update()` — truyền `mucDich` vào `prisma.warehouseReceipt.update()`
- [ ] 2.5 Thêm method `getByLotProduct(lotProductId: string)` — verify lotProduct tồn tại, query `warehouseReceipt.findMany({ where: { lotProductId }, orderBy: { ngayNhap: 'asc' } })`

## 3. Backend — Controller & Route

- [ ] 3.1 Thêm handler `getLotProductReceiptHistory` vào `warehouseReceiptController.ts` (hoặc `lotProductController.ts`) — call `warehouseReceiptService.getByLotProduct(req.params.lotProductId)`, trả về `{ success: true, data: receipts }`
- [ ] 3.2 Đăng ký route `GET /lot-products/:lotProductId/receipt-history` trong `warehouseReceiptRoutes.ts` (hoặc tạo route trong `warehouseRoutes.ts`)
- [ ] 3.3 Verify route xuất hiện trong server logs khi start

## 4. Backend — Verification

- [ ] 4.1 Chạy `cd backend && npx tsc --noEmit` — phải pass, không có lỗi mới
- [ ] 4.2 Chạy `cd backend && npm test` — không có test nào đỏ thêm

## 5. Frontend — Service & Hook

- [ ] 5.1 Thêm type `WarehouseReceiptHistory` vào `frontend/src/services/warehouseService.ts`
- [ ] 5.2 Thêm hàm `getReceiptHistory(lotProductId: string)` vào `warehouseService.ts` — gọi `GET /api/lot-products/:lotProductId/receipt-history`
- [ ] 5.3 Thêm query key `receiptHistory: (lotProductId: string) => [...]` vào `warehouseKeys` trong `useWarehouses.ts`
- [ ] 5.4 Thêm hook `useReceiptHistory(lotProductId: string | null)` vào `useWarehouses.ts` — `enabled: !!lotProductId`

## 6. Frontend — Form nhập kho (mucDich field)

- [ ] 6.1 Thêm `mucDich: ''` vào form state của modal nhập kho trong `WarehouseManagement.tsx`
- [ ] 6.2 Thêm input text "Mục đích nhập" (label + `<input>` hoặc `<textarea>`) vào JSX modal nhập kho — optional, không required
- [ ] 6.3 Truyền `mucDich` vào payload khi gọi `addProductToLot` mutation

## 7. Frontend — Modal lịch sử (drill-down)

- [ ] 7.1 Thêm state `historyLotProduct: LotProduct | null` vào `WarehouseManagement.tsx`
- [ ] 7.2 Wrap ô `soLuong` trong bảng sản phẩm của lô bằng `<button>` có `onClick={() => setHistoryLotProduct(lp)}`
- [ ] 7.3 Render `Modal` "Lịch sử nhập kho — {tenSanPham}" khi `historyLotProduct !== null`
- [ ] 7.4 Trong modal, dùng `useReceiptHistory(historyLotProduct?.id)` để fetch dữ liệu
- [ ] 7.5 Render loading spinner khi `isLoading`, error message + nút retry khi `isError`, empty state khi `data.length === 0`
- [ ] 7.6 Render bảng với các cột: Mã phiếu | Ngày nhập (DD/MM/YYYY HH:mm) | Người nhập | Mục đích | Số lượng nhập | Tồn trước | Tồn sau | Ghi chú

## 8. Frontend — Verification

- [ ] 8.1 Chạy `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — không được có lỗi `TS2304`, tổng lỗi không tăng quá 610
- [ ] 8.2 Chạy `cd frontend && npm run lint` — pass
