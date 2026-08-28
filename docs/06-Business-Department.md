# Bộ phận Kinh doanh (Business Department)

## 1. Tổng quan

Bộ phận Kinh doanh là trung tâm quản lý toàn bộ vòng đời bán hàng của An Bình Foods — từ khi khách hàng gửi yêu cầu báo giá, nhân viên lập báo giá, chốt đơn hàng cho tới ghi nhận phản hồi sau bán. Mọi dữ liệu được tách theo hai thị trường **Quốc tế (QT)** và **Nội địa (NĐ)** nhưng dùng chung cùng một bộ component, chỉ khác `customerType` prop truyền vào.

| Thông tin | Giá trị |
|-----------|---------|
| Route gốc | `/business` |
| Route tổng quan | `/business/management` → `BusinessManagement.tsx` |
| Route báo cáo | `/business/report` → `BusinessReport.tsx` |
| Phòng KD Quốc tế | `/business/international` → `BusinessInternational.tsx` |
| Phòng KD Nội địa | `/business/domestic` → `BusinessDomestic.tsx` |
| Quyền truy cập | `business` module — role `Business` + `ADMIN` (qua `ProtectedModuleRoute` / `ProtectedSubRoute`) |
| Phân quyền con | `management` / `international` / `domestic` (subModule) |

Hai phòng con **International** (`Globe`, tone xanh dương) và **Domestic** (`Home`, tone xanh lá) có cấu trúc UI giống hệt nhau: 4 thẻ thống kê tổng quan + thanh tab 5 mục + bộ lọc Tháng/Năm. URL tab được đồng bộ qua `?tab=` (deep-link, ví dụ `/business/international?tab=orders`). Hai phòng chia sẻ 4 component nghiệp vụ chung: `QuotationRequestManagement`, `QuotationManagement`, `OrderManagement`, `CustomerFeedbackManagement`; riêng tab Khách hàng dùng component riêng (`InternationalCustomerManagement` / `DomesticCustomerManagement`). Danh mục **Hàng hóa** (`InternationalProductManagement`) dùng chung cho cả hai thị trường, mô tả ở mục 4.

---

## 2. Tổng quan BusinessManagement và BusinessReport

### 2.1. BusinessManagement — `/business/management`

File: `frontend/src/pages/BusinessManagement.tsx`

Trang landing của khối Kinh doanh. Tải song song 4 API với `limit=1` để lấy `pagination.total` (YCBG, Báo giá, Đơn hàng) và `total` (Khách hàng), sau đó tải full `limit=9999` để dựng biểu đồ.

| Khu vực | Nội dung |
|---------|----------|
| **KPI row** (4 `KpiCard`) | Yêu cầu báo giá (blue) → `?tab=quotationRequests`, Báo giá (green) → `?tab=quotations`, Đơn hàng (purple) → `?tab=orders`, Khách hàng (orange) → `?tab=customers`. Mỗi card hiển thị tổng số và link "Xem chi tiết →". |
| **Pie: YCBG theo trạng thái** | Gom theo `status`/`trangThai` (CHO_XU_LY, DANG_BAO_GIA, DA_BAO_GIA, HUY). Dùng `STATUS_COLORS`, innerRadius 60 / outerRadius 90. Hiển thị "Chưa có dữ liệu" khi rỗng. |
| **Pie: Đơn hàng theo trạng thái SX** | Gom theo `trangThaiSanXuat` (7 giá trị OrderProductionStatus). Dùng `COLORS` (chartPalettes.product). |
| **Line: Xu hướng đơn hàng theo tháng** | 12 tháng năm hiện tại, đếm theo `ngayDatHang` hoặc `createdAt`. Variant dark, màu `#38bdf8`. |
| **Line: Xu hướng báo giá theo tháng** | Đếm theo `createdAt` của Quotation. Màu `#a78bfa`. |
| **Navigation** | 2 nút card dẫn tới `/business/international` và `/business/domestic`. |
| **Làm mới** | Nút "Làm mới" + timestamp `Cập nhật lúc:`. LoadingState khi lần đầu. |

### 2.2. BusinessReport — `/business/report`

File: `frontend/src/pages/BusinessReport.tsx`

