# Bộ phận Sản xuất

## 1. Tổng quan

Bộ phận Sản xuất là trung tâm vận hành của nhà máy — quản lý máy móc, quy trình chế biến, đơn hàng, định mức nguyên liệu, đánh giá chất lượng và kho sản xuất. Mọi dữ liệu vận hành đều gắn với khái niệm **ngày sản xuất** (production day) chạy từ 06:30 hôm nay đến 06:29:59 hôm sau, đảm bảo ca đêm (00:30–05:00) vẫn thuộc đúng ngày.

| Thuộc tính | Giá trị |
|---|---|
| Route gốc | `/production` |
| Route con | `/production/management` (Phòng QLSX), `/production/warehouse` (Quản lý kho), `/production/data` (Dữ liệu SX), `/production/nhap-lieu-hub` (Kiosk hub) |
| Kiosk wizard | `/production/nhap-lieu` (Sản lượng chiên), `/production/nhap-lieu-danh-gia` (Đánh giá NL), `/production/nhap-lieu-van-hanh` (Vận hành) |
| Quyền truy cập | `production` + `ADMIN` (toàn quyền). `ProtectedModuleRoute module="production"` ở `/production`; `ProtectedSubRoute department="production" subModule="management|data|warehouse"` cho 3 phòng con |
| File tổng quan | `frontend/src/pages/ProductionManagement.tsx` (413 dòng) |

### Kiến trúc 3 phòng con

```
ProductionManagement (/production)            ← dashboard KPI, không có bảng
  ├── ProductionDepartment (/production/management)  ← 9 tabs — bảng nặng
  ├── ProductionWarehouse  (/production/warehouse)   ← 4 cards + 6 tabs delegate
  └── ProductionData       (/production/data)        ← 4 tabs — dữ liệu SX theo ngày SX
        └── Kiosk Hub (/production/nhap-lieu-hub)    ← 3 wizard tablet
```

---

## 2. Tổng quan Sản xuất — ProductionManagement (`/production`)

> File: `frontend/src/pages/ProductionManagement.tsx`

Trang tổng quan **không có bảng** — chỉ hiện KPI và biểu đồ, đóng vai trò hub điều hướng sang 3 phòng con.

### Nguồn dữ liệu

`loadAllStats()` gọi `Promise.allSettled` đồng thời 7 nguồn (mỗi nguồn fail độc lập, không kéo sập cả trang):

| # | Service | Dữ liệu lấy |
|---|---|---|
| 1 | `machineSystemService.getMachineSystems` | Máy móc (HOAT_DONG / BAO_TRI / NGUNG) |
| 2 | `orderService.getAllOrders` | Đơn hàng theo `trangThaiSanXuat` (7 trạng thái) |
| 3 | `finishedProductService.getAllFinishedProducts` | Thành phẩm (tổng + tháng này) |
| 4 | `warehouseService.getAllWarehouses` | Kho + lô + lotProducts |
| 5 | `warehouseReceiptService.getAllWarehouseReceipts` | Phiếu nhập |
| 6 | `warehouseIssueService.getAllWarehouseIssues` | Phiếu xuất |
| 7 | `supplyRequestService.getAllSupplyRequests` | Yêu cầu cung cấp |

### Bố cục

| Vùng | Thành phần | Nội dung |
|---|---|---|
| Hero KPI strip | 5 `KpiCard` | Tỷ lệ hoạt động (%), Tổng đơn hàng, Đang SX, Đã giao, Thành phẩm tháng này |
| Bento Row A | Donut + Bar | `PieChart` trạng thái máy (innerRadius 55) + `SectionCard` phân bổ 7 trạng thái đơn hàng + `ProgressBar` |
| Bento Row B | 2 `SectionCard` | Tổng quan kho (số kho / kho có hàng / tổng lô / lô trống + strip phiếu tháng này) + Yêu cầu cung cấp (`CircularProgress` tỷ lệ hoàn thành) |
| Row C | 3 `NavCard` | Phòng QLSX, Dữ liệu SX, Kho SX — điều hướng trực tiếp |

> Tính toán `machineRate` / `supplyRate` làm tròn `%`; `warehouseStats` đếm `lots` + `lotProducts.soLuong > 0`; `receiptThangNay`/`issueThangNay` lọc theo `createdAt` hoặc `ngayNhap`/`ngayXuat` của tháng hiện tại.

---

## 3. Quản lý kho — ProductionWarehouse (`/production/warehouse`)

> File: `frontend/src/pages/production/ProductionWarehouse.tsx` (643 dòng)

Trang này **không có bảng trực tiếp** — toàn bộ bảng nằm trong 6 tab delegate. Bản thân trang chỉ hiện **4 overview cards** tính từ `Promise.allSettled` (warehouses + receipts + issues + supplyRequests) và thanh lọc tháng/năm.

### 3.1. Bốn overview cards

| Card | Tiêu đề | Số liệu hiện | Cách tính |
|---|---|---|---|
| 1 | Tổng quan tồn kho | Số kho / Kho trống / Lô trống / Có hàng / Tổng giá trị tồn (VND) | Đếm `warehouses`, `lots`, `lotProducts.soLuong>0`, `soLuong*giaThanh` |
| 2 | Tổng quan nhập xuất | Phiếu nhập / Phiếu xuất + Top 3 sản phẩm nhập/xuất | Đếm `receipts`/`issues`, group theo `tenSanPham` |
| 3 | Yêu cầu cung cấp (funnel) | Tổng YC + 4 nhóm: Chờ xử lý / Chờ bổ sung / Đang mua / Đã cung cấp + badge ưu tiên cao | Phân loại theo `trangThai` (4 Set), đếm `mucDoUuTien === 'Cao'` |
| 4 | Hàng hóa còn tồn | Top 5 mặt hàng tồn nhiều nhất (tên + kho + số lượng + ĐVT) | Aggregate `lotProducts` theo `warehouseId+tenSanPham+donViTinh` |

