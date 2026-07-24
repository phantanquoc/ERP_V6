## 1. Database (Prisma)

- [x] 1.1 Thêm enum `SoakingPlanStatus { HIEU_LUC, DA_DUNG, HUY }` với `@@schema("business")` trong `backend/prisma/schema/business_production.prisma`
- [x] 1.2 Thêm model `SoakingPlan` trong `business_production.prisma`: `id String @id @default(cuid())`, `orderId`, `orderItemId`, `productId`, `maSanPham`, `tenSanPham`, `soLanNgam Int`, `nhietDoNuocTruocNgam Float`, `nhietDoNuocSauVot Float`, `thoiGianNgam Int`, `brixNuocNgam Float`, `khoiLuong Float`, `trangThai SoakingPlanStatus @default(HIEU_LUC)`, `createdById String?`, `createdAt`, `updatedAt`; index `[productId]`, `[trangThai]`, `[orderId]`; `@@map("soaking_plans")`, `@@schema("business")`
- [x] 1.3 Thêm quan hệ `order Order @relation(...)` + `product InternationalProduct @relation(...)` trong `SoakingPlan`, và quan hệ ngược `soakingPlans SoakingPlan[]` vào model `Order` và `InternationalProduct` (`business_orders.prisma`)
- [x] 1.4 Chạy `npx prisma migrate dev --name add_soaking_plan` và `npx prisma generate` ← (verify: migration chạy không lỗi, Prisma client có type `SoakingPlan` + `SoakingPlanStatus`, mọi model mới có @@schema)

## 2. Backend — Service

- [x] 2.1 Tạo `backend/src/services/soakingPlanService.ts`: `createSoakingPlan(data, userId?)` — validate đơn tồn tại và `trangThaiSanXuat = CHO_LEN_KE_HOACH` (nếu không → `ValidationError`), validate đủ thông số bắt buộc, tạo bản ghi `trangThai = HIEU_LUC` với `maSanPham`/`tenSanPham` denormalized từ product
- [x] 2.2 `updateSoakingPlan(id, data)` — cập nhật thông số, giữ nguyên liên kết; `cancelSoakingPlan(id)` — set `trangThai = HUY`; dùng typed errors `@utils/errors` (`NotFoundError`/`ValidationError`)
- [x] 2.3 `listSoakingPlans(page, limit, filters)` — lọc theo `orderId`/`productId`/`trangThai`; `getActiveByProductId(productId)` — trả các kế hoạch `trangThai = HIEU_LUC` theo `productId`
- [x] 2.4 `listPlannableOrders(...)` — trả `Order` có `trangThaiSanXuat = CHO_LEN_KE_HOACH` kèm `items` (dùng cho màn QLSX chọn đơn) ← (verify: chỉ đơn CHO_LEN_KE_HOACH được trả; getActiveByProductId chỉ trả HIEU_LUC)

## 3. Backend — Controller + Route

- [x] 3.1 Tạo `soakingPlanController` (HTTP-only, không chứa business logic) map các method service; mọi response theo shape `{ success, message?, data?, pagination? }`
- [x] 3.2 Tạo route file cho soaking-plan (CRUD + `GET active-by-product/:productId` + `GET plannable-orders`); áp middleware `authenticate` + `authorize`/`checkAccess` phù hợp QLSX/ADMIN
- [x] 3.3 Đăng ký route vào ROUTE_MAP trong `backend/src/routes/index.ts` ← (verify: route mới xuất hiện trong server logs, endpoint trả đúng response shape)

## 4. Frontend — Service + Hook

- [x] 4.1 Tạo `frontend/src/services/soakingPlanService.ts`: types (`SoakingPlan`, `SoakingPlanStatus`, request types) + hàm gọi API qua apiClient (create/update/cancel/list/getActiveByProduct/listPlannableOrders)
- [x] 4.2 Tạo hook `frontend/src/hooks/useSoakingPlans.ts` (TanStack Query) với query key factory `{ all, lists, list(filters), detail(id), activeByProduct(productId), plannableOrders() }`; mutations invalidate `lists()` sau khi tạo/sửa/huỷ

## 5. Frontend — Màn QLSX tạo kế hoạch (route riêng)

- [x] 5.1 Tạo component màn QLSX: chọn đơn hàng (từ `plannableOrders`) → chọn `OrderItem`/sản phẩm trong đơn → form nhập thông số ngâm mục tiêu (react-hook-form + zod) → lưu; hiển thị danh sách kế hoạch đã tạo với nút sửa/huỷ
- [x] 5.2 Thêm route mới trong `frontend/src/App.tsx` theo pattern `ProtectedSubRoute department="production" subModule="planning"` (lazy import); thêm nav card trong `ProductionManagement.tsx` trỏ tới route mới ← (verify: route gate đúng role, chỉ QLSX/ADMIN vào được)

## 6. Frontend — Màn Đánh giá ngâm chia đôi

- [x] 6.1 Trong `ProductionMaterialEvaluationEntry.tsx`, dùng hook `activeByProduct(wizardData.productId)` để lấy kế hoạch hiệu lực khi có `productId`; state chọn nhanh khi >1 kế hoạch
- [x] 6.2 Chuyển bước 4 (Thông số) sang layout chia đôi: cột trái = thông số kế hoạch (soLanNgam, nhietDoNuocTruocNgam, nhietDoNuocSauVot, thoiGianNgam, brixNuocNgam, khoiLuong) từ kế hoạch được chọn; cột phải = ô nhập thực tế hiện có (giữ nguyên logic/validation/save)
- [x] 6.3 Xử lý 3 trạng thái: 1 kế hoạch → đổ thẳng cột trái; >1 → hiển thị chọn nhanh; 0 hoặc chưa chọn sản phẩm → ẩn cột trái, nhập/lưu như cũ ← (verify: lưu đánh giá KHÔNG phụ thuộc kế hoạch; cột trái ẩn đúng khi không có kế hoạch)

## 7. Verification

- [x] 7.1 Backend: `cd backend && npx tsc --noEmit` (PHẢI pass), `npm run lint`, `npm test`
- [x] 7.2 Frontend: `cd frontend && npx tsc --noEmit` (PHẢI pass), `npm run lint`
- [x] 7.3 Chạy `gitnexus_detect_changes` (nếu có) hoặc rà soát chỉ các file trong scope thay đổi ← (verify: chỉ các file/thành phần theo plan bị đổi, không rò scope; generateMaChien + cascade Lô/Kiện không đổi)