Báo cáo hợp nhất QT vs NĐ. Tải 6 request song song: `orderService.getAllOrders` (QT/NĐ), `internationalCustomerService.getAllCustomers` (QT/NĐ), `customerFeedbackService.getAllFeedbacks` (QT/NĐ) — mỗi cái `limit=10000` để tính toán client-side.

| Khu vực | Nội dung |
|---------|----------|
| **KPI: Đơn hàng** (blue) | Tổng = intl + domestic, subCounts Quốc tế / Nội địa. Link `/business/management`. |
| **KPI: Khách hàng quốc tế** (green) | Tổng + breakdown Đang giao dịch / Ngừng giao dịch (theo `trangThai`). Link `/business/international`. |
| **KPI: Khách hàng nội địa** (purple) | Tương tự, link `/business/domestic`. |
| **KPI: Phản hồi khách hàng** (orange) | Tổng + Quốc tế / Nội địa. |
| **Pie: Phân bổ đơn hàng theo loại khách** | 2 lát QT/NĐ, màu `product` palette. EmptyState "Chưa có dữ liệu đơn hàng" khi rỗng. |
| **Pie: Phân bổ phản hồi theo loại khách** | Tương tự, màu `inspection` palette. |
| **Line: Đơn hàng quốc tế theo tháng** | So sánh 2 năm `prevYear` vs `currYear`, 12 tháng, 2 đường `#ec4899` / `#6366f1`. Variant dark. |
| **Line: Đơn hàng nội địa theo tháng** | Cấu trúc y hệt, tách riêng intl/domestic. |

---

## 3. Chi tiết 5 tabs (QT và NĐ dùng chung component)

Mỗi phòng con định nghĩa `VALID_TABS = ['quotationRequests','quotations','orders','customers','feedback']` và 4 thẻ overview phía trên tabs. Overview đếm theo `selectedMonth`/`selectedYear` (2 dropdown Tháng/Năm ở PageHeader). Dưới đây mô tả từng tab theo thứ tự hiển thị trong `tabs[]` của `BusinessInternational` / `BusinessDomestic`.

### 3.1. Tab 1 — Yêu cầu báo giá (YCBG)

- **Component:** `frontend/src/components/QuotationRequestManagement.tsx`
- **Model Prisma:** `QuotationRequest` + `QuotationRequestItem` (`business_orders.prisma`)
- **Prop phân biệt:** `customerType="Quốc tế"` hoặc `"Nội địa"` → truyền xuống service filter `customerType`
- **Luồng liên quan:** Tạo YCBG → (tùy chọn) mở `QuotationCalculatorModal` để tạo Báo giá; YCBG status `CHO_XU_LY` tự động chuyển `DANG_BAO_GIA` khi mở popup (fire-and-forget `markInProgress`).

**Bảng chính — 9 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `(currentPage-1)*limit + index + 1` | Số thứ tự phân trang |
| 2 | Ngày yêu cầu | `ngayYeuCau` | `toLocaleDateString('vi-VN')` |
| 3 | Mã YC | `maYeuCauBaoGia` | In đậm xanh, unique |
| 4 | Nhân viên | `tenNhanVien` / `maNhanVien` | 2 dòng |
| 5 | Khách hàng | `tenKhachHang` / `maKhachHang` | 2 dòng |
| 6 | Sản phẩm | `items.length` + `items[0].tenSanPham` | "3 sản phẩm — Mít sấy +2" |
| 7 | Số lượng | `sum(items.soLuong)` + `items[0].donViTinh` | Gộp sai ĐVT nếu nhiều ĐVT (audit finding) |
| 8 | Trạng thái | `status` | Badge 4 màu: Chờ xử lý (xám), Đang báo giá (xanh), Đã báo giá (xanh lá), Đã hủy (đỏ) |
| 9 | Hành động | — | Xem (Eye) · Sửa (Edit) · Xóa (Trash) ở mode business; Tạo báo giá (FileText) ở mode pricing |