Mỗi ô số đều `clickable` — bấm để nhảy tới tab tương ứng (`goToTab` + `scrollIntoView`). Có filter tháng/năm ảnh hưởng card 2.

### 3.2. Sáu tab delegate

Thanh tab: `supplyRequest | inventory | inbound | outbound | products | warehouseManagement`. Tab hiện tại đồng bộ URL (`?tab=`).

#### Tab 1 — Danh sách yêu cầu cung cấp

- **Component:** `SupplyRequestManagement.tsx` (1230 dòng)
- **Model Prisma:** `SupplyRequest` + `SupplyRequestItem` + `SupplyRequestDecision` (`business`)
- **Bảng chính — 9 cột:**

| # | Cột | Ghi chú |
|---|---|---|
| 1 | # | STT tính `(page-1)*10+index+1` |
| 2 | Ngày YC | `ngayYeuCau` (DD/MM/YYYY) |
| 3 | Mã YC | `maYeuCau` (màu indigo) |
| 4 | Nhân viên | `tenNhanVien` (ẩn < sm) |
| 5 | Bộ phận | `boPhan` (ẩn < md) |
| 6 | Sản phẩm | `items[].tenGoi` join, `line-clamp-2` |
| 7 | Ưu tiên | Badge `mucDoUuTien` |
| 8 | Trạng thái | Badge `trangThai` |
| 9 | Hành động | Xóa / Hủy / Nhập kho (có điều kiện) |

