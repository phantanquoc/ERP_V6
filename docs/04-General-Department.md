# Hướng dẫn sử dụng - Bộ phận Tổng hợp (General)

## 1. Tổng quan

Bộ phận Tổng hợp chịu trách nhiệm định giá, chi phí và phê duyệt vận hành. Đây là nơi duy nhất tập trung toàn bộ yêu cầu báo giá / báo giá / chi phí của cả Quốc tế lẫn Nội địa để đảm bảo tính nhất quán về giá.

**Các đường dẫn chính**

| Đường dẫn | Component | Bảo vệ bởi | Mô tả |
|-----------|-----------|-----------|-------|
| `/general` | `GeneralManagement.tsx` | `ProtectedModuleRoute module="general"` | Tổng quan KPI + biểu đồ |
| `/general/pricing` | `general/GeneralPricing.tsx` | `ProtectedSubRoute department="general" subModule="pricing"` | Phòng Giá thành — 6 tab tác nghiệp |
| `/general/partners` | `general/GeneralPartners.tsx` | `ProtectedSubRoute department="general" subModule="partners"` | Phòng Chăm sóc đối tác — đang là placeholder |

**Quyền truy cập** (định nghĩa trong `frontend/src/utils/permissions.ts`, áp dụng tại `App.tsx`)

- `DEPARTMENTS.GENERAL` (`general`) và `ADMIN` mới qua được `hasModuleAccess("general")`. Các bộ phận khác bị chặn ngay từ layout.
- Cấp phòng con (`hasSubModuleAccess`): `DEPARTMENT_HEAD` / `TEAM_LEAD` của General vào được cả 2 phòng; `EMPLOYEE` chỉ vào đúng `subDepartment` của mình (`pricing` hoặc `partners`). `ADMIN` bypass toàn bộ. Hỗ trợ `secondaryDepartments` (kiêm nhiệm).
- Duyệt tăng ca / mua hàng còn kiểm tra thêm `hasSubModuleAccess("general","pricing",…)` kết hợp Rule Matrix `can("purchase-requests","APPROVE")` — chỉ khi cả hai cho phép thì nút Duyệt/Từ chối mới hoạt động.

**Cơ cấu 2 phòng con**

- **Phòng Giá thành** (`pricing`) — quản lý vòng đời Yêu cầu báo giá → Báo giá → Đơn hàng, định mức chi phí, và 2 hàng đợi phê duyệt (tăng ca + mua hàng). Đây là trung tâm tác nghiệp của bộ phận.
- **Phòng Chăm sóc đối tác** (`partners`) — quản lý Khách hàng / Nhà cung cấp / Logistics. Hiện là placeholder `EmptyState`, chưa có bảng dữ liệu.

---

## 2. Tổng quan GeneralManagement (`/general` — không có bảng trực tiếp)

File: `frontend/src/pages/GeneralManagement.tsx` — trang dashboard thuần KPI + biểu đồ; mọi bảng chi tiết nằm trong `/general/pricing`.

### 2.1 KPI — 4 thẻ `KpiCard` (grid 1/2/4 cột responsive)

| Thẻ | Value | Dòng phụ (sub) | SubCounts | Điều hướng |
|-----|-------|----------------|-----------|------------|
| Yêu cầu báo giá | `stats.ycbg.total` | `Quốc tế: X · Nội địa: Y` | QT (xanh dương) / NĐ (xanh lá) | `/general/pricing?tab=requests` |
| Bảng báo giá | `bangBaoGia.total` | `Quốc tế: X · Nội địa: Y` | QT / NĐ | `?tab=quotes` |
| Đơn hàng | `donHang.total` | `Quốc tế: X · Nội địa: Y` | QT / NĐ | `?tab=orders` |
| Chi phí chung | `chiPhiChung.total + exportCost` | `Chung: X · XK: Y` | Chung (đỏ) / XK (vàng) | `?tab=costs` |

