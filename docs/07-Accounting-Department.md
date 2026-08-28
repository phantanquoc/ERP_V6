# Bộ phận Kế toán (Accounting Department)

## 1. Tổng quan

Bộ phận Kế toán quản lý toàn bộ dữ liệu tài chính của An Bình Foods trên ERP: hóa đơn mua/bán, giá trị tài sản tồn kho, công nợ phải trả nhà cung cấp, theo dõi đơn hàng dưới góc độ thanh toán và báo cáo thuế. Bộ phận chia thành **2 phòng con** độc lập về phân quyền: **KT Hành chính** (hóa đơn, tài sản, công nợ, đơn hàng) và **KT Thuế** (báo cáo thuế).

| Thông tin | Giá trị |
|-----------|---------|
| Route tổng quan | `/accounting` → `AccountingManagement.tsx` |
| Phòng KT Hành chính | `/accounting/admin` → `pages/accounting/AccountingAdmin.tsx` (4 tabs) |
| Phòng KT Thuế | `/accounting/tax` → `pages/accounting/AccountingTax.tsx` (1 tab) |
| Bảo vệ route gốc | `ProtectedModuleRoute module="accounting"` |
| Bảo vệ phòng con | `ProtectedSubRoute department="accounting"` với `subModule` = `admin` / `tax` |
| Quyền truy cập | Nhân viên phòng Kế toán + `ADMIN` (bypass toàn bộ ABAC) |
| Bộ lọc chung | Dropdown Tháng (1-12) + Năm (2023-2026) trên cả 3 trang |

Vì 2 phòng con được bảo vệ bằng `subModule` riêng, hệ thống có thể cấp quyền kế toán hành chính và kế toán thuế cho 2 người khác nhau. Sidebar hiển thị mục "Bộ phận kế toán" với 2 mục con tương ứng.

---

## 2. Tổng quan AccountingManagement — `/accounting`

File: `frontend/src/pages/AccountingManagement.tsx`

Trang landing của bộ phận. Khi mount hoặc khi đổi Tháng/Năm, trang gọi **4 API song song** (`Promise.all`):

| # | API | Tham số | Dùng để tính |
|---|-----|---------|--------------|
| 1 | `invoiceService.getAllInvoices` | `(1, 1000, undefined, month, year)` | Tổng + phân bố hóa đơn theo trạng thái |
| 2 | `debtService.getDebtSummary` | `(month, year)` | Tổng phải trả / đã thanh toán / còn nợ |
| 3 | `warehouseService.getAllWarehouses` | — | Tổng tài sản + số kho |
| 4 | `taxReportService.getAllTaxReports` | `(1, 1000, undefined, month, year)` | Tổng báo cáo + số chưa báo cáo |

Lần tải đầu hiển thị `LoadingSkeleton`; lỗi hiển thị `ErrorState` với nút thử lại. Nút **Làm mới** gọi lại cả 4 API; header cập nhật timestamp "Cập nhật lúc: HH:MM:SS".

### 2.1. Hàng KPI — 6 thẻ `KpiCard`

| # | Thẻ | Tone | Số liệu | Sub | Điều hướng |
|---|-----|------|---------|-----|------------|
| 1 | Hóa đơn | orange | Tổng số hóa đơn | "X đã thanh toán" | `/accounting/admin?tab=invoices` |
| 2 | Công nợ | red | Số khoản công nợ | "X còn nợ" (compact) | `/accounting/admin?tab=debts` |
| 3 | Tổng tài sản | blue | Tổng `soLuong x giaThanh` của mọi LotProduct trong mọi kho (VND compact) | "X kho" | `/accounting/admin?tab=assets` |
| 4 | Doanh thu | green | `tongPhaiTra` từ debt summary (compact) | "tổng phải trả" | — |
| 5 | Báo cáo thuế | amber | Tổng báo cáo thuế | "X chưa báo cáo" (đếm `CHUA_BAO_CAO`) | `/accounting/tax` |
| 6 | Tỷ lệ HĐ thanh toán | green | % hóa đơn đã thanh toán | "X hóa đơn" | — |

Số khoản công nợ (thẻ 2) ưu tiên lấy `soLuongCongNo` từ summary; nếu thiếu sẽ fallback bằng cách đếm danh sách trả về của `getAllDebts(month, year)`.

### 2.2. Hai biểu đồ tròn (donut, Recharts)

Cả hai dùng `PieChart` donut với `innerRadius=50 / outerRadius=80`, `paddingAngle=4`, số liệu tổng ở tâm, click thẻ dẫn vào tab tương ứng.