**Tính năng bảng:** `TableFilter` (Mã YC, Nhân viên, Khách hàng + ô search), dropdown lọc **Trạng thái** (4 giá trị), phân trang server-side với selector `10/20/50/100` mỗi trang, hiển thị "Hiển thị X–Y / Tổng". CRUD qua `Modal` (form nhiều `items`, mỗi item có `productId`, `soLuong`, `donViTinh` bắt buộc). Nút **Xuất Excel** gọi `exportToExcel({search})`. Deep-link `?quotationRequestId=` tự mở detail modal.

**Pagination:** Server-side OK — `useQuotationRequests({page, limit, search, customerType, status})`, backend trả `pagination {total, totalPages}`.

**Thiếu gì / Đề xuất cho nhân viên KD:**

| Vấn đề | Đề xuất |
|--------|---------|
| Cột chính không hiển thị **Quốc gia / Cảng đến / Tỉ giá USD** dù form có nhập | Thêm 1 cột "Điểm đến" (Quốc gia — Cảng) và cột "Tỉ giá" cho QT; NĐ hiển thị "Địa chỉ giao hàng". Giúp KD nắm ngay YCBG xuất đi đâu. |
| **Giá đối thủ / Giá bán gần nhất** chỉ có trong detail, không có ở bảng | Thêm tooltip hoặc cột "Giá tham khảo" tóm tắt (min/max) để KD so sánh nhanh. |
| **Số lượng gộp sai ĐVT** — cộng dồn kg + thùng + tấn vào một số | Hiển thị số lượng theo từng ĐVT riêng hoặc chỉ đếm số dòng sản phẩm, không cộng lẫn ĐVT. |
| Form QT vs NĐ khác nhau nhưng bảng không phân biệt | Thêm badge nhỏ "QT"/"NĐ" hoặc màu viền dòng để nhận biết nguồn YCBG. |

---

### 3.2. Tab 2 — Báo giá (Quotation)