Dữ liệu lấy qua `Promise.all` 13 request song song: mỗi nhóm gọi `getAll*(1,1)` để lấy `pagination.total` theo loại khách (Quốc tế / Nội địa), cộng thêm 2 request `limit=9999` để nhóm theo tháng cho biểu đồ đường. Trang có `LoadingState` và `ErrorState` với nút thử lại.

### 2.2 Biểu đồ — 4 biểu đồ, chia 2 hàng

| Biểu đồ | Loại | Dữ liệu | Ghi chú |
|---------|------|---------|---------|
| Phân bổ YCBG theo loại khách | Pie donut | `[{Quốc tế}, {Nội địa}]` | Hiện `EmptyState` khi cả hai = 0 |
| Phân bổ Đơn hàng theo loại khách | Pie donut | Tương tự | Label kèm phần trăm |
| Xu hướng đơn hàng theo tháng | Line (nền tối) | Đếm `ngayDatHang` theo 12 tháng năm hiện tại | Trục `T1..T12` |
| Xu hướng báo giá theo tháng | Line (nền tối) | Đếm `createdAt` theo 12 tháng | Cùng trục năm |

Click vào thẻ KPI sẽ chuyển sang tab tương ứng ở Phòng Giá thành — giúp nhân viên Tổng hợp vừa nhìn tổng quan vừa đi sâu vào bảng dữ liệu.

---

## 3. Phòng Giá thành — GeneralPricing (`/general/pricing` — 6 tab)

File: `frontend/src/pages/general/GeneralPricing.tsx`. Điều hướng tab đồng bộ URL `?tab=requests|quotes|orders|costs|overtime-review|purchase-review`. Phần overview phía trên có bộ chọn Tháng/Năm (`selectedMonth/selectedYear`) truyền vào `usePricingOverview` — chỉ ảnh hưởng các thẻ tổng hợp, không ảnh hưởng số chờ duyệt tồn (có ghi chú "Không lọc tháng/năm").

### 3.1 Overview — 5 thẻ (2 hàng: 3 funnel + 2 vận hành)

| Thẻ | Click mở tab | Nội dung chính |
|-----|--------------|----------------|
| YCBG | `requests` | 4 pill: Chờ (`CHO_XU_LY`) / Đang (`DANG_BAO_GIA`) / Xong (`DA_BAO_GIA`) / Hủy (`HUY`) + mini QT/NĐ |
| Báo giá | `quotes` | 5 nhóm: Nháp / Chờ phản hồi / Chờ gửi ĐH / Đã đặt / Không đặt-Hủy-Hết hạn + badge khóa giá nếu `priceLockedCount > 0` |
| Đơn hàng | `orders` | Tổng + tổng giá trị VND + 3 pill SX (Chờ/Đang/Đã giao) + 2 pill thanh toán (Chưa đủ/Đã đủ) + QT/NĐ |
| Chi phí | `costs` | CP chung / CP XK / TB giá/ngày + Top loại chi phí |
| Duyệt & Cảnh báo | — | Tăng ca chờ duyệt + Mua hàng chờ duyệt + Quá hạn vàng ≥7 ngày / đỏ ≥14 ngày |

### 3.2 Tab 1 — Danh sách YCBG (component `QuotationRequestManagement`, mode="pricing")

Dùng chung component với phòng Kinh doanh, nhưng General **không truyền `customerType`** nên thấy cả Quốc tế + Nội địa (đúng vai trò nhìn toàn cục).

**Model Prisma**: `QuotationRequest` + `QuotationRequestItem` (`business_orders.prisma`).

**Cột hiện có (9 cột)**

| # | Cột | Nguồn | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | tính theo trang | — |
| 2 | Ngày yêu cầu | `ngayYeuCau` | `DD/MM/YYYY` |
| 3 | Mã YC | `maYeuCauBaoGia` | chữ xanh |
| 4 | Nhân viên | `tenNhanVien` + `maNhanVien` | 2 dòng |
| 5 | Khách hàng | `tenKhachHang` + `maKhachHang` | 2 dòng |
| 6 | Sản phẩm | `items` | "N sản phẩm" + tên đầu |
| 7 | Số lượng | tổng `items.soLuong` | kèm ĐVT dòng đầu |
| 8 | Trạng thái | `status` | badge 4 màu |
| 9 | Hành động | — | Xem + Tạo báo giá |

