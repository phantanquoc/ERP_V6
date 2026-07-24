## Context

Đơn hàng trong hệ thống đi theo luồng `QuotationRequest → Quotation → Order → OrderItem`. `Order` có `trangThaiSanXuat: OrderProductionStatus` bắt đầu bằng `CHO_LEN_KE_HOACH`, nhưng chưa có màn hình/model nào để phòng QLSX lập kế hoạch ngâm. Màn Đánh giá ngâm (`ProductionMaterialEvaluationEntry`) hiện là wizard 4 bước (Nguyên liệu → Thời gian → Thông số → Đánh giá), công nhân tự nhập mọi thông số. `MaterialEvaluation` chỉ liên kết `LotProduct`/`WarehouseIssue`, không nối `Order`. `MaterialStandard` chỉ chứa tỉ lệ thu hồi, không có thông số ngâm.

Ràng buộc dự án (AGENTS.md): multi-schema Prisma (mọi model có `@@schema`), ID cuid, thứ tự implement Prisma→backend(service→controller→route→ROUTE_MAP)→frontend(service→hook→component), response shape chuẩn, typed errors, status forward-only + transition chỉ server-side, frontend dùng hook TanStack Query + query key factory, react-hook-form+zod.

## Goals / Non-Goals

**Goals:**
- Model `SoakingPlan` lưu thông số ngâm mục tiêu gắn `Order`/`OrderItem`/`InternationalProduct`.
- Màn QLSX (route riêng, gate `department="production"`) tạo/sửa/huỷ/liệt kê kế hoạch.
- Màn Đánh giá ngâm bước Thông số hiển thị chia đôi kế hoạch (khớp theo `productId`) / thực tế; lưu không phụ thuộc kế hoạch.

**Non-Goals:**
- KHÔNG đổi cơ chế sinh `maChien`.
- KHÔNG đổi cascade Lô/Kiện ở bước Nguyên liệu.
- KHÔNG tự động advance trạng thái đơn (`CHO_LEN_KE_HOACH → CHO_SAN_XUAT`) — xem Decision 4.
- KHÔNG đụng `MaterialStandard` hay các màn kiosk nhập liệu khác.
- KHÔNG ghi kế hoạch được chọn vào bản ghi `MaterialEvaluation` (chỉ hiển thị đối chiếu ở UI).

## Decisions

### Decision 1: Khớp kế hoạch theo `productId`, không theo `maChien`
`maChien` sinh tuần tự server-side (`MC0001`...), vô nghĩa nghiệp vụ, không mang thông tin đơn/sản phẩm. Khóa khớp duy nhất khả dĩ là `productId` (`InternationalProduct`) mà công nhân chọn ở bước Nguyên liệu. Endpoint `getActiveByProductId(productId)` trả các kế hoạch `HIEU_LUC`.
- *Alternative đã loại*: khớp qua `maChien` — bất khả thi vì mã sinh sau và không liên quan đơn.

### Decision 2: Enum `SoakingPlanStatus = { HIEU_LUC, DA_DUNG, HUY }`
- `HIEU_LUC`: mặc định khi tạo; là kế hoạch dùng để đối chiếu.
- `DA_DUNG`: dành cho tương lai (đánh dấu đã tiêu thụ) — hiện KHÔNG có transition tự động nào set trạng thái này; chỉ khai báo để tránh migration lần sau. Truy vấn hiệu lực chỉ lọc `HIEU_LUC`.
- `HUY`: QLSX huỷ thủ công; loại khỏi danh sách hiệu lực.
- Trạng thái đổi chỉ qua service method (không expose `PATCH /status` chung), theo quy ước dự án.
- *Alternative đã loại*: chỉ boolean `active` — enum rõ nghĩa hơn và mở đường cho `DA_DUNG`.

### Decision 3: Xử lý nhiều kế hoạch `HIEU_LUC` cùng `productId`
Một sản phẩm có thể thuộc nhiều đơn cùng lúc → nhiều kế hoạch hiệu lực. Endpoint trả về TẤT CẢ kế hoạch `HIEU_LUC`; UI công nhân: nếu 1 → tự đổ vào cột kế hoạch; nếu >1 → hiển thị chọn nhanh (dropdown/segmented) để công nhân chọn đúng kế hoạch; nếu 0 → ẩn cột kế hoạch.
- *Alternative đã loại*: auto-chọn kế hoạch mới nhất — rủi ro chọn sai đơn; để công nhân quyết định an toàn hơn.

### Decision 4: KHÔNG tự động advance trạng thái đơn khi tạo kế hoạch
Việc tạo kế hoạch ngâm KHÔNG tự chuyển `Order.trangThaiSanXuat` từ `CHO_LEN_KE_HOACH` sang `CHO_SAN_XUAT`. Lý do: transition trạng thái đơn là nghiệp vụ riêng, forward-only, và spec hiện chỉ yêu cầu "tạo được kế hoạch" — gắn thêm side-effect chuyển trạng thái sẽ vượt scope và khó rollback. Đơn vẫn có thể được chọn lại để sửa kế hoạch.
- *Alternative đã loại*: auto-advance sang `CHO_SAN_XUAT` — vượt scope, cần thêm quyết định nghiệp vụ.

### Decision 5: Denormalize `maSanPham`/`tenSanPham` vào `SoakingPlan`
Theo convention hiện có (Order, OrderItem, Quotation... đều denormalize tên/mã), lưu `maSanPham`+`tenSanPham` để hiển thị nhanh không cần join, đồng thời giữ `productId` làm khóa khớp chuẩn.

### Decision 6: Vị trí model + route
- Model đặt trong `business_production.prisma` (cùng nơi `MaterialEvaluation`), `@@schema("business")`.
- Route QLSX theo pattern `ProtectedSubRoute department="production" subModule="planning"` trong `App.tsx` (giống `/production/management|data|warehouse`).

## Risks / Trade-offs

- **Denormalized `tenSanPham` lệch khi đổi tên sản phẩm** → Chấp nhận (snapshot tại thời điểm lập kế hoạch); `productId` luôn là nguồn chuẩn khi cần join.
- **Nhiều kế hoạch hiệu lực gây rối cho công nhân** → Mitigation: UI chọn nhanh rõ ràng (hiển thị đơn/khối lượng để phân biệt); mặc định không auto-chọn.
- **Migration trên schema `business` nhiều bảng** → Mitigation: chỉ thêm bảng + cột quan hệ mới (không sửa cột cũ), backup DB trước khi chạy prod; `prisma migrate dev` ở dev trước.
- **Đơn đổi trạng thái sau khi đã có kế hoạch** → kế hoạch vẫn tồn tại; truy vấn hiệu lực chỉ lọc theo `trangThai` của kế hoạch, không phụ thuộc trạng thái đơn, nên không vỡ.

## Migration Plan

1. Thêm model `SoakingPlan` + enum `SoakingPlanStatus` + quan hệ ngược vào `Order`/`InternationalProduct` trong `business_production.prisma` (và `business_orders.prisma` cho reverse relation nếu Prisma yêu cầu).
2. `npx prisma migrate dev --name add_soaking_plan` → `npx prisma generate`.
3. Deploy backend → frontend. Không có dữ liệu cũ cần backfill (bảng mới).
4. Rollback: revert migration (drop bảng `soaking_plans` + enum) — an toàn vì không sửa dữ liệu bảng khác.

## Open Questions

- Chưa có: tất cả điểm mờ nghiệp vụ đã chốt trong explore (nội dung kế hoạch, phạm vi, cách khớp, vị trí màn, xử lý trùng). `DA_DUNG` để dành tương lai, không dùng lần này.