| Biểu đồ | Lát cắt | Tâm | Điều hướng |
|---------|---------|-----|------------|
| Hóa đơn theo trạng thái | 3 lát: Đã thanh toán / Chưa thanh toán / Đang xử lý (đếm theo `trangThai`) | Tổng số hóa đơn | `/accounting/admin?tab=invoices` |
| Tổng quan công nợ | 2 lát: Đã thanh toán / Còn nợ (theo **số tiền** từ summary) | Tổng phải trả (compact) | `/accounting/admin?tab=debts` |

Khi chưa có dữ liệu, mỗi biểu đồ hiển thị placeholder "Chưa có dữ liệu hóa đơn" / "Chưa có dữ liệu công nợ".

### 2.3. Khối tổng quan nhanh + điều hướng

- **Tổng quan nhanh** (`SectionCard`, chiếm 2/3 bề ngang): 4 ô lặp lại các chỉ số chính — Tổng tài sản, Công nợ còn lại (còn nợ / tổng phải trả), Hóa đơn (% đã thanh toán), Báo cáo thuế (chưa báo cáo).
- **Điều hướng nhanh** (1/3 bề ngang): 2 nút card — "Kế toán hành chính" (tone cam, icon Receipt) → `/accounting/admin`; "Kế toán thuế" (tone đỏ, icon FileText) → `/accounting/tax`.

---

## 3. Phòng KT Hành chính — AccountingAdmin (`/accounting/admin`)

File: `frontend/src/pages/accounting/AccountingAdmin.tsx`

Header "Phòng KT Hành chính" với bộ lọc Tháng/Năm. Tab hiện tại đồng bộ vào URL query `?tab=` (deep-link từ dashboard hoạt động, ví dụ `/accounting/admin?tab=debts`). Tab mặc định là `invoices`.

### 3.1. Khối tổng quan 2x2 phía trên tabs

Trang gọi 4 API song song (`warehouseService.getAllWarehouses`, `debtService.getDebtSummary`, `invoiceService.getAllInvoices(1,1000)`, `orderService.getAllOrders(1,1000)`) rồi render 4 card; mọi ô chỉ số đều click được để chuyển tab tương ứng.

| Card | Chỉ số chính | Chỉ số phụ | Tab đích |
|------|--------------|------------|----------|
| Tổng quan tài sản | Tổng tài sản = tổng `soLuong x giaThanh` qua các kho | Tổng công nợ / Đã thanh toán / Chưa thanh toán | debts |
| Tổng quan doanh thu | Tổng `thanhTien` của các hóa đơn | Quốc tế / Nội địa — phân loại theo `invoice.customer.quocGia` (có quocGia = quốc tế) | orders |
| Hóa đơn | Tổng hóa đơn | Đã TT / Chưa TT / Đang xử lý | invoices |
| Đơn hàng | Tổng đơn hàng | Đang sản xuất / Chờ giao hàng / Đã giao (đếm theo `trangThaiSanXuat`) | orders |

### 3.2. Tab Hóa đơn (`?tab=invoices`)

- **Component:** `frontend/src/components/InvoiceManagement.tsx`
- **Model Prisma:** `Invoice` (`business_orders.prisma`) — các trường chính: `soHoaDon` (unique), `ngayLap`, `customerId`, `maSoThue`, `loaiHoaDon`, `boPhanSuDung`, `mucDichSuDung`, `tongTien`, `thueVAT`, `thanhTien`, `trangThai` (mặc định "Chưa thanh toán"), `phuongThucThanhToan`, `ngayThanhToan`, `nhanVienLap`, `ghiChu`, `files: String[]`
- **Nhận prop:** `month`, `year` từ trang cha

**Bảng chính — 8 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `(currentPage-1)*10 + index + 1` | Đánh số theo trang |
| 2 | Số hóa đơn | `soHoaDon` | In đậm xanh; tự sinh `HD-{năm}-{số 3 chữ số}` khi thêm mới |
| 3 | Ngày lập | `ngayLap` | `toLocaleDateString('vi-VN')` |
| 4 | Khách hàng | `customer.tenCongTy` | "-" nếu không có |
| 5 | Loại hóa đơn | `loaiHoaDon` | Bán hàng / Mua hàng / Dịch vụ |
| 6 | Thành tiền | `thanhTien` | VND, in đậm |
| 7 | Trạng thái | `trangThai` | Badge: Đã thanh toán (xanh lá) / Chưa thanh toán (đỏ) / Đang xử lý (vàng) |
| 8 | Hoạt động | — | Chỉ có nút **Xóa** (Trash2); sửa thông qua modal chi tiết |

**Tính năng:**