**Bộ lọc & phân trang**: tìm kiếm tổng hợp + 3 trường lọc (Mã YC / Nhân viên / Khách hàng) + dropdown Trạng thái. Phân trang server-side, chọn 10/20/50/100 dòng/trang. Có nút Xuất Excel.

**Thiếu / đề xuất**
- `quocGia`, `cangDen`, `tiGiaUSD` có trong model và form tạo/sửa nhưng **không có cột trên bảng** → nhân viên muốn lọc YCBG xuất khẩu theo quốc gia/cảng phải mở từng chi tiết. Nên bổ sung cột Quốc gia/Cảng đến/Tỉ giá.
- Thiếu cột tổng giá trị ước tính để ưu tiên xử lý YCBG lớn trước.

### 3.3 Tab 2 — Danh sách báo giá (component `QuotationManagement`)

Tương tự không truyền `customerType` → thấy cả QT + NĐ.

**Model Prisma**: `Quotation` (+ `QuotationItem`, `QuotationCalculator`).

**Cột hiện có (10 cột)**

| # | Cột | Nguồn |
|---|-----|-------|
| 1 | STT | tính theo trang |
| 2 | Ngày BG | `ngayBaoGia` |
| 3 | Mã báo giá | `maBaoGia` |
| 4 | Giá báo khách | `giaBaoKhach` hoặc tính từ `calculator.products` (hiển thị VND + USD nếu có tỉ giá) |
| 5 | TG giao hàng | `thoiGianGiaoHang` (ngày) |
| 6 | Hiệu lực | `hieuLucBaoGia` (ngày) |
| 7 | Nhân viên | `tenNhanVien` |
| 8 | Trạng thái | `tinhTrang` (9 giá trị) + badge "Đã khóa giá" + badge lão hóa "N ngày chờ" |
| 9 | Ghi chú | `ghiChu` (cắt ngắn) |
| 10 | Hành động | Xem / Sửa / Tạo đơn hàng / Xóa |

**GAP lớn nhất — thiếu cột Khách hàng**: bảng hiện **không có cột Khách hàng** dù `tenKhachHang` có trong model và modal chi tiết có hiển thị. Nhân viên Tổng hợp không thể quét bảng để biết báo giá của khách nào — bắt buộc mở chi tiết từng dòng. Nên bổ sung cột Khách hàng (mã + tên, 2 dòng như YCBG).

**Đề xuất thêm**
- Cột Sản phẩm / Khối lượng (hiện chỉ thấy trong chi tiết).
- Cột giá đối thủ / giá gần nhất để so sánh khi định giá (có trong `QuotationRequestItem.giaDoiThuBan`).

### 3.4 Tab 3 — Danh sách đơn hàng (component `OrderManagement`)

Cũng không lọc `customerType` → toàn cục.

**Model Prisma**: `Order` + `OrderItem`.

**Cột hiện có (9 cột)**

| # | Cột | Nguồn |
|---|-----|-------|
| 1 | STT | tính theo trang |
| 2 | Ngày đặt hàng | `ngayDatHang` |
| 3 | Mã đơn hàng | `maDonHang` |
| 4 | Mã báo giá | `maBaoGia` |
| 5 | Khách hàng | `tenKhachHang` |
| 6 | Số lượng SP | `items.length` |
| 7 | Trạng thái SX | `trangThaiSanXuat` (7 giá trị: Chờ lên kế hoạch → Đã giao) |
| 8 | Trạng thái TT | `trangThaiThanhToan` (3 giá trị) |
| 9 | Hành động | Xem bảng tính / Xóa (click dòng mở chi tiết) |

