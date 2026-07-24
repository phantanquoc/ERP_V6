## Why

Công nhân vào màn Đánh giá ngâm và tự nhập mọi thông số ngâm từ đầu, không có "chuẩn" nào để đối chiếu. Đơn hàng đã có trạng thái `CHO_LEN_KE_HOACH` ("chờ lên kế hoạch") nhưng hệ thống chưa có nơi nào để phòng Quản lý sản xuất (QLSX) thực sự lập kế hoạch ngâm. Feature này lấp mắt xích còn thiếu: QLSX đặt thông số ngâm mục tiêu dựa trên đơn hàng, và công nhân đối chiếu kế hoạch với thực tế ngay khi nhập liệu.

## What Changes

- Thêm model `SoakingPlan` (kế hoạch ngâm) trong schema `business`: lưu thông số ngâm mục tiêu (`soLanNgam`, `nhietDoNuocTruocNgam`, `nhietDoNuocSauVot`, `thoiGianNgam`, `brixNuocNgam`, `khoiLuong`) gắn với một `Order` + `OrderItem` + `InternationalProduct`. Kèm enum `SoakingPlanStatus`.
- Backend: service → controller → route → đăng ký ROUTE_MAP cho CRUD kế hoạch ngâm; endpoint liệt kê đơn hàng nguồn (`trangThaiSanXuat = CHO_LEN_KE_HOACH`) kèm items; endpoint lấy kế hoạch hiệu lực theo `productId`.
- Frontend — màn QLSX mới (route riêng, gate `department="production"`): chọn đơn hàng chờ lên kế hoạch → chọn sản phẩm nguyên liệu trong đơn → nhập thông số ngâm mục tiêu → lưu.
- Frontend — màn Đánh giá ngâm (`ProductionMaterialEvaluationEntry`), bước 4 (Thông số): chuyển sang layout chia đôi — cột trái hiện thông số kế hoạch (khớp theo `productId`; nếu nhiều kế hoạch hiệu lực thì công nhân chọn nhanh), cột phải là ô nhập thực tế hiện có.
- Việc lưu đánh giá KHÔNG bắt buộc phải có kế hoạch — không có kế hoạch thì cột trái ẩn, nhập như cũ.

## Capabilities

### New Capabilities
- `soaking-plan`: QLSX tạo/sửa/liệt kê kế hoạch ngâm (thông số mục tiêu) dựa trên đơn hàng; truy vấn kế hoạch hiệu lực theo sản phẩm; màn công nhân đối chiếu kế hoạch với thực tế khi đánh giá ngâm.

### Modified Capabilities
<!-- Không thay đổi requirement của capability hiện có. MaterialEvaluation chỉ được đọc thêm để đối chiếu, không đổi hành vi lưu. -->

## Impact

- **Database**: model mới `SoakingPlan` + enum `SoakingPlanStatus` trong `backend/prisma/schema/business_production.prisma`; quan hệ ngược thêm vào `Order` và `InternationalProduct`. Cần migration (`prisma migrate dev`) + `prisma generate`.
- **Backend**: `soakingPlanService.ts`, controller, route mới; đăng ký trong `backend/src/routes/index.ts` (ROUTE_MAP). Không đụng `materialEvaluationService` (generateMaChien giữ nguyên).
- **Frontend**: service types + hook (TanStack Query) + component màn QLSX mới; route mới trong `App.tsx` (`ProtectedSubRoute department="production"`); sửa bước 4 trong `ProductionMaterialEvaluationEntry.tsx`.
- **Out of scope**: KHÔNG đổi `generateMaChien`; KHÔNG đổi cascade Lô/Kiện ở bước 2; KHÔNG tự động advance trạng thái đơn (`CHO_LEN_KE_HOACH → CHO_SAN_XUAT`) trừ khi design.md quyết định rõ; KHÔNG đụng `MaterialStandard` và các màn kiosk nhập liệu khác.