- `TableFilter`: tìm kiếm theo số hóa đơn / tên khách hàng, dropdown **Loại hóa đơn** (3 giá trị) và **Trạng thái** (3 giá trị). Lọc hoàn toàn client-side.
- Nút **Thêm hóa đơn**: form với số hóa đơn tự sinh (read-only), ngày lập, khách hàng (chọn khách tự điền `maSoThue`), loại hóa đơn, bộ phận sử dụng, mục đích sử dụng, tổng tiền, thuế VAT %, thành tiền **tự tính = tổng tiền x (1 + VAT/100)** (có thể sửa tay), trạng thái, phương thức thanh toán (Tiền mặt / Chuyển khoản / Thẻ), ngày thanh toán, nhân viên lập tự điền từ user đăng nhập, ghi chú, upload nhiều file đính kèm.
- Nút **Hóa đơn mua nhanh**: mở cùng form nhưng đặt sẵn `loaiHoaDon = "Mua hàng"` và `boPhanSuDung` = phòng ban người dùng hiện tại — dùng cho hóa đơn chi phí nội bộ.
- Click dòng → modal **Chi tiết hóa đơn** (đầy đủ trường kể cả tổng tiền, VAT, phương thức/ngày thanh toán, nhân viên lập, bộ phận/mục đích sử dụng, danh sách file) → từ đó có nút **Chỉnh sửa**.
- Deep-link `?invoiceId=` tự động mở modal chi tiết (dùng từ thông báo).
- Nút **Xuất Excel** gọi `exportToExcel({search})`.

**Pagination:** fetch `getAllInvoices(1, 100, ...)` rồi filter + slice client-side 10/trang → **bị vô hiệu hóa** (xem mục 6).

**Thiếu gì / Đề xuất cho kế toán:**

| Vấn đề | Đề xuất |
|--------|---------|
| Bảng chỉ có **Thành tiền**, không thấy **Tổng tiền** và **Thuế VAT %** | Thêm cột Tổng tiền và % VAT để đối chiếu trước/sau thuế và tính nhanh nghĩa vụ thuế ngay trên bảng |
| Thiếu **Ngày thanh toán** | Thêm cột để quét nhanh hóa đơn nào đã trả tiền, trả khi nào — không phải mở từng modal |
| Thiếu **Phương thức thanh toán** | Thêm cột hoặc icon phân biệt Tiền mặt / Chuyển khoản / Thẻ phục vụ đối soát sổ quỹ |
| Thiếu **Nhân viên lập** | Thêm cột để truy vết ai lập hóa đơn khi cần đối chiếu |
| Không biết hóa đơn nào có **file đính kèm** | Thêm icon kẹp giấy khi `files.length > 0` để biết chứng từ đã đủ chưa |

### 3.3. Tab Quản lý tài sản (`?tab=assets`)

- **Component:** `frontend/src/components/AssetManagement.tsx` (render với `hideHeader`)
- **Nguồn dữ liệu:** `warehouseService.getAllWarehouses()` — cấu trúc **Kho → Lô (`lots`) → Sản phẩm trong lô (`lotProducts`)**; mỗi `LotProduct` có `soLuong`, `donViTinh`, `giaThanh` liên kết `InternationalProduct`
- **Không nhận** prop `month`/`year` — tài sản là snapshot tồn kho, không lọc theo thời gian

**Cấu trúc hiển thị:**

1. Thanh tabs ngang theo từng **kho** (sắp xếp theo số trong tên kho, tự chọn kho đầu tiên).
2. Với kho đang chọn: header tổng kết **Tổng số lô** + **Tổng thành tiền** (tổng `soLuong x giaThanh` của kho).
3. Danh sách **lô** — mỗi lô là một card riêng gồm header (tên lô, số sản phẩm, tổng thành tiền của lô) và **bảng sản phẩm 6 cột**:

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | Tên hàng hóa | `internationalProduct.tenSanPham` + dòng phụ Mã SP | 2 dòng trong 1 ô |
| 2 | Số lượng | `soLuong` | Format `vi-VN` |
| 3 | Đơn vị | `donViTinh` | |
| 4 | Đơn giá | `giaThanh` | VND; sản phẩm chưa nhập giá = 0 |
| 5 | Thành tiền | `soLuong x giaThanh` | Màu xanh lá, in đậm |
| 6 | Hành động | — | **Rỗng** — action buttons đã bị gỡ, thao tác qua click dòng (code comment: "Actions removed - use row click to view") |

**Tính năng:**