**Thiếu / đề xuất**
- **Giá trị USD/VND** (`giaTriDonHangUSD/VND`) API đã trả nhưng **không có cột trên bảng** → không thể sắp xếp theo giá trị đơn hàng. Nên thêm cột Giá trị (2 dòng USD + VND).
- Cột Ngày giao hàng / Ngày hoàn thành kế hoạch để cảnh báo đơn sắp trễ.

### 3.5 Tab 4 — Chi phí (component `ExportCostManagement`, 2 bảng con trong 1 tab)

Toggle chuyển giữa **Chi phí Xuất khẩu** và **Chi phí Chung**. Cùng cấu trúc bảng, khác nguồn dữ liệu.

**Model Prisma** (`business_orders.prisma`): `ExportCost` và `GeneralCost` — hai bảng độc lập, cấu trúc giống nhau: `maChiPhi, tenChiPhi, loaiChiPhi, noiDung?, donViTinh?, giaThanhNgay?, donViTien?, msnv?, tenNhanVien?`.

**Cột hiện có (7 cột)**

| # | Cột | Nguồn |
|---|-----|-------|
| 1 | Mã chi phí | `maChiPhi` |
| 2 | Tên chi phí | `tenChiPhi` |
| 3 | Loại chi phí | `loaiChiPhi` |
| 4 | Đơn vị tính | `donViTinh` |
| 5 | Giá/ngày | `giaThanhNgay` + `donViTien` |
| 6 | Người tạo | `tenNhanVien` |
| 7 | Thao tác | Sửa / Xóa |

**Lệch phân trang (gap vận hành)**
- **ExportCost**: phân trang server-side chuẩn qua hook `useExportCosts`.
- **GeneralCost**: client-side — gọi `getAllGeneralCosts(1, 1000)` rồi tự cắt trang. Khi vượt 1000 dòng sẽ mất dữ liệu. Cần thống nhất cả hai về server-side.

**Thiếu / đề xuất**
- `noiDung`, `donViTien`, `createdAt` có trong model nhưng **không hiển thị trên bảng**. Nên thêm cột Nội dung và Ngày tạo.

### 3.6 Tab 5 — Duyệt tăng ca (component `general/pricing/OvertimePlanReviewTab`)

**Model Prisma** (`common.prisma`): `OvertimePlan` + `OvertimePlanItem`. Trạng thái: `CHO_DUYET / DA_DUYET / TU_CHOI / HOAN_THANH / HUY`. Ưu tiên: `TaskPriority`.

**Cột hiện có (8 cột)**

| # | Cột | Nguồn |
|---|-----|-------|
| 1 | STT | tính theo trang |
| 2 | Ngày tạo | `ngayTao` |
| 3 | Nội dung | `noiDung` (cắt ngắn) |
| 4 | Ưu tiên | `mucDoUuTien` (badge) |
| 5 | Người tạo | `nguoiTao` |
| 6 | Số dòng | `items.length` |
| 7 | Trạng thái | `trangThai` (badge 5 màu) |
| 8 | Hành động | Chi tiết / Duyệt / Từ chối (khi `CHO_DUYET`) |

**Bộ lọc & phân trang**: lọc client-side trên danh sách đã tải, theo Nội dung / Người tạo / Trạng thái / Ưu tiên. Có Xuất Excel (đang lọc). Modal chi tiết hiển thị bảng con các ngày tăng ca với Giờ bắt đầu / Giờ kết thúc / **Tổng giờ** (tự tính).

**Thiếu / đề xuất (hướng tới nhân viên Tổng hợp nắm việc)**
- **Tổng giờ OT** chỉ thấy khi mở chi tiết — duyệt hàng loạt phải mở từng dòng. Nên thêm cột Tổng giờ ngay trên bảng.
- **Ngày OT thực tế** (`items.ngayTangCa` min/max) không hiển thị trên bảng — cần biết OT rơi vào ngày nào.
- **Người duyệt / Ngày duyệt** chỉ hiện trong chi tiết khi đã duyệt — nên thêm 2 cột để truy vết.

### 3.7 Tab 6 — Duyệt mua hàng (component `general/pricing/PurchaseRequestReviewTab`)