- **Component:** `frontend/src/components/QuotationManagement.tsx`
- **Model Prisma:** `Quotation` + `QuotationItem` + `QuotationRevision` + quan hệ `QuotationCalculator`
- **Enum `tinhTrang`:** `DRAFT`, `DANG_CHO_PHAN_HOI`, `DANG_CHO_GUI_DON_HANG`, `DA_DAT_HANG`, `KHONG_DAT_HANG`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`

**Bảng chính — 10 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `(currentPage-1)*limit + index + 1` | |
| 2 | Ngày BG | `ngayBaoGia` | |
| 3 | Mã báo giá | `maBaoGia` | In đậm xanh |
| 4 | Giá báo khách | `giaBaoKhach` hoặc `quotationRequest.calculator.products[].(giaHoaVon+loiNhuan)` | Logic phức tạp: nếu có calculator thì tính từng product, hiển thị cả VND + USD (chia `tiGiaUSD`). Không có calculator mới fallback `giaBaoKhach`. |
| 5 | TG giao hàng | `thoiGianGiaoHang` | "7 ngày" |
| 6 | Hiệu lực | `hieuLucBaoGia` | "30 ngày" |
| 7 | Nhân viên | `tenNhanVien` | |
| 8 | Trạng thái | `tinhTrang` + `priceLocked` + `daysOpen` | Badge màu + "Đã khóa giá" (cam, ẩn với ADMIN) + "X ngày chờ" (vàng ≥7 ngày, đỏ ≥14 ngày) cho non-terminal statuses |
| 9 | Ghi chú | `ghiChu` | Truncate max-w-xs |
| 10 | Hành động | — | Xem · Sửa (theo `canEditQuotation`) · Tạo đơn hàng (ShoppingCart) · Xóa (theo `canDeleteQuotation`) |

**Tính năng bảng:** `TableFilter` (Mã BG, Khách hàng, Nhân viên + search), phân trang server-side `10/20/50/100`. Nút **Xuất Excel**. Detail modal 2 tab: **Thông tin** (thông tin cơ bản, định mức, sản xuất) + **Lịch sử hoạt động** (`AuditTimeline`, chỉ ADMIN/DEPARTMENT_HEAD). Edit modal cho phép sửa `giaBaoKhach`, `thoiGianGiaoHang`, `hieuLucBaoGia`, `tinhTrang`, `ghiChu` — giá bị khóa (`priceLocked`) thì disable với non-ADMIN. Deep-link `?quotationId=`.

**Pagination:** Server-side OK — `useQuotations({page, limit, search, customerType})`.

**Thiếu gì / Đề xuất (gap lớn nhất của toàn module):**

| Vấn đề | Đề xuất |
|--------|---------|
| **Thiếu cột Khách hàng** trong bảng chính — KD không biết báo giá này của ai nếu không mở detail | Thêm cột "Khách hàng" (`tenKhachHang`/`maKhachHang`) ngay sau Mã BG. Đây là gap lớn nhất được audit ghi nhận. |
| **Thiếu Sản phẩm / Khối lượng** ở bảng chính | Thêm cột "Sản phẩm" (`tenSanPham`) và "KL" (`khoiLuong` + `donViTinh`). |
| **Giá báo khách logic rẽ nhánh** (calculator vs giaBaoKhach) khó đọc | Thống nhất 1 nguồn hiển thị: luôn show `giaBaoKhach` đã chốt; calculator chỉ là chi tiết drill-down trong modal. |
| Chưa có filter theo **Trạng thái** và **Khoảng ngày** | Thêm dropdown trạng thái + date range để KD lọc báo giá chờ phản hồi quá hạn. |

---

### 3.3. Tab 3 — Đơn hàng (Order)

- **Component:** `frontend/src/components/OrderManagement.tsx`
- **Model Prisma:** `Order` + `OrderItem` — liên kết `quotationId` (unique), `quotationRequestId`, `customerId`
- **Enums:** `OrderProductionStatus` (7 giá trị), `OrderPaymentStatus` (3 giá trị)

**Bảng chính — 9 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `(currentPage-1)*limit + index + 1` | |
| 2 | Ngày đặt hàng | `ngayDatHang` | |
| 3 | Mã đơn hàng | `maDonHang` | In đậm xanh, unique |
| 4 | Mã báo giá | `maBaoGia` | |
| 5 | Khách hàng | `tenKhachHang` | |
| 6 | Số lượng SP | `items.length` | Đang hiển thị số dòng, không phải tổng số lượng |
| 7 | Trạng thái SX | `trangThaiSanXuat` | `StatusBadge` 7 màu: Chờ lên KH (xám), Chờ SX (vàng), Đang SX (xanh), Chờ giao (vàng), Đã lên container (xanh), Đang vận chuyển (vàng), Đã giao (xanh lá) |
| 8 | Trạng thái TT | `trangThaiThanhToan` | 3 màu: Đã TT đợt 1 (vàng), Chờ TT đợt 2 (đỏ), Đã TT đủ (xanh lá) |
| 9 | Hành động | — | Xem bảng tính (Calculator) · Xóa (Trash). Click cả dòng mở detail modal. |

**Tính năng bảng:** `TableFilter` (Mã ĐH, Mã BG, Khách hàng, Trạng thái SX + search), phân trang server-side với selector `10/20/50/100` — **chuẩn nhất trong 5 tabs** (page/limit đều selectable, hiển thị "Hiển thị X–Y / Tổng", nút Trước/Sau + ellipsis). Detail modal 2 tab: **Thông tin** (6 section: cơ bản, khách hàng, giá trị, thanh toán đợt 1/2, sản xuất, trạng thái, danh sách hàng hóa, ghi chú) + **Lịch sử hoạt động** (audit log table, chỉ ADMIN/DEPARTMENT_HEAD). Edit modal cho phép sửa giá trị đơn hàng, thanh toán 2 đợt, ngày sản xuất/giao hàng, trạng thái. Nút **Xem bảng tính** tải `QuotationRequest` qua `quotationRequestId` và mở `QuotationCalculatorModal`. Deep-link `?orderId=`.

**Pagination:** Server-side — `useOrders({page, limit, search, customerType, status})` — duy nhất trong module có cả page và limit selectable chuẩn.

**Thiếu gì / Đề xuất:**

| Vấn đề | Đề xuất |
|--------|---------|
| **Thiếu Giá trị USD/VND ở bảng chính** dù API đã trả `giaTriDonHangUSD`/`giaTriDonHangVND` | Thêm 1-2 cột "Giá trị" (USD / VND) để KD nắm ngay quy mô đơn hàng không cần mở detail. |
| **Số lượng SP = items.length** gây hiểu nhầm (3 dòng SP ≠ 3 kg) | Đổi label thành "Số dòng SP" hoặc thêm cột "Tổng KL" (sum `soLuong` + ĐVT). |
| Chưa có filter theo **Trạng thái thanh toán** | Thêm filter riêng cho `trangThaiThanhToan` để KD lọc đơn chờ thu tiền. |

---

### 3.4. Tab 4 — Khách hàng

Hai component riêng nhưng cùng model Prisma `InternationalCustomer`. Phân biệt QT/NĐ bằng field địa lý: `quocGia`/`thanhPho` (QT) vs `tinhThanh`/`quanHuyen` + `maSoThue` (NĐ).

#### 3.4.1. Khách hàng Quốc tế

- **Component:** `frontend/src/components/InternationalCustomerManagement.tsx`
- **Service:** `internationalCustomerService.getAllCustomers(..., 'Quốc tế')`

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | Mã KH | `maKhachHang` | Xanh đậm |
| 2 | Tên công ty | `tenCongTy` | |
| 3 | Người liên hệ | `nguoiLienHe` | |
| 4 | Quốc gia | `quocGia` | Kèm icon MapPin |
| 5 | Loại KH | `loaiKhachHang` | Nhà phân phối / Nhập khẩu / Bán lẻ / Đại lý |
| 6 | Doanh thu năm | `doanhThuNam` | `$1,200,000` (USD) — chỉ QT có cột này |
| 7 | Trạng thái | `trangThai` | Badge: Hoạt động (xanh), Tạm ngưng (vàng), Ngừng hợp tác (đỏ) |
| 8 | Hoạt động | — | Xóa (Trash). Click dòng mở detail. |

#### 3.4.2. Khách hàng Nội địa

- **Component:** `frontend/src/components/DomesticCustomerManagement.tsx`

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | Mã KH | `maKhachHang` | |
| 2 | Tên công ty | `tenCongTy` | |
| 3 | Người liên hệ | `nguoiLienHe` | |
| 4 | Tỉnh/Thành | `tinhThanh` | |
| 5 | Quận/Huyện | `quanHuyen` | |
| 6 | Loại KH | `loaiKhachHang` | |
| 7 | Trạng thái | `trangThai` | |
| 8 | Hoạt động | — | Xóa |

**Pagination (cả 2):** Client-side slice `10` dòng/trang — fetch `limit=1000` một lần rồi `useMemo` filter + `slice((page-1)*10, page*10)`. Filter cũng client-side (`maKhachHang`, `tenCongTy`, `quocGia`/`tinhThanh` + search). Nút **Xuất Excel** gọi `exportToExcel({search, phanLoaiDiaLy})`.

**Bất đối xứng QT vs NĐ / Đề xuất:**

| Vấn đề | Đề xuất |
|--------|---------|
| **QT có Doanh thu năm, NĐ không** — thiếu nhất quán | Thêm cột "Doanh thu năm" cho NĐ hoặc thay bằng "Tổng giá trị đơn hàng" nếu NĐ không quản lý doanh thu USD. |
| **Cả 2 đều thiếu Mã số thuế ở bảng chính** dù NĐ có field `maSoThue` | Thêm cột "MST" (thu gọn, tooltip đầy đủ) để KD tra cứu nhanh khi làm hợp đồng/hóa đơn. |
| Fetch `limit=1000` rồi filter client — không scale khi KH > 1000 | Chuyển sang server-side pagination + search như YCBG/Báo giá/Đơn hàng. |
| Không có cột **Số đơn hàng** / **Ngày hợp tác** ở bảng chính | Thêm 1 cột "Hợp tác từ" hoặc "Số ĐH" để KD đánh giá mức độ thân thiết. |

---

### 3.5. Tab 5 — Phản hồi khách hàng

- **Component:** `frontend/src/components/CustomerFeedbackManagement.tsx`
- **Model Prisma:** `CustomerFeedback` — `customerId` FK → `InternationalCustomer`, các field `sanPhamLienQuan`, `donHangLienQuan`, `nguoiTiepNhan`, `bienPhapXuLy`, `ketQuaXuLy`, `mucDoHaiLong` đều có trong schema nhưng thiếu ở bảng.

**Bảng chính — 7 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | Khách hàng | `customer.tenCongTy` + `customer.quocGia` | 2 dòng |
| 2 | Loại | `loaiPhanHoi` | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác |
| 3 | Nội dung | `noiDungPhanHoi` | Truncate max-w-xs |
| 4 | Mức độ | `mucDoNghiemTrong` | Badge: Thấp (xám), Trung bình (xanh), Cao (cam), Khẩn cấp (đỏ) |
| 5 | Trạng thái | `trangThaiXuLy` | Badge + icon: Chưa xử lý (Clock, xanh), Đang xử lý (AlertCircle, vàng), Đã xử lý (CheckCircle, xanh lá), Đã đóng (X, xám) |
| 6 | Ngày | `ngayPhanHoi` | |
| 7 | Hành động | — | Xóa (Trash). Click dòng mở detail modal. |

**Tính năng bảng:** `TableFilter` 3 dropdown (Trạng thái, Loại, Mức độ) + search. CRUD modal đầy đủ 12 field. Detail modal hiển thị đầy đủ `bienPhapXuLy` (nền xanh dương), `ketQuaXuLy` (nền xanh lá), `mucDoHaiLong`, `ghiChu`. Nút **Xuất Excel**.

**Pagination:** Client-side slice `10` dòng/trang — `feedbacks.slice((page-1)*10, page*10)`. Hook `useCustomerFeedbacks` tải toàn bộ rồi filter client. Không có server pagination.

**Thiếu gì / Đề xuất:**

| Vấn đề | Đề xuất |
|--------|---------|
| **Thiếu Sản phẩm liên quan / Đơn hàng liên quan / Người tiếp nhận** ở bảng chính dù đã có trong model và modal | Thêm 1 cột "Liên quan" gộp 2 field `sanPhamLienQuan` / `donHangLienQuan` (icon + tooltip), và cột "Tiếp nhận" (`nguoiTiepNhan`). Giúp KD biết phản hồi này thuộc SP/ĐH nào mà không cần mở detail. |
| Client pagination `slice(10)` không scale | Chuyển sang server-side pagination như Order/Quotation. |
| Không có filter theo **Khách hàng** ở bảng | Thêm filter khách hàng để KD lọc phản hồi theo KH trọng điểm. |
| Thiếu cột **Mức độ hài lòng** sau xử lý | Thêm badge "Hài lòng / Không hài lòng" khi `mucDoHaiLong` đã đánh giá. |

---

## 4. Hàng hóa (InternationalProduct)

- **Component:** `frontend/src/components/InternationalProductManagement.tsx`
- **Model Prisma:** `InternationalProduct` (`business` schema) — liên kết `LotProduct`, `OrderItem`, `QuotationRequestItem`, `FinishedProduct`, `ProductReorderRule`, `MaterialStandardItem`
- **Vị trí:** Không nằm trong 5 tabs Business mà thường truy cập qua module riêng hoặc qua picker trong YCBG/Order. Tài liệu gộp vào đây vì là danh mục nền tảng cho toàn bộ luồng báo giá → đơn hàng.

**Bảng chính — 8 cột (pagination + sort + filter tốt nhất toàn module):**

| # | Cột | Field | Sort | Filter | Ghi chú |
|---|-----|-------|------|--------|---------|
| 1 | STT | `(currentPage-1)*pageSize + index + 1` | — | — | Số thứ tự phân trang |
| 2 | Mã hàng hóa | `maSanPham` (unique) | Có | Text (debounce 300ms) | Xanh đậm, mặc định sort `maSanPham desc` |
| 3 | Tên hàng hóa | `tenSanPham` (indexed) | Có | Text (debounce 300ms) | |
| 4 | Loại hàng hóa | `loaiSanPham` (indexed) | Có | Dropdown (ProductCategory) | Danh mục động |
| 5 | ĐVT | `donViTinh` | Có | Dropdown (từ rows hiện tại) | |
| 6 | Giá thành | `giaThanh` (Float, VND) | Có | — | `toLocaleString('vi-VN') + đ`, "—" nếu null |
| 7 | Mô tả | `moTaSanPham` | Có | — | Truncate max-w-xs |
| 8 | Hành động | — | — | — | Sửa (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD) · Xóa (ADMIN) |

**Tính năng nổi bật (tham chiếu tốt nhất cho các bảng khác):**

- **Server sort + filter + pagination** đầy đủ: `useProducts({page, limit, search, loaiSanPham, maSanPham, tenSanPham, donViTinh, sortBy, sortOrder})` — backend thực hiện, không filter client. `SortableColumnHeader` cho phép click header để sort, đổi cột thì reset `asc`.
- **Debounce 300ms** cho search và 2 filter text (`maSanPham`, `tenSanPham`) để tránh spam request.
- **Tự động gợi ý mã SP:** khi nhập `tenSanPham` + chọn `loaiSanPham`, sau 500ms gọi `generateProductCode`; người dùng sửa tay thì `codeTouched` khóa auto-suggest. Nút "Gợi ý" force overwrite.
- **Quản lý danh mục:** nút "Cài đặt" (ADMIN/DEPARTMENT_HEAD) mở `CategorySettingsModal` quản lý `ProductCategory`.
- **Phân trang:** selector `20/50/100` dòng/trang + "Hiển thị X–Y / Tổng" + ellipsis pagination. Export Excel truyền đầy đủ filter + sort hiện tại.
- **Phân quyền:** `canCreateEdit` (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD), `canDelete` (ADMIN), `canManageCategories` (ADMIN/DEPARTMENT_HEAD).

**Đề xuất cho nhân viên KD:**

| Đề xuất | Lý do |
|---------|-------|
| Thêm cột **Tồn kho hiện tại** (tổng `LotProduct` + `FinishedProduct`) | KD cần biết hàng nào còn tồn để ưu tiên báo giá, tránh hứa giao hàng không có sẵn. |
| Thêm filter **Khoảng giá thành** | Giúp KD lọc nhanh hàng hóa theo phân khúc giá khi tư vấn khách. |
| Hiển thị **Số đơn hàng liên quan** hoặc **Lần báo giá gần nhất** | KD nắm được SP nào đang hot, SP nào ít được hỏi. |

---

## 5. Hướng dẫn sử dụng

### 5.1. Quy trình thao tác chuẩn

1. **Vào tổng quan** `/business/management` để nắm KPI và xu hướng tháng. Click KPI card để nhảy tới tab tương ứng ở phòng QT (mặc định).
2. **Chọn phòng** QT (`/business/international`, icon Globe) hoặc NĐ (`/business/domestic`, icon Home). Hai phòng có UI giống nhau, chỉ khác màu chủ đạo và `customerType`.
3. **Lọc theo kỳ:** dùng 2 dropdown **Tháng/Năm** ở header để xem thống kê 4 thẻ overview theo kỳ (YCBG đã/chưa báo giá, báo giá theo 4 trạng thái, đơn hàng trong kỳ, phản hồi khẩn cấp/cao).
4. **Chuyển tab:** click tab hoặc dùng deep-link `?tab=orders` (hữu ích khi chia sẻ link hoặc từ thông báo).
5. **Tìm kiếm & lọc:** ô search + `TableFilter` (tùy tab). YCBG có thêm dropdown Trạng thái; Phản hồi có 3 dropdown; Hàng hóa có sort header + filter mỗi cột.
6. **Tạo mới:** nút "Thêm ..." (YCBG, Khách hàng, Hàng hóa, Phản hồi). YCBG cần chọn Khách hàng + ít nhất 1 Sản phẩm (có `soLuong` + `donViTinh`). Mã YCBG/Báo giá/Đơn hàng được backend tự sinh.
7. **Xem chi tiết:** click dòng (Order, Customer, Feedback, Product) hoặc icon Eye (YCBG, Báo giá). Modal chi tiết có đầy đủ thông tin + tab **Lịch sử hoạt động** (nếu là ADMIN/DEPARTMENT_HEAD).
8. **Chỉnh sửa / Xóa:** icon Edit/Trash trong cột Hành động (có phân quyền, ví dụ Báo giá chỉ ADMIN mới xóa).
9. **Tạo Báo giá từ YCBG:** trong bảng YCBG (mode pricing) nút FileText mở `QuotationCalculatorModal`; YCBG `CHO_XU_LY` tự chuyển `DANG_BAO_GIA`.
10. **Tạo Đơn hàng từ Báo giá:** nút ShoppingCart trong bảng Báo giá → `orderService.createOrderFromQuotation`.
11. **Xem bảng tính giá:** nút Calculator trong bảng Đơn hàng → tải YCBG gốc và mở `QuotationCalculatorModal` ở chế độ xem.
12. **Xuất Excel:** nút "Xuất Excel" ở mỗi bảng — YCBG/Báo giá/Hàng hóa truyền `search` (+ filter/sort với Hàng hóa); Order export toàn bộ; Feedback truyền `search` + `customerType`.

### 5.2. Lưu ý quan trọng

**Phân trang — 3 mức độ khác nhau trong cùng module:**

| Nhóm | Cơ chế | Đánh giá |
|------|--------|----------|
| **Server-side chuẩn** | YCBG, Báo giá, Đơn hàng, Hàng hóa | Đúng chuẩn: `page` + `limit` + `search` (+ `status`/`sort`) gửi backend, nhận `pagination {total, totalPages}`. Đơn hàng và Hàng hóa có selector limit (`10/20/50/100` hoặc `20/50/100`) tốt nhất. |
| **Client slice 10** | Phản hồi KH | Tải toàn bộ rồi `slice(10)` — sẽ chậm khi phản hồi > vài trăm. Cần chuyển server pagination. |
| **Fetch 1000 rồi slice** | Khách hàng QT/NĐ | `limit=1000` một lần rồi filter + slice client — không scale, và dư thừa nếu chỉ cần 10 dòng. Nên chuyển server pagination như YCBG. |

**QT vs NĐ — những điểm khác biệt cần nhớ:**

- **Cùng component, khác prop:** `QuotationRequestManagement`, `QuotationManagement`, `OrderManagement`, `CustomerFeedbackManagement` đều nhận `customerType="Quốc tế"` hoặc `"Nội địa"` và truyền xuống service. Không duplicate code.
- **Khách hàng tách component:** `InternationalCustomerManagement` vs `DomesticCustomerManagement` là 2 file riêng vì form khác nhau (QT: `quocGia`/`thanhPho`; NĐ: `tinhThanh`/`quanHuyen`/`maSoThue`). Bảng QT có cột Doanh thu năm, NĐ không có — bất đối xứng cần khắc phục.
- **YCBG form khác nhau:** QT có `quocGia`/`cangDen`/`tiGiaUSD`; NĐ có `cangDen` là "Địa chỉ giao hàng". Hình thức vận chuyển/thanh toán cũng khác options (QT: Đường biển/hàng không/L/C/T/T; NĐ: Giao tận nơi/Tiền mặt/Công nợ).
- **Báo cáo tách riêng:** `BusinessReport` gọi API riêng cho QT và NĐ rồi cộng dồn, hiển thị so sánh 2 năm.

**Các bẫy thường gặp:**

- **Số lượng gộp sai ĐVT** ở YCBG: tổng `soLuong` của nhiều ĐVT khác nhau (kg + thùng) ra con số vô nghĩa — cần tách theo ĐVT.
- **Báo giá thiếu Khách hàng ở bảng:** audit finding lớn nhất — KD phải mở detail mới biết báo giá của ai.
- **Đơn hàng thiếu Giá trị ở bảng:** API đã trả nhưng UI không show — KD không nắm quy mô đơn hàng khi lướt bảng.
- **Giá báo khách 2 nguồn:** `giaBaoKhach` vs `calculator.products[].giaHoaVon+loiNhuan` — cần thống nhất hiển thị.
- **Thông báo deep-link:** Order/Báo giá/YCBG hỗ trợ `?orderId=` / `?quotationId=` / `?quotationRequestId=` tự mở modal — hữu ích khi click từ chuông thông báo.

---

*Cập nhật: 2026-08-28 — trace từ `BusinessManagement.tsx`, `BusinessReport.tsx`, `BusinessInternational.tsx`, `BusinessDomestic.tsx`, 7 component bảng, `business_orders.prisma` và `App.tsx` routes.*