- `TableFilter`: tìm kiếm theo tên/mã sản phẩm + filter text theo **tên lô**.
- Phân trang client-side trên danh sách **lô** (10 lô/trang).
- Click dòng sản phẩm → modal **Chi tiết sản phẩm**: mã SP, tên SP, lô, kho, số lượng, đơn giá, thành tiền, loại sản phẩm, mô tả → nút **Chỉnh sửa**.
- Modal chỉnh sửa chỉ cho phép sửa **Đơn giá** (không sửa số lượng), xem trước thành tiền, lưu qua `warehouseService.updateProductQuantity(id, {giaThanh})`.

**Pagination:** toàn bộ dữ liệu kho-lô-sản phẩm tải 1 lần (`getAllWarehouses()` không phân trang) → chỉ phù hợp khi quy mô kho còn nhỏ.

**Thiếu gì / Đề xuất cho kế toán:**

| Vấn đề | Đề xuất |
|--------|---------|
| Cột **Hành động rỗng** chiếm bề ngang vô ích | Bỏ hẳn cột, hoặc đặt nút "Sửa giá" nhanh tại chỗ thay vì bắt buộc mở 2 lớp modal |
| Thiếu **Mã kiện / Vị trí** trong kho | Kế toán kiểm kê thực tế cần biết kiện hàng nằm ở đâu — thêm cột vị trí nếu model hỗ trợ |
| Thiếu **Loại sản phẩm** | Chỉ hiển thị trong modal chi tiết; nên đưa ra bảng hoặc filter để phân nhóm tài sản |
| Thiếu **Ngày nhập lô** | Cần cho đánh giá FIFO, tuổi tồn kho và tính khấu hao |
| Sản phẩm `giaThanh = 0` không được cảnh báo | Highlight dòng chưa nhập giá để kế toán biết tổng tài sản đang bị tính thiếu |

### 3.4. Tab Danh sách công nợ (`?tab=debts`)

- **Component:** `frontend/src/components/DebtManagement.tsx`
- **Model Prisma:** `Debt` — các trường chính: `ngayPhatSinh`, `loaiChiPhi`, `supplierId` + `maNhaCungCap` + `tenNhaCungCap`, `loaiCungCap`, `cungCap`, `noiDungChiCho`, `loaiHinh`, `soTienPhaiTra`, `soTienDaThanhToan` (mặc định 0), `ngayHoachToan`, `ngayDenHan`, `soTaiKhoan`, `ghiChu`, `files: String[]`
- **Nhận prop:** `month`, `year`; bảng render qua component `DataTable` của design-system

**Bảng chính — 7 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `_stt` | Đánh số theo trang |
| 2 | Ngày phát sinh | `ngayPhatSinh` | Sortable |
| 3 | Loại chi phí | `loaiChiPhi` | Đơn hàng / Sửa chữa / Đầu tư / Văn phòng phẩm / Khác; sortable |
| 4 | Số tiền phải trả | `soTienPhaiTra` | Màu đỏ, align right, sortable |
| 5 | Số tiền đã thanh toán | `soTienDaThanhToan` | Màu xanh lá, align right, sortable |
| 6 | Trạng thái | tính client-side | Badge: Đã thanh toán (xanh) / Chưa thanh toán (vàng) / Quá hạn (đỏ) |
| 7 | Hoạt động | — | Chỉ có nút **Xóa** |

Trạng thái không lưu DB mà **suy ra client-side**: `daThanhToan >= phaiTra && phaiTra > 0` → Đã thanh toán; `ngayDenHan < hôm nay` → Quá hạn; còn lại → Chưa thanh toán.

**Tính năng:**

- `TableFilter`: tìm kiếm theo mã/tên NCC/loại chi phí; dropdown **Loại chi phí** (5 giá trị) và **Trạng thái thanh toán** (chưa / đã). Sort client-side trên 4 cột sortable.
- Gọi thêm `debtService.getDebtSummary(month, year)` lưu vào state `summary` — **lưu ý: state này hiện không được render ở đâu trong component**; số liệu tổng quan công nợ do card tổng quan của trang cha (mục 3.1) đảm nhận.
- Nút **Thêm mới**: form 14 trường — ngày phát sinh, loại chi phí, tên NCC (chọn từ `useSupplierOptions`, tự điền mã NCC), loại cung cấp (Bao bì / Nguyên vật liệu / Dịch vụ / Khác), cung cấp, nội dung chi cho, loại hình (Tổ chức / Hộ gia đình / Cá nhân), số tiền phải trả, số tiền đã thanh toán, ngày hoạch toán, ngày đến hạn, số tài khoản, ghi chú.
- Click dòng → modal **Chi tiết công nợ** hiển thị đầy đủ các trường trên **cộng thêm cột Còn nợ** = `phải trả - đã trả` (thông tin quan trọng nhất nhưng chỉ thấy ở đây) → nút Chỉnh sửa.
- Deep-link `?debtId=` tự mở modal chi tiết. Nút **Xuất Excel**.