**Model Prisma** (`business_production.prisma`): `PurchaseRequest` + `PurchaseRequestItem`. Có trường `sourceType` = `MANUAL | SHORTAGE | REORDER | QUICK` và `nhaCungCapId` (liên kết `Supplier`).

**Cột hiện có (10 cột)**

| # | Cột | Nguồn |
|---|-----|-------|
| 1 | STT | tính theo trang |
| 2 | Mã yêu cầu | `maYeuCau` |
| 3 | Ngày yêu cầu | `ngayYeuCau` (sắp xếp được) |
| 4 | Nhân viên | `tenNhanVien` |
| 5 | Sản phẩm | `items[].tenHangHoa` (tối đa 3 tên) |
| 6 | Tổng tiền | tổng `giaDuKien * soLuong` (sắp xếp được) |
| 7 | Ưu tiên | `mucDoUuTien` (badge) |
| 8 | Trạng thái | `trangThai` (badge) |
| 9 | Người duyệt | `nguoiDuyet` |
| 10 | Hành động | Chi tiết / Duyệt / Từ chối |

**Bộ lọc & phân trang**: lọc client-side theo Mã YC / Nhân viên / Mục đích / Ưu tiên; sắp xếp theo Ngày yêu cầu hoặc Tổng tiền. Có Xuất Excel (đang lọc).

**Thiếu / đề xuất**
- **Nhà cung cấp** (`nhaCungCapId → Supplier`) có trong model nhưng **không có cột trên bảng** → người duyệt không biết mua của NCC nào. Nên thêm cột NCC.
- **Nguồn** (`sourceType`: SHORTAGE / REORDER / MANUAL) không hiển thị — rất cần để phân biệt yêu cầu tự động từ cảnh báo tồn kho với yêu cầu thủ công. Nên thêm badge Nguồn.
- **Mục đích yêu cầu** (`mucDichYeuCau`) chỉ thấy trong chi tiết — nên đưa ra bảng.

---

## 4. Phòng Chăm sóc đối tác — GeneralPartners (`/general/partners`)

File: `frontend/src/pages/general/GeneralPartners.tsx` — **placeholder thuần**, chưa có bảng dữ liệu.

Hiện chỉ hiển thị `PageHeader` + `EmptyState` ("Chức năng quản lý đối tác đang được hoàn thiện…") và 3 thẻ mô tả tính năng dự kiến:

| Thẻ | Mô tả |
|-----|-------|
| Khách hàng | Quản lý thông tin và lịch sử giao dịch |
| Nhà cung cấp | Quản lý nhà cung cấp nguyên liệu |
| Logistics | Quản lý đối tác vận chuyển |

**Model đã có sẵn nhưng chưa có màn hình**: `Supplier` (`business_production.prisma`) đã đầy đủ trường (`maNhaCungCap, tenNhaCungCap, loaiCungCap, quocGia, nguoiLienHe, soDienThoai, emailLienHe, diaChi, loaiHinh, trangThai, phanLoaiNCC, doanhChi…`) — có thể xây bảng quản lý NCC ngay, không cần thêm migration.

**Đề xuất xây bảng Supplier**

| Cột đề xuất | Nguồn |
|-------------|-------|
| Mã NCC | `maNhaCungCap` |
| Tên NCC | `tenNhaCungCap` |
| Loại cung cấp | `loaiCungCap` |
| Quốc gia | `quocGia` |
| Người liên hệ | `nguoiLienHe` + `soDienThoai` |
| Loại hình | `loaiHinh` (Sản xuất / Thương mại) |
| Phân loại | `phanLoaiNCC` (NVL / Thiết bị) |
| Trạng thái | `trangThai` (badge) |
| Doanh chi | `doanhChi` |
| Thao tác | Xem / Sửa / Xóa |

---

## 5. Hướng dẫn sử dụng

### 5.1 Xem tổng quan
1. Đăng nhập tài khoản thuộc bộ phận Tổng hợp (hoặc Admin).
2. Vào `/general` — quan sát 4 thẻ KPI, click thẻ để nhảy tới tab tương ứng trong `/general/pricing`.
3. Dùng 2 biểu đồ tròn xem tỷ trọng Quốc tế/Nội địa, 2 biểu đồ đường xem xu hướng tháng.

