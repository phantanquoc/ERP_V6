# Proposal: Warehouse Receipt History & Drill-Down

## Why

Hiện tại `WarehouseReceipt` lưu từng lần nhập kho (người nhập, ngày giờ, số lượng) nhưng thiếu field `mucDich` (mục đích nhập), và UI không có cách nào để xem lịch sử hình thành số lượng tồn của một sản phẩm trong lô. Người quản lý kho không thể trả lời câu "Tổng số 500kg trong lô A đến từ những lần nhập nào?" mà không tra thủ công trong database.

## What Changes

1. **Schema** — Thêm column `mucDich` (optional text) vào `WarehouseReceipt`.
2. **Backend** — Thêm endpoint `GET /api/lot-products/:lotProductId/receipt-history` trả về danh sách phiếu nhập kho của sản phẩm đó, sắp xếp theo thời gian, kèm người nhập + ngày giờ + mục đích + số lượng từng lần + số tồn trước/sau.
3. **Frontend — form nhập kho** — Thêm trường "Mục đích nhập" (text, optional) vào modal nhập kho hiện tại.
4. **Frontend — UI drill-down** — Khi người dùng click vào số lượng tồn (`soLuong`) của một `LotProduct` trong màn hình `WarehouseManagement`, hiển thị modal lịch sử với bảng các lần nhập.

## Capabilities

### New Capabilities
- `lot-product-receipt-history`: Xem lịch sử hình thành số lượng tồn của một sản phẩm trong lô — danh sách phiếu nhập kho, ai nhập, khi nào, mục đích gì, bao nhiêu.

### Modified Capabilities
- `warehouse-receipt-create`: Bổ sung field `mucDich` vào form tạo phiếu nhập kho.

## Impact

- **Schema**: `backend/prisma/schema/business_production.prisma` — thêm `mucDich String?` vào model `WarehouseReceipt`. Migration mới (non-destructive: ADD COLUMN nullable).
- **Backend service**: `backend/src/services/warehouseReceiptService.ts` — thêm method `getByLotProduct(lotProductId)`, cập nhật `create` và `update` nhận `mucDich`.
- **Backend controller**: `backend/src/controllers/warehouseReceiptController.ts` hoặc `lotProductController.ts` — thêm handler cho endpoint mới.
- **Backend route**: `backend/src/routes/warehouseReceiptRoutes.ts` hoặc `warehouseRoutes.ts` — đăng ký route mới.
- **Frontend hook**: `frontend/src/hooks/useWarehouses.ts` — thêm `useReceiptHistory(lotProductId)`.
- **Frontend service**: `frontend/src/services/warehouseService.ts` — thêm hàm fetch lịch sử.
- **Frontend component**: `frontend/src/components/WarehouseManagement.tsx` — thêm field `mucDich` vào form nhập + modal drill-down.
- **Không ảnh hưởng**: `WarehouseIssue`, `SupplyRequest`, auth, các module khác.

## Assumed

- `mucDich` là text tự do (không dropdown), optional — người nhập có thể bỏ trống.
- Lịch sử chỉ hiển thị phiếu **nhập** (`WarehouseReceipt`), không lẫn phiếu xuất — xuất là chiều ngược lại, scope riêng.
- Click vào số lượng tồn mở modal (không navigate sang trang mới).
- Dữ liệu cũ (trước khi có `mucDich`) hiển thị "—" ở cột mục đích.
- Không thêm pagination cho modal lịch sử — nếu lô có > 100 lần nhập thì hiển thị hết (thực tế rất hiếm).