**Pagination:** `getAllDebts(month, year)` fetch toàn bộ theo tháng/năm (không truyền page/limit) rồi slice client-side 10/trang → **bị vô hiệu hóa** khi số bản ghi lớn.

**Thiếu gì / Đề xuất cho kế toán (ảnh hưởng trực tiếp nghiệp vụ):**

| Vấn đề | Đề xuất |
|--------|---------|
| Bảng công nợ **không có cột Nhà cung cấp** | Bắt buộc thêm — nhìn bảng hiện tại không thể biết đang nợ ai. Đây là thiếu sót nghiêm trọng nhất của tab này |
| Thiếu cột **Còn nợ** | Đang chỉ tính trong modal; đưa ra bảng chính để quét nhanh dư nợ từng khoản |
| Thiếu **Ngày đến hạn** | Cần để lọc khoản sắp/quá hạn thanh toán và lên kế hoạch dòng tiền (badge Quá hạn đã có nhưng không thấy ngày cụ thể) |
| Thiếu **Số tài khoản** | Phục vụ đối soát khi lập lệnh chuyển tiền |
| Input "File đính kèm" trong form thêm/sửa **chọn file nhưng không gửi lên server** (formData không chứa file) | Cần upload thật như bên Hóa đơn, hoặc gỡ field để tránh hiểu nhầm chứng từ đã được lưu |

### 3.5. Tab Danh sách đơn hàng (`?tab=orders`)

- **Component:** `frontend/src/components/OrderManagement.tsx` (render với `hideHeader`, không truyền `customerType` → hiển thị đơn hàng **cả quốc tế lẫn nội địa**)
- **Model Prisma:** `Order` — đáng chú ý cho kế toán: `giaTriDonHangUSD`, `giaTriDonHangVND`, `xuatKhauDot1USD`, `noiDiaDot1VND`, `ngayThanhToanDot1`, `xuatKhauDot2USD`, `noiDiaDot2VND`, `ngayThanhToanDot2`, `trangThaiSanXuat` (7 trạng thái), `trangThaiThanhToan` (3 trạng thái)
- **Không nhận** prop `month`/`year` — bộ lọc Tháng/Năm của trang cha **không ảnh hưởng tab này** (chỉ ảnh hưởng 3 card tổng quan có dùng orders)

**Bảng chính — 9 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | `(currentPage-1)*limit + index + 1` | |
| 2 | Ngày đặt hàng | `ngayDatHang` | |
| 3 | Mã đơn hàng | `maDonHang` | In đậm xanh |
| 4 | Mã báo giá | `maBaoGia` | |
| 5 | Khách hàng | `tenKhachHang` | |
| 6 | Số lượng SP | `items.length` | Số dòng sản phẩm |
| 7 | Trạng thái SX | `trangThaiSanXuat` | Badge 7 trạng thái: Chờ lên kế hoạch → Chờ sản xuất → Đang sản xuất → Chờ giao hàng → Đã lên container → Đang vận chuyển → Đã giao cho khách hàng |
| 8 | Trạng thái TT | `trangThaiThanhToan` | Badge 3 trạng thái: Đã thanh toán đợt 1 / Chờ thanh toán đợt 2 / Đã thanh toán đủ |
| 9 | Hành động | — | Xem bảng tính giá (`QuotationCalculatorModal`, icon Calculator) · Xóa |

**Tính năng:**

- Hook `useOrders` (TanStack Query) — **đây là bảng duy nhất trong cả module kế toán dùng server-side pagination chuẩn** (`page`, `limit`, `search`, `status`), có selector 10/20/50/100 bản ghi mỗi trang và hiển thị "Hiển thị X-Y / Tổng".
- `TableFilter`: Mã ĐH, Mã BG, Khách hàng, Trạng thái SX + ô search.
- Click dòng → modal chi tiết gồm tab **Thông tin** (mã ĐH/BG/YCBG, khách hàng, nhân viên phụ trách, **giá trị USD/VND**, thanh toán đợt 1 và đợt 2 gồm số tiền XK/NĐ + ngày, 4 mốc ngày sản xuất, danh sách hàng hóa 7 cột) và tab **Lịch sử hoạt động** (audit log, chỉ ADMIN/DEPARTMENT_HEAD).
- Nút **Chỉnh sửa** trong modal yêu cầu quyền ADMIN hoặc DEPARTMENT_HEAD; edit được giá trị đơn hàng, thanh toán 2 đợt, mốc sản xuất, trạng thái, ghi chú.
- Deep-link `?orderId=`. Nút **Xuất Excel**.