- **Phân trang:** server-side — `getAllSupplyRequests(page, 10, serverFilters)` trả `pagination.total`.
- **Modal chi tiết:** bảng phụ 8–9 cột (Sản phẩm: # / Phân loại / Tên gọi / Yêu cầu / Đã cấp / Còn thiếu / Đơn vị / Trạng thái / Thao tác) + block Lịch sử xử lý (`SupplyRequestDecision`).
- **Thiếu / đề xuất:**
  - `mucDichYeuCau`, `loaiYeuCau`, `soTien`, `fileKemTheo` không có cột — nhân viên kho không thấy mục đích/chi phí ngay trên bảng.
  - Cột Sản phẩm `line-clamp-2` cắt tên khi YC nhiều dòng — đề xuất thêm tooltip đầy đủ hoặc badge "+N dòng".
  - Nên thêm cột `Ngày duyệt` / `Người duyệt` khi trạng thái là Đã duyệt.

#### Tab 2 — Danh sách tồn kho

- **Component:** `InventoryOverview.tsx` (388 dòng)
- **Model Prisma:** view tổng hợp từ `LotProduct` + `InternationalProduct` + `warehouses/Lot/WarehouseSlot` (không có model trực tiếp)
- **Bảng chính — 8 cột + bảng con 3 cột:**

| # | Cột chính | Cột mở rộng (expand) |
|---|---|---|
| 1 | (chevron) | Kho |
| 2 | Mã hàng | Số lượng |
| 3 | Tên hàng | Giá trị tồn |
| 4 | Loại | — |
| 5 | ĐVT | — |
| 6 | Tồn kho | — |
| 7 | Giá TB (đ) | — |
| 8 | Giá trị tồn | — |

- **Phân trang:** server-side — `useInventoryOverview({ page, limit, sortBy, sortOrder })`, mặc định 20 dòng/trang, chọn 10/20/50/100. Sort server trên 6 trường.
- **Thiếu / đề xuất:**
  - `maKien` / `slotId` / zone không hiện — nhân viên kho không biết vị trí kiện cụ thể.
  - Thiếu badge `Sắp hết` / `ReorderRule` — không cảnh báo tồn thấp.
  - Thiếu `Ngày nhập cuối` — không biết hàng tồn từ khi nào.
  - Đề xuất thêm cột `Vị trí` (maKien) và filter `Tồn thấp` dựa trên `ProductReorderRule`.

#### Tab 3 — Danh sách nhập kho

- **Component:** `WarehouseReceiptTab.tsx` (631 dòng)
- **Model Prisma:** `WarehouseReceipt` + `WarehouseReceiptItem` (`warehouse_receipts` / `warehouse_receipt_items`)
- **Bảng chính — 10 cột (merge theo phiếu):**

| # | Cột | Kiểu |
|---|---|---|
| 1 | Mã phiếu | `rowSpan` theo phiếu |
| 2 | Ngày nhập | `rowSpan` |
| 3 | Nhân viên | `rowSpan` (`tenNhanVien`) |
| 4 | Người đề nghị | `rowSpan` (`nguoiDeNghi`) |
| 5 | Kho | per-line (`tenKho`) |
| 6 | Lô | per-line (`tenLo`) |
| 7 | Mã kiện | per-line (`maKien`, mono) |
| 8 | Sản phẩm | per-line (`tenSanPham`) |
| 9 | Số lượng | per-line (`soLuongThucTe` + ĐVT, highlight đỏ nếu lệch KH >10%) |
| 10 | Thao tác | `rowSpan` (Xem / In / Excel BM01 / Sửa / Xóa) |

- **Modal chi tiết — 16 cột BM01:** TT / Mã hàng / Loại Kho / Tên hàng / Số lô KH / Số lô TT / Số kiện KH / Số kiện TT / Tình trạng / Quy cách / ĐV / SL KH / SL TT / Ghi chú / Tồn trước / Tồn sau.
- **Phân trang:** client-side — `getAllWarehouseReceipts()` fetch all, lọc + sort + `slice((page-1)*10, page*10)` ở frontend. Đếm theo số phiếu (phiếu nhiều dòng không bị cắt trang).
- **Thiếu / đề xuất:**
  - `mucDich`, `supplyRequestId`, `daIn`/`inLanDauAt` chỉ badge — chưa có cột lọc nhanh.
  - Phiếu nhiều dòng chỉ hiện được `Kho/Lô/Mã kiện/Sản phẩm/Số lượng` per-line ở bảng chính, nhưng thiếu `Tình trạng/Quy cách` — phải mở modal mới thấy.
  - Client pagination sẽ chậm khi >500 phiếu — đề xuất chuyển server pagination như SupplyRequest.

#### Tab 4 — Danh sách xuất kho

- **Component:** `WarehouseIssueTab.tsx` (622 dòng)
- **Model Prisma:** `WarehouseIssue` + `WarehouseIssueItem` (+ liên kết 1-1 `MaterialEvaluation`)
- **Bảng chính — 10 cột:** giống hệt tab Nhập (thay `Ngày xuất`; `lyDoXuatKho` trong modal). Modal chi tiết 16 cột BM03 (SL TT màu đỏ, footer tổng đỏ).
- **Phân trang:** client-side, giống tab Nhập.
- **Thiếu / đề xuất:** tương tự tab Nhập; thêm `Lý do xuất` chưa có cột trên bảng chính — nhân viên kho muốn thấy lý do ngay mà không mở modal.

#### Tab 5 — Danh sách hàng hóa

- **Component:** `InternationalProductManagement.tsx` (651 dòng)
- **Model Prisma:** `InternationalProduct` (`business_orders`)
- **Bảng — 8 cột:**

| # | Cột | Sort | Filter |
|---|---|---|---|
| 1 | STT | — | — |
| 2 | Mã hàng hóa | có | text |
| 3 | Tên hàng hóa | có | text |
| 4 | Loại hàng hóa | có | dropdown categories |
| 5 | ĐVT | có | dropdown |
| 6 | Giá thành | có | — |
| 7 | Mô tả | có | — |
| 8 | Hành động | — | — |

- **Phân trang:** server-side chuẩn — TanStack Query, pageSize 20/50/100, sort server, debounce 300ms. Có xuất Excel.
- **Thiếu / đề xuất:** `unitOptions` dropdown tính từ trang hiện tại nên ĐVT ở trang khác không hiện để lọc.

#### Tab 6 — Danh sách kho

- **Component:** `WarehouseUnifiedView.tsx` + `WarehouseManagement.tsx` (1273 dòng) + `FactoryOverview.tsx`
- **Model Prisma:** `warehouses` → `Lot` → `LotProduct` (+ `WarehouseSlot`)
- **Không dùng bảng HTML cho danh sách chính** — kiến trúc tab kho → card lô → dense list kiện (tên SP, maKien, maSanPham, soLuong+ĐVT, nút Sửa/Di chuyển/Xóa). Bảng duy nhất là modal **Lịch sử nhập kho — 8 cột:**

| # | Cột |
|---|---|
| 1 | Mã phiếu |
| 2 | Ngày nhập |
| 3 | Người nhập |
| 4 | Mục đích |
| 5 | Số lượng nhập |
| 6 | Tồn trước |
| 7 | Tồn sau |
| 8 | Ghi chú |

- **Sơ đồ:** `FactoryOverview` — SVG overlay trên PDF `factory-map.pdf` (6 vùng kho hardcode: KHOTP, KHOTD1, HD1, HD2, KHOTD2, KHOPL), tô màu theo mức lấp đầy (`occupied/total`), legend empty/partial/full.
- **Thiếu / đề xuất:**
  - `giaThanh` / `slotId` / zone chỉ trong modal Sửa kiện.
  - Chỉ có lịch sử nhập, chưa drill-down lịch sử xuất từ đây.
  - Tọa độ vùng kho hardcode — thêm kho mới phải sửa code.

---

## 4. Phòng QLSX — ProductionDepartment (`/production/management`)

> File: `frontend/src/pages/production/ProductionDepartment.tsx` (210 dòng)

Phòng QLSX có **overview card đơn hàng** (fetch `orderService.getAllOrders(1,10000)` đếm theo `trangThaiSanXuat`: Chờ SX / Đang SX / Vận chuyển / Đã giao) và **9 tabs** đồng bộ URL (`?tab=`):

| # | Tab key | Tên hiển thị | Component | Bảng chính |
|---|---|---|---|---|
| 1 | `processList` | Danh sách quy trình | `ProcessManagement` (mode standard-only) | Template quy trình chuẩn |
| 2 | `productionOrders` | Danh sách quy trình sản xuất | `ProductionProcessManagement` | **10 cột** (xem dưới) |
| 3 | `orderList` | Danh sách đơn hàng | `OrderManagement` | Đơn hàng theo `trangThaiSanXuat` |
| 4 | `standards` | Danh sách định mức | `MaterialStandardManagement` | Định mức NVL |
| 5 | `materialEvaluation` | Đánh giá nguyên liệu | `MaterialEvaluationManagement` | **16 cột** |
| 6 | `systemOperation` | Thông số vận hành hệ thống | `SystemOperationManagement` | **10 cột** |
| 7 | `finishedProduct` | Thành phẩm đầu ra | `FinishedProductManagement` | **10 cột (tổng) / 8 cột (máy)** |
| 8 | `qualityEvaluation` | Đánh giá chất lượng | `QualityEvaluationManagement` | **11 cột** |
| 9 | `productionReport` | Báo cáo sản lượng | `ProductionReportList` | **7 cột** |

### 4.1. Danh sách quy trình sản xuất — ProductionProcessManagement (10 cột)

| # | Cột | Field |
|---|---|---|
| 1 | STT | — |
| 2 | Mã QTSX | `maQuyTrinhSanXuat` |
| 3 | Tên quy trình SX | `tenQuyTrinhSanXuat` |
| 4 | Mã NV | `maNVSanXuat` |
| 5 | Mã NV (bug label — thực ra là Tên NV) | `tenNVSanXuat` |
| 6 | Định mức NVL | `materialStandard.tenDinhMuc` |
| 7 | Sản phẩm đầu ra | `sanPhamDauRa` |
| 8 | Khối lượng (Kg) | `khoiLuong` |
| 9 | Thời gian (Ngày) | `thoiGian` |
| 10 | Hoạt động | Xem / Sửa / Xóa |

- **Modal chi tiết (desktop) — 14 cột động:** STT / Phân đoạn / Nội dung CV / Biểu mẫu / Loại chi phí / Tên chi phí / ĐVT / Định mức TH / Đơn vị / KL cần TH / Số phút TH / Năng suất (ĐVT/phút) / Số lượng Nhân công (Kế hoạch / Thực tế). Cột động theo dữ liệu (`getVisibleProductionCostColumns`).
- **Model:** `ProductionProcess` → `ProductionFlowchart` → `ProductionFlowchartSection` → `ProductionFlowchartCost` (schema `common`).
- **Phân trang:** client — `getAllProductionProcesses(1,1000)` rồi slice 10/trang.
- **Thiếu / đề xuất:** 2 cột liền kề đều header "Mã NV" (bug); thiếu cột `Tổng NL cần SX`; `alert()` thay toast.

### 4.2. Đánh giá nguyên liệu — MaterialEvaluationManagement (16 cột, lớn nhất hệ thống)

| # | Cột | Field | Ghi chú |
|---|---|---|---|
| 1 | STT | — | Sticky left 0 |
| 2 | Mã chiên | `maChien` | Sticky left 44px |
| 3 | Ca | `ca` (1/2/3) | Từ schedule nếu record chưa có |
| 4 | Thời gian chiên | `thoiGianChien` | DD/MM HH:mm |
| 5 | Mã hàng hóa | `maSanPham` | — |
| 6 | Số lô kiện | `soLoKien` | — |
| 7 | KL (Kg/tua) | `khoiLuong` | — |
| 8 | Số lần ngâm | `soLanNgam` | — |
| 9 | Nhiệt độ trước ngâm | `nhietDoNuocTruocNgam` | °C |
| 10 | Nhiệt độ sau vớt | `nhietDoNuocSauVot` | °C |
| 11 | TG ngâm (Phút) | `thoiGianNgam` | — |
| 12 | Brix nước ngâm | `brixNuocNgam` | — |
| 13 | ĐG trước ngâm | `danhGiaTruocNgam` | truncate |
| 14 | ĐG sau ngâm | `danhGiaSauNgam` | truncate |
| 15 | Ghi chú | `ghiChu` | truncate |
| 16 | Thao tác | — | Sửa / Xóa / Tạo TSVH |

- **Đặc biệt:** bảng drive theo **lịch chiên trong ngày** (16 mã chiên/ngày) — dòng placeholder "Chưa nhập" cho mã chưa có dữ liệu (bấm để tạo mới pre-fill). Scroll container `max-h-[70vh]` + sticky header.
- **Model:** `MaterialEvaluation` (`@@unique([maChien, ngaySanXuat])`, liên kết `LotProduct` + `WarehouseIssue` 1-1).
- **Phân trang:** không phân trang — hiện toàn bộ 16 dòng/ngày, có progress "Đã nhập x/y mã chiên".
- **Thiếu / đề xuất:**
  - `ngaySanXuat` (ca đêm) không hiện cột — nhân viên muốn thấy mã chiên thuộc ngày SX nào.
  - `lotProduct` linkage (kho/maKien) không hiện — không biết nguyên liệu lấy từ kiện nào.
  - `nguoiThucHien` chỉ trong modal — nên đưa ra cột.
  - Đề xuất thêm cột `Đã tạo TSVH?` (badge đã có `systemOperations`).

### 4.3. Thông số vận hành hệ thống — SystemOperationManagement (10 cột)

| # | Cột | Field | Responsive |
|---|---|---|---|
| 1 | STT | — | — |
| 2 | Mã chiên | `maChien` | — |
| 3 | Mã máy | `machineSystem.tenHeThong` | ẩn < sm |
| 4 | Thời gian chiên | `thoiGianChien` | — |
| 5 | KL đầu vào (kg) | `khoiLuongDauVao` | ẩn < md |
| 6 | Tổng TG sấy | `tongThoiGianSay` | ẩn < md |
| 7 | Trạng thái | `trangThai` (DANG_HOAT_DONG/BAO_TRI/NGUNG) | — |
| 8 | Ghi chú | `ghiChu` | ẩn < lg |
| 9 | Mã NV thực hiện | `nguoiThucHien` | ẩn < lg |
| 10 | Hoạt động | — | Sửa / Xóa |

- **Model:** `SystemOperation` (`@@unique([maChien, ngaySanXuat, machineSystemId])`, 4 giai đoạn x 3 chỉ số).
- **Phân trang:** client — `limit 1000` + slice 10/trang; có tab chọn máy.
- **Thiếu / đề xuất — gap nghiêm trọng nhất vận hành:**
  - **12 chỉ số Giai đoạn 1-4** (`giaiDoanNThoiGian` / `NhietDo` / `ApSuat` x4) hoàn toàn vắng mặt khỏi bảng chính — nhân viên vận hành phải mở từng modal mới thấy nhiệt/áp. Đề xuất thêm dạng thu gọn (ví dụ badge "G1: 60p/80C/0.8bar") hoặc mở rộng cột tổng hợp.
  - Cột "Mã máy" hiện `tenHeThong` nhưng header ghi "Mã máy" — lệch tên.

### 4.4. Thành phẩm đầu ra — FinishedProductManagement (3 bảng)

**Bảng A — tab "Tổng các máy" (aggregate theo maChien) — 10 cột:**

| # | Cột |
|---|---|
| 1 | (checkbox chọn) |
| 2 | STT |
| 3 | Mã chiên |
| 4 | Thời gian chiên |
| 5 | Tên hàng hóa |
| 6 | Tổng KL (kg) |
| 7 | Người thực hiện |
| 8 | Số máy |
| 9 | Đánh giá (thấp nhất / cao nhất theo %A) |
| 10 | Hoạt động (Xem TH / Điều chỉnh) |

**Bảng B — tab từng máy — 8 cột:**

| # | Cột |
|---|---|
| 1 | STT |
| 2 | Mã chiên |
| 3 | Thời gian chiên (ẩn < sm) |
| 4 | Tên hàng hóa |
| 5 | KL đầu vào (kg) (ẩn < sm) |
| 6 | Người thực hiện (ẩn < md) |
| 7 | Trạng thái (ẩn < sm) |
| 8 | Hoạt động (Nhập kho / Xóa) |

**Bảng C — modal Tổng hợp (Aggregated View) — 5 cột:**

| Cột | Nội dung |
|---|---|
| Loại thành phẩm | A / B / B Dầu / C / Vụn lớn / Vụn nhỏ / Phế phẩm / Ướt |
| Khối lượng (kg) | — |
| Tỉ lệ (%) | — |
| Thấp nhất | Tên máy + tỉ lệ |
| Cao nhất | Tên máy + tỉ lệ |

- **Model:** `FinishedProduct` (`@@unique([maChien, ngaySanXuat, machineSystemId])`, 8 hạng x khoiLuong+tiLe, `daNhapKho`).
- **Phân trang:** client 10/trang, chung `currentPage`.
- **Thiếu / đề xuất:**
  - `maSanPham` / `daNhapKho` không có cột ở bảng B.
  - 8 hạng phân loại (A/B/B Dầu/C/Vụn lớn/Vụn nhỏ/Phế/Ướt) chỉ trong modal — nhân viên muốn thấy A% / Phế% ngay trên bảng B.
  - Đề xuất thêm cột `Hiệu suất` (tổng tốt / tổng vào) trên cả 2 bảng.

### 4.5. Đánh giá chất lượng — QualityEvaluationManagement (11 cột)

| # | Cột | Field | Responsive |
|---|---|---|---|
| 1 | STT | — | — |
| 2 | Mã chiên | `maChien` | — |
| 3 | Thời gian chiên | `thoiGianChien` (String) | ẩn < sm |
| 4 | Mã hàng hóa | `tenHangHoa` | — |
| 5 | Màu sắc | `mauSac` | ẩn < sm |
| 6 | Mùi hương | `muiHuong` | ẩn < md |
| 7 | Vị | `huongVi` | ẩn < md |
| 8 | Độ ngọt | `doNgot` | ẩn < lg |
| 9 | Độ giòn | `doGion` | ẩn < lg |
| 10 | Mã NV thực hiện | `nguoiThucHien` | ẩn < md |
| 11 | Hoạt động | — | Sửa / Xóa |

- **Model:** `QualityEvaluation` (`@id uuid`, `@@unique([maChien, ngaySanXuat, machineSystemId])`, 8 `*TiLe` auto-fill từ FinishedProduct).
- **Phân trang:** client 10/trang.
- **Thiếu / đề xuất:**
  - **8 tỉ lệ A/B/C%** (`aTiLe`…`uotTiLe`) vắng mặt — nhân viên QC không thấy tỉ lệ đạt/hỏng ngay trên bảng.
  - `danhGiaTongQuan` / `deXuatDieuChinh` chỉ trong modal — nên thêm badge tóm tắt hoặc cột trạng thái đánh giá.

### 4.6. Báo cáo sản lượng — ProductionReportList (7 cột)

| # | Cột | Field |
|---|---|---|
| 1 | Ngày tháng | `ngayThang` (String) |
| 2 | Tổng số tua SX | `tongSoTuaSanXuat` |
| 3 | Số mẻ thực tế | `soMeThucTe` |
| 4 | Mã định mức | `maDinhMuc` |
| 5 | Chênh lệch KL (kg) | `chenhLechKhoiLuong` (xanh/đỏ theo dấu) |
| 6 | Người thực hiện | `nguoiThucHien` |
| 7 | Hoạt động | Xem / Sửa / Xóa |

- **Model:** `ProductionReport` (`ngayThang` String, độc lập không FK).
- **Phân trang:** client 10/trang, fetch 1000.
- **Thiếu / đề xuất:** `tongKhoiLuongNguyenLieu` / `tongKhoiLuongThanhPhamDinhMuc` / `khoiLuongThucTe` / `danhGiaChenhLech` / `nguyenNhanChenhLech` chỉ trong modal; chưa có xuất Excel; `ngayThang` String khó lọc theo khoảng ngày — đề xuất đổi sang `DateTime`.

### Bảng phụ — OutputStatisticsTable (15 cột, không phân trang)

Bảng thống kê sản lượng tổng hợp từ `FinishedProduct` (qua `useOutputStatistics`), filter theo khoảng ngày + tên hàng hóa, có hàng `tfoot` tổng cộng:

| # | Cột |
|---|---|
| 1 | Ngày |
| 2 | Mã chiên |
| 3 | Tên hàng hóa |
| 4 | Máy |
| 5 | A (kg) |
| 6 | B (kg) |
| 7 | B Dầu (kg) |
| 8 | C (kg) |
| 9 | Vụn lớn |
| 10 | Vụn nhỏ |
| 11 | Tốt (kg) — xanh |
| 12 | Phế phẩm |
| 13 | Ướt (kg) |
| 14 | Phế (kg) — đỏ |
| 15 | Tổng (kg) |

Không phân trang; chưa có xuất Excel hay group-by theo ngày/máy.

---

## 5. Dữ liệu sản xuất — ProductionData (`/production/data`)

> File: `frontend/src/pages/production/ProductionData.tsx` (143 dòng)

Trang dữ liệu dùng chung 4 bảng trên nhưng **lọc theo ngày sản xuất** (production day, boundary 06:30) thay vì tháng. Có date picker `Ngày SX` mặc định `getCurrentProductionDay()` và nút **Mở nhập liệu (Tablet)** mở kiosk wizard tương ứng (materialEvaluation → `/production/nhap-lieu-danh-gia`, còn lại → `/production/nhap-lieu`).

| # | Tab key | Tên hiển thị | Component tái sử dụng | Khác biệt so với Phòng QLSX |
|---|---|---|---|---|
| 1 | `materialEvaluation` | Đánh giá nguyên liệu | `MaterialEvaluationManagement` | Truyền `productionDay` để lọc + tạo placeholder theo lịch ngày SX |
| 2 | `systemOperation` | Thông số vận hành hệ thống | `SystemOperationManagement` | Truyền `productionDay` + `initialMaChien` khi nhảy từ MaterialEvaluation |
| 3 | `finishedProduct` | Thành phẩm đầu ra | `FinishedProductManagement` | Truyền `productionDay` |
| 4 | `qualityEvaluation` | Đánh giá chất lượng | `QualityEvaluationManagement` | Truyền `productionDay` |

> Cả 4 tab đều nhận `productionDay` từ `ProductionData` và gọi API với `productionDayRange(day)` → `{ from: "YYYY-MM-DDT06:30:00", to: "nextDayT06:30:00" }`. Nhân viên sản xuất chỉ cần chọn đúng ngày SX là thấy đủ 16 mẻ chiên của ngày đó.

---

## 6. Kiosk DataEntry — 3 wizard tablet

> Hub: `frontend/src/pages/production/DataEntryHub.tsx` — 3 card lớn chọn loại nhập liệu (full-screen, không có bảng).
> Logic ngày SX: `frontend/src/utils/productionDay.ts` + `frontend/src/pages/production/deriveThoiGianChien.ts`
> Components hỗ trợ: `frontend/src/components/production/` (7 file)

### 6.1. Tổng quan kiosk

Cả 3 wizard đều **public (không qua ProtectedLayout)**, tự bảo vệ bằng kiosk session (`deviceKey` từ URL hoặc `sessionStorage`). Chúng chia sẻ gate chung:

```
[Device key guard] → [Chọn ca 1/2/3] → [Chọn người thực hiện] → (phần riêng)
```

| Thành phần | File | Vai trò |
|---|---|---|
| `ShiftSelectionScreen` | `components/production/ShiftSelectionScreen.tsx` | Chọn Ca 1/2/3 — FIRST GATE |
| `OperatorSelectionScreen` | `components/production/OperatorSelectionScreen.tsx` | Chọn người thực hiện — 2 mode: attended (đã điểm danh ca đó) / fallback "Tìm người khác" |
| `FieldFocusEditor` | `components/production/FieldFocusEditor.tsx` | Overlay sửa 1 ô số (clamp min/max, suggestion, "Tiếp →") |
| `CascadePicker` | `components/production/CascadePicker.tsx` | Picker phân tầng (<=8 option = grid, >8 = overlay search) |
| `RawMaterialPicker` | `components/production/RawMaterialPicker.tsx` | Chọn nguyên liệu — mặc định chỉ "Có hàng" (`tongTonKho>0`) |
| `EvaluationDetailReadOnly` | `components/production/EvaluationDetailReadOnly.tsx` | Modal read-only xem đánh giá đã lưu |
| `KioskFooter` | `components/production/KioskFooter.tsx` | Footer "Powered by KOOLA" |

### 6.2. Bảng so sánh 3 wizard

| Thuộc tính | Sản lượng chiên<br/>`ProductionDataEntry` | Đánh giá nguyên liệu<br/>`ProductionMaterialEvaluationEntry` | Vận hành hệ thống<br/>`ProductionSystemOperationEntry` |
|---|---|---|---|
| **Route** | `/production/nhap-lieu` | `/production/nhap-lieu-danh-gia` | `/production/nhap-lieu-van-hanh` |
| **Ghi vào** | `FinishedProduct` (upsert theo maChien+machine) | `MaterialEvaluation` | `SystemOperation` (update dòng đã seed) |
| **Gate thêm** | — | Chọn mã chiên (grid batch trong ngày) | Chọn mã chiên → chọn máy |
| **Số bước wizard** | Board + Preview | Step 2: Nguyên liệu → Step 3: Thông số → Step 4: Đánh giá & File | Step batch → machine → form |
| **Board landscape** | **Có** — bảng ma trận maChien x máy (6 quality tab: A/B/B Dầu/C/Ướt/Vụn-Phế), sticky header, card khi portrait | Không — form dọc `max-w-2xl` | Không — chọn dần + form dọc `max-w-4xl` |
| **Ngày SX 06:30** | Không — dùng `todayStr()` + date picker | **Có** — `getCurrentProductionDay()` + `productionDayRange()` + `deriveThoiGianChien()` | Không — dùng `todayStr()` |
| **Nhập chính** | Ô số kg per cell (`NumericInput`), tab VUN_PHE chia đều 3 loại | Picker Nguyên liệu→Lô→Kiện, KL xuất, 5 thông số ngâm, checkbox tiêu chí | 14 trường số + tổng TG sấy tự tính; formLocked nếu máy BAO_TRI/NGUNG |
| **Lưu nháp** | `localStorage` key `prod-output-draft|date|shift` | `material-eval-draft|operator|shift|date` | `sysop-draft|date|shift|maChien|machineId` |
| **Preview** | `FullGridPreview` nếu landscape | `EvaluationDetailReadOnly` nếu mã chiên đã có dữ liệu | Banner "Đang dùng nháp chưa lưu" |

### 6.3. Board landscape (chỉ có ở Sản lượng chiên)

Khi màn hình rộng (`!isNarrow`): bảng table — dòng = maChien (STT, Mã chiên sticky-left, Giờ chiên, Mã hàng hóa), cột = từng máy (`Máy 01`… từ `HT-CCK-01`), header sticky, tap ô mở `FieldFocusEditor`. Khi hẹp/portrait: chuyển sang card layout (mỗi maChien 1 card, dòng = máy). Tab `VUN_PHE` nhập tổng ca rồi `applyWasteDistribution()` chia đều cho `batches × máy`, mỗi ô chia 3 (`vunLon/vunNho/phePham`).

### 6.4. Logic ca đêm — productionDay 06:30

Chỉ `ProductionMaterialEvaluationEntry` dùng helper `productionDay.ts`:

- `getCurrentProductionDay(now?)` — trước 06:30 → ngày dương lịch trước, >= 06:30 → ngày hiện tại.
- `productionDayRange(day)` → `{ from: "dayT06:30:00", to: "nextDayT06:30:00" }` làm param API.
- `deriveThoiGianChien(day, hour, minute, isNextCalendarDay)` → chuỗi naive `YYYY-MM-DDTHH:mm:00` (không múi giờ, backend hiểu theo `Asia/Ho_Chi_Minh`). `isNextCalendarDay=true` cho MC-13..MC-16 (00:30, 02:00, 03:30, 05:00) — giờ đồng hồ rơi vào ngày dương lịch kế tiếp so với ngày SX.

Nhờ đó, dữ liệu nhập lúc 00:30–06:29 vẫn thuộc đúng ngày SX hôm trước.

---

## 7. Hướng dẫn sử dụng

### 7.1. Xem tổng quan

1. Vào `/production` — xem 5 KPI trên hero strip, biểu đồ máy móc + phân bổ đơn hàng, tổng quan kho + yêu cầu cung cấp.
2. Bấm `Làm mới` để tải lại toàn bộ 7 nguồn.
3. Bấm 1 trong 3 `NavCard` để nhảy sang phòng con.

### 7.2. Quản lý kho

1. Vào `/production/warehouse` — xem 4 overview cards (tồn kho / nhập xuất / funnel YC / hàng tồn).
2. Dùng filter tháng/năm trên header để lọc card nhập/xuất.
3. Chọn tab:
   - **Yêu cầu cung cấp** — tạo/sửa/hủy YC, kiểm tra tồn kho, tạo phiếu xuất hoặc YC mua hàng.
   - **Tồn kho** — xem tồn theo hàng hóa, mở rộng chi tiết theo kho, xuất CSV.
   - **Nhập kho / Xuất kho** — tạo phiếu, xem chi tiết 16 cột BM01/BM03, in, xuất Excel, lọc theo 10 trường.
   - **Hàng hóa** — quản lý danh mục `InternationalProduct`, sort + filter server.
   - **Kho** — tab kho → card lô → list kiện; kho có CAD layout hiện bản đồ + heatmap lấp đầy.

### 7.3. Vận hành sản xuất (Phòng QLSX / Dữ liệu SX)

1. Vào `/production/management` (theo tháng) hoặc `/production/data` (theo ngày SX).
2. Ở `/production/data`, chọn **Ngày SX** (mặc định hôm nay theo 06:30) — cả 4 tab lọc theo ngày đó.
3. Bấm **Mở nhập liệu (Tablet)** để mở kiosk wizard tương ứng trong tab mới.
4. Thứ tự nhập liệu khuyến nghị: **Đánh giá NL → Vận hành → Thành phẩm → Đánh giá CL** (mỗi bước tạo dữ liệu cho bước sau; nút "Tạo TSVH" trong bảng Đánh giá NL tạo bulk SystemOperation).
5. Trong bảng **Đánh giá NL**, dòng "Chưa nhập" bấm để tạo mới; dòng đã có bấm để xem/sửa.
6. Trong bảng **Thành phẩm**, tab "Tổng các máy" cho nhìn aggregate + điều chỉnh từng máy; tab từng máy cho nhập kho.

### 7.4. Nhập liệu trên tablet (kiosk)

1. Mở hub `/production/nhap-lieu-hub` — chọn 1 trong 3 card lớn.
2. Nhập `deviceKey` nếu chưa kích hoạt (admin đăng ký qua `faceAttendanceService.createDevice`).
3. Chọn **Ca** (1/2/3) → chọn **Người thực hiện** (ưu tiên người đã điểm danh ca đó).
4. Làm theo wizard:
   - **Sản lượng chiên** — chọn quality tab (A/B/B Dầu/C/Ướt/Vụn-Phế), nhập kg vào ô tương ứng, xem Preview rồi Xác nhận.
   - **Đánh giá NL** — chọn mã chiên → chọn Nguyên liệu/Lô/Kiện → nhập thông số ngâm → đánh giá + ảnh → Lưu.
   - **Vận hành** — chọn mã chiên → chọn máy → nhập 4 giai đoạn (thời gian/nhiệt/áp) → Lưu.
5. Dữ liệu nhập dở tự động lưu nháp `localStorage` — tải lại trang không mất.

---

## 8. Lưu ý quan trọng

### Phân quyền

| Vai trò | Quyền trong Production |
|---|---|
| `ADMIN` | Toàn quyền — bypass mọi kiểm tra |
| `production` | Xem + tạo/sửa/xóa trong cả 3 phòng con + kiosk |
| Khác | Không vào được `/production/*` (ProtectedModuleRoute chặn) |
| Kiosk wizard | Public route — tự bảo vệ bằng `deviceKey`, không yêu cầu đăng nhập |

### Phân trang

| Bảng | Kiểu | Giới hạn | Ghi chú |
|---|---|---|---|
| SupplyRequest | Server | 10/trang | Chuẩn — lọc/sort trên server |
| InventoryOverview | Server | 20/trang (chọn 10/20/50/100) | Chuẩn — sort server 6 trường |
| WarehouseReceipt / Issue | Client | 10 phiếu/trang | Fetch all rồi slice — chậm khi >500 phiếu, cần chuyển server |
| InternationalProduct | Server | 20/50/100 | Chuẩn — TanStack Query |
| MaterialEvaluation | Không | 16 dòng/ngày | Theo lịch chiên, không phân trang |
| SystemOperation / FinishedProduct / QualityEvaluation / ProductionReport | Client | 10/trang | Fetch 1000 rồi slice — không scale khi dữ liệu lớn |
| OutputStatisticsTable | Không | — | Render toàn bộ rows theo khoảng ngày |

### Ngày sản xuất & ca đêm (boundary 06:30)

- Ngày SX chạy từ **06:30 ngày này đến 06:29:59 ngày kế**. Dữ liệu nhập lúc 00:30–06:29 thuộc ngày SX hôm trước.
- Chỉ `ProductionMaterialEvaluationEntry` và `ProductionData` áp dụng boundary này (`getCurrentProductionDay` / `productionDayRange` / `deriveThoiGianChien`).
- Hai wizard còn lại (`ProductionDataEntry`, `ProductionSystemOperationEntry`) dùng ngày dương lịch `todayStr()` — cần đồng bộ nếu muốn nhất quán ca đêm.
- `deriveThoiGianChien` không tạo `Date` cho thời điểm đích — dùng UTC arithmetic + format chuỗi naive `YYYY-MM-DDTHH:mm:00` để tránh lệch timezone trình duyệt; `isNextCalendarDay=true` cho MC-13..MC-16.

### Lưu ý khác

- **Trạng thái máy** (`SystemOperationStatus`): `DANG_HOAT_DONG` / `BAO_TRI` / `NGUNG_HOAT_DONG` — máy BAO_TRI/NGUNG thì form kiosk bị khóa chỉ xem.
- **Khóa phiếu kho** (`isLocked`): phiếu liên kết `SupplyRequest` hoặc đã khóa quy trình — ẩn nút Sửa/Xóa, chỉ còn Xem/In/Excel.
- **Đã nhập kho** (`FinishedProduct.daNhapKho`): set atomic trong transaction phiếu nhập — dòng đã nhập kho bị mờ (`opacity-50`) và khóa Điều chỉnh.
- **Mã chiên unique** (`@@unique([maChien, ngaySanXuat])` hoặc thêm `machineSystemId`): tránh trùng mẻ chiên trong cùng ngày SX.
- **File đính kèm**: giới hạn 20MB (MaterialEvaluation), lưu nháp không bao gồm file — tải lại trang mất ảnh chưa lưu.