### 5.2 Quy trình định giá chuẩn (Phòng Giá thành)
1. **YCBG** (`?tab=requests`): lọc trạng thái Chờ xử lý → mở chi tiết kiểm tra quốc gia/cảng/tỉ giá → bấm **Tạo báo giá**.
2. **Báo giá** (`?tab=quotes`): chú ý badge "Đã khóa giá" và badge lão hóa (vàng ≥7 ngày, đỏ ≥14 ngày). Khi khách đồng ý, bấm **Tạo đơn hàng**.
3. **Đơn hàng** (`?tab=orders`): theo dõi Trạng thái SX (7 bước) và Trạng thái TT (3 bước). Click dòng mở chi tiết để cập nhật ngày sản xuất, giá trị, thanh toán từng đợt.
4. **Chi phí** (`?tab=costs`): chọn toggle Xuất khẩu/Chung → Tạo chi phí mới → định kỳ Xuất Excel đối chiếu.
5. **Duyệt tăng ca** (`?tab=overtime-review`): mở chi tiết kiểm tra từng ngày/ca/nhân sự/giờ → Duyệt hoặc Từ chối (nhập lý do).
6. **Duyệt mua hàng** (`?tab=purchase-review`): sắp xếp theo Tổng tiền để ưu tiên đơn lớn → Duyệt hoặc Từ chối.

### 5.3 Phòng Chăm sóc đối tác
Hiện chỉ xem được placeholder. Khi bảng Supplier được xây, quy trình: Tạo NCC → gán loại cung cấp/quốc gia/loại hình → dùng NCC đó khi tạo yêu cầu mua hàng.

---

## 6. Lưu ý & đề xuất cải tiến

### 6.1 Lưu ý vận hành
- **Không lọc `customerType` ở General là có chủ đích** — để nhìn toàn cục cả Quốc tế lẫn Nội địa.
- **Trạng thái chỉ tiến trên server** — không PATCH trực tiếp `status/tinhTrang` từ client; mọi chuyển đổi phải qua service method.
- **Khóa giá** (`priceLocked`): khi báo giá đã khóa, chỉ ADMIN sửa được `giaBaoKhach`; backend ghi audit `PRICE_UNLOCK`.
- **Thông báo không làm fail nghiệp vụ chính** — lỗi gửi notification được bọc `try/catch`.
- **Phân trang lệch ở tab Chi phí**: ExportCost server-side, GeneralCost client-side (giới hạn 1000).

### 6.2 Đề xuất cải tiến theo độ ưu tiên

| Ưu tiên | Tab | Đề xuất | Lý do |
|---------|-----|---------|-------|
| P0 | Báo giá | Thêm cột **Khách hàng** ra bảng | Gap lớn nhất — không biết báo giá của khách nào khi quét bảng |
| P0 | Đơn hàng | Thêm cột **Giá trị USD/VND** | API đã trả nhưng thiếu trên UI |
| P0 | Chi phí | Thống nhất GeneralCost về server-side pagination | Tránh mất dữ liệu >1000 dòng |
| P1 | YCBG | Thêm cột **Quốc gia / Cảng đến / Tỉ giá** | Cần cho xử lý đơn xuất khẩu |
| P1 | Duyệt OT | Thêm cột **Tổng giờ OT** + **Ngày OT** | Duyệt hàng loạt cần tổng giờ, không phải mở từng chi tiết |
| P1 | Duyệt mua | Thêm cột **NCC** + badge **Nguồn** | Phân biệt đơn tự động (SHORTAGE/REORDER) với thủ công |
| P1 | Partners | Xây bảng **Supplier** (model đã có) | Mở khóa nghiệp vụ quản lý NCC |
| P2 | Pricing | Thêm cột **giá đối thủ** ở báo giá | Hỗ trợ định giá cạnh tranh |