**Thiếu gì / Đề xuất cho kế toán:**

| Vấn đề | Đề xuất |
|--------|---------|
| **Giá trị đơn hàng USD/VND** không có ở bảng chính dù API đã trả và modal đã hiển thị | Thêm 1-2 cột giá trị để kế toán nắm doanh thu từng đơn ngay trên bảng, không phải mở từng dòng |
| Thiếu **Ngày thanh toán đợt 1/2** | Thêm cột hoặc icon cảnh báo đơn đang "Chờ thanh toán đợt 2" để theo dõi dòng tiền về |
| Tab không lọc theo Tháng/Năm như 3 tab còn lại | Nếu cần đối soát theo kỳ, nên truyền month/year xuống hoặc ghi chú rõ cho người dùng |

---

## 4. Phòng KT Thuế — AccountingTax (`/accounting/tax`)

Files: `frontend/src/pages/accounting/AccountingTax.tsx` (trang) + `frontend/src/components/TaxReportTab.tsx` (bảng).

- **Model Prisma:** `TaxReport` — quan hệ **1-1 với `Order`** (`orderId` unique): báo cáo thuế sinh tự động từ đơn hàng, không tạo độc lập được. Các trường: `maDonHang`, `ngayDatHang`, `tenHangHoa` (string gộp), `soLuong`, `donViTinh`, `giaTriDonHang`, `soTienDongThue`, `trangThai` (enum 5 trạng thái), `ghiChu`, `fileUrl`.
- Header "Phòng KT thuế" với bộ lọc Tháng/Năm; enum `TaxReportStatus`: `CHUA_BAO_CAO` (mặc định) → `DANG_CAP_NHAT_HO_SO` → `DA_DAY_DU_HO_SO` → `DA_BAO_CAO` → `DA_QUYET_TOAN`.

### 4.1. Khối tổng quan (2 card)

Trang tự fetch `getAllTaxReports(1, 1000, undefined, month, year)` để tính 2 card:

| Card | Nội dung |
|------|----------|
| Tổng quan báo cáo thuế | Tổng số báo cáo + 5 ô đếm theo trạng thái: Chưa báo cáo / Đang cập nhật hồ sơ / Đủ hồ sơ / Đã báo cáo / Đã quyết toán |
| Tổng quan tiền thuế | Tổng giá trị đơn hàng (cộng `giaTriDonHang`), Tổng tiền thuế (cộng `soTienDongThue`), **Tỷ lệ thuế trung bình** = tổng thuế / tổng giá trị x 100 |

### 4.2. Tab Báo cáo thuế (TaxReportTab)

Tab duy nhất của phòng, tiêu đề tĩnh "Báo cáo thuế". Component nhận `month`/`year` từ trang cha, fetch `getAllTaxReports(1, 100, undefined, month, year)`.

**Bảng chính — 12 cột:**

| # | Cột | Field | Ghi chú |
|---|-----|-------|---------|
| 1 | STT | index theo trang | |
| 2 | Ngày đặt hàng | `ngayDatHang` | Có icon lịch |
| 3 | Mã Đơn Hàng | `maDonHang` | In đậm xanh |
| 4 | Tên hàng hoá | `tenHangHoa` | String backend join các item — dài và khó đọc khi đơn nhiều sản phẩm |
| 5 | Số lượng | `soLuong` | |
| 6 | Đơn vị | `donViTinh` | |
| 7 | Giá trị đơn hàng | `giaTriDonHang` | VND |
| 8 | Số tiền đóng thuế | `soTienDongThue` | "-" nếu chưa nhập |
| 9 | Trạng thái | `trangThai` | Badge 5 màu: Chưa báo cáo (xám) / Đang cập nhật hồ sơ (vàng) / Đã đầy đủ hồ sơ (xanh dương) / Đã báo cáo (xanh lá) / Đã quyết toán (tím) |
| 10 | Ghi chú | `ghiChu` | |
| 11 | File đính kèm | `fileUrl` | Link "Xem file" mở tab mới |
| 12 | Hoạt động | — | Sửa (Edit) · Xóa (Trash2) |

**Tính năng:**

- Modal **Chỉnh sửa** chia 2 khu: khu read-only "Thông tin tự động (từ đơn hàng)" gồm mã ĐH, ngày đặt, tên hàng hóa, số lượng, giá trị; khu editable gồm **Số tiền đóng thuế**, **Trạng thái** (select 5 giá trị), **Ghi chú**, **File đính kèm (URL)** — file nhập dạng URL text, không phải upload.
- Nút **Xuất Excel**.
- Không có `TableFilter` — tab này không tìm kiếm/lọc theo trạng thái hay mã đơn hàng, chỉ có bộ lọc Tháng/Năm từ trang cha.

**Pagination:** fetch `limit=100` rồi slice client-side 10/trang → **bị vô hiệu hóa** khi vượt 100 báo cáo.

**Thiếu gì / Đề xuất cho kế toán thuế:**

| Vấn đề | Đề xuất |
|--------|---------|
| Thiếu **Khách hàng / Quốc gia** | Cần để phân biệt nghĩa vụ thuế xuất khẩu vs nội địa — hiện phải tra ngược sang đơn hàng |
| Thiếu **Tỷ lệ thuế %** từng dòng | Thêm cột tính `thuế / giá trị x 100` để soát nhanh dòng nào bất thường |
| Thiếu **Ngày tạo / Ngày cập nhật** (`createdAt`/`updatedAt` có sẵn trong model) | Phục vụ truy vết tiến độ hoàn thiện hồ sơ |
| Cột Tên hàng hoá là chuỗi join khó đọc | Tách dòng theo item hoặc hiển thị "SP đầu tiên + N sản phẩm khác" kèm tooltip |
| Không có tìm kiếm/filter trong tab | Thêm lọc theo trạng thái và mã đơn hàng — trạng thái "Chưa báo cáo" là việc cần làm nhất của KT thuế |

---

## 5. Hướng dẫn sử dụng

### 5.1. Xem tổng quan tài chính theo kỳ

1. Vào `/accounting`, chọn Tháng và Năm ở header.
2. Đọc 6 KPI và 2 biểu đồ; bấm **Làm mới** nếu cần số liệu mới nhất.
3. Click KPI/card hoặc 2 nút điều hướng để đi thẳng vào phòng và tab tương ứng.

### 5.2. Lập hóa đơn

1. Vào `/accounting/admin?tab=invoices` → **Thêm hóa đơn** (chi phí nội bộ dùng **Hóa đơn mua nhanh**).
2. Chọn khách hàng — mã số thuế tự điền theo khách.
3. Nhập Tổng tiền + Thuế VAT % — Thành tiền tự tính, có thể sửa tay nếu cần.
4. Chọn trạng thái, phương thức/ngày thanh toán, đính kèm file chứng từ gốc → Lưu.
5. Click dòng hóa đơn để xem lại đầy đủ chi tiết; từ modal chi tiết có thể **Chỉnh sửa**.

### 5.3. Theo dõi công nợ phải trả

1. Vào `/accounting/admin?tab=debts`; số liệu tổng (phải trả / đã trả / còn nợ) nằm ở card **Tổng quan tài sản** phía trên tabs.
2. **Thêm mới**: chọn nhà cung cấp từ danh sách (mã NCC tự điền), nhập số tiền phải trả, đã thanh toán, ngày đến hạn, số tài khoản.
3. Lọc trạng thái "Chưa thanh toán" để xem các khoản cần trả; badge **Quá hạn** tự tính dựa trên ngày đến hạn.
4. Click từng dòng để xem chi tiết — cột **Còn nợ** chỉ hiển thị trong modal này.

### 5.4. Cập nhật đơn giá tài sản

1. Vào `/accounting/admin?tab=assets` → chọn tab kho → click dòng sản phẩm cần định giá.
2. Trong modal chi tiết → **Chỉnh sửa** → nhập Đơn giá (VND) → xem trước thành tiền → Lưu.
3. Tổng tài sản ở dashboard và card tổng quan tự cập nhật theo.

### 5.5. Báo cáo thuế theo đơn hàng

1. Vào `/accounting/tax` — danh sách báo cáo được sinh tự động từ đơn hàng (1 đơn = 1 báo cáo).
2. Theo dõi tiến độ qua 5 ô đếm trạng thái ở card tổng quan.
3. Với dòng "Chưa báo cáo": bấm Sửa → nhập Số tiền đóng thuế, chọn trạng thái hồ sơ, dán URL file đính kèm, ghi chú → Lưu.
4. Khi đủ hồ sơ chuyển trạng thái tăng dần tới "Đã báo cáo" / "Đã quyết toán".

### 5.6. Xuất dữ liệu ra Excel

Cả 5 bảng (Hóa đơn, Công nợ, Tài sản gián tiếp qua hóa đơn, Đơn hàng, Báo cáo thuế) đều có nút **Xuất Excel**. Khi số bản ghi vượt ngưỡng phân trang (xem Lưu ý bên dưới), đây là cách lấy đủ dữ liệu.

---

## 6. Lưu ý quan trọng

- **CRITICAL — Pagination bị vô hiệu ở 4/5 bảng:** Hóa đơn và Thuế fetch tối đa 100 bản ghi rồi phân trang client-side; Công nợ và Tài sản fetch toàn bộ một lần rồi slice. **Dữ liệu vượt quá 100 bản ghi (Hóa đơn/Thuế) sẽ biến mất khỏi bảng.** Chỉ tab Đơn hàng (`OrderManagement`) dùng server-side pagination chuẩn. Khi số lượng lớn, dùng **Xuất Excel** để lấy đủ dữ liệu, và kiến nghị chuyển 4 bảng còn lại sang server-side pagination như mẫu `useOrders`.
- **Trần 1000 bản ghi ở trang tổng quan:** `AccountingManagement` và `AccountingAdmin` fetch `limit=1000` để tính KPI/card — số liệu tổng quan có thể thiếu khi dữ liệu rất lớn.
- **Trạng thái công nợ không lưu DB:** được suy ra client-side từ `soTienPhaiTra` / `soTienDaThanhToan` / `ngayDenHan`; đổi logic phải sửa ở `DebtManagement.getDebtStatus`.
- **Tổng tài sản phụ thuộc `giaThanh`:** sản phẩm chưa nhập giá (= 0) không được tính vào tổng — cần rà soát định kỳ các dòng đơn giá 0.
- **Phân loại quốc tế / nội địa trong card doanh thu** dựa trên `customer.quocGia` của **hóa đơn**, không dựa trên đơn hàng.
- **Báo cáo thuế gắn 1-1 với đơn hàng:** không tạo báo cáo thuế độc lập; tên hàng hóa là chuỗi gộp từ backend nên đơn nhiều sản phẩm sẽ khó đọc.
- **File đính kèm công nợ chưa hoạt động:** form Thêm/Sửa công nợ có input chọn file nhưng file không được gửi lên server (khác với Hóa đơn upload thật).
- **Tab Đơn hàng không theo bộ lọc Tháng/Năm** của trang KT Hành chính; bộ lọc chỉ ảnh hưởng các card tổng quan.
- **Quy ước ngày tháng:** API dùng `YYYY-MM-DD`, UI hiển thị `DD/MM/YYYY` (`vi-VN`).

---

## 7. Tham chiếu nhanh

### 7.1. Phân quyền

| Vai trò | Phạm vi |
|---------|---------|
| Nhân viên phòng Kế toán | `/accounting` và các phòng con theo `subModule` được cấp (`admin` / `tax`) |
| KT Hành chính | 4 tab hóa đơn, tài sản, công nợ, đơn hàng |
| KT Thuế | Báo cáo thuế |
| ADMIN | Toàn quyền, bypass ABAC; thêm quyền sửa đơn hàng và xem audit log đơn hàng |

### 7.2. Model Prisma (schema `business`)

| Model | Bảng | Dùng trong |
|-------|------|-----------|
| `Invoice` | `invoices` | Tab Hóa đơn + KPI tổng quan |
| `Debt` | `debts` | Tab Công nợ + summary tổng quan |
| `TaxReport` | `tax_reports` | Phòng KT Thuế |
| `Order` | `orders` | Tab Đơn hàng (read/edit giới hạn) |
| `Warehouse` → `Lot` → `LotProduct` | `warehouses` / `lots` / `lot_products` | Tab Tài sản |

### 7.3. Nguồn dữ liệu theo component

| Component | Service | API chính |
|-----------|---------|-----------|
| AccountingManagement | `invoiceService`, `debtService`, `warehouseService`, `taxReportService` | `getAllInvoices`, `getDebtSummary`, `getAllWarehouses`, `getAllTaxReports` |
| AccountingAdmin | 4 services trên + `orderService` | Thêm `getAllOrders(1, 1000, ...)` cho card tổng quan |
| InvoiceManagement | `invoiceService` | `getAllInvoices(1, 100, search, month, year)` |
| DebtManagement | `debtService` | `getAllDebts(month, year)`, `getDebtSummary(month, year)` |
| AssetManagement | `warehouseService` | `getAllWarehouses()`, `updateProductQuantity` |
| OrderManagement | hook `useOrders` → `orderService` | `getAllOrders(page, limit, search, customerType, status)` |
| TaxReportTab | `taxReportService` | `getAllTaxReports(1, 100, undefined, month, year)` |
