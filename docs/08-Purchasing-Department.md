# Bộ phận Thu mua — Hướng dẫn sử dụng

> **Route gốc:** `/purchasing` · **Quyền:** `Purchasing` + `ADMIN` (ProtectedModuleRoute `module="purchasing"`, ProtectedSubRoute `department="purchasing"`).
> Hai phòng con phân biệt bằng `Supplier.phanLoaiNCC` / `PurchaseRequest` filter `phanLoaiNCC`: **NVL** và **Thiết bị**.

---

## 1. Tổng quan

Bộ phận Thu mua chịu trách nhiệm toàn bộ vòng đời mua hàng: quản lý nhà cung cấp (NCC), tiếp nhận và xử lý yêu cầu mua hàng (Purchase Request), theo dõi đơn hàng (Order), và xử lý yêu cầu bổ sung phát sinh từ kho (SHORTAGE). Giao diện chia làm 3 entry point:

| Route | File | Đối tượng |
|-------|------|-----------|
| `/purchasing` | `frontend/src/pages/PurchasingManagement.tsx` | Dashboard tổng quan — KPI + biểu đồ, điều hướng sang 2 phòng con |
| `/purchasing/materials` | `frontend/src/pages/purchasing/PurchasingMaterials.tsx` | Phòng Thu mua **NVL** (nguyên vật liệu) |
| `/purchasing/equipment` | `frontend/src/pages/purchasing/PurchasingEquipment.tsx` | Phòng Mua **Thiết bị** (máy móc, thiết bị) |

**Phân quyền chi tiết:**

- Route-level: `ProtectedModuleRoute` / `ProtectedSubRoute` — chỉ `role` thuộc Thu mua hoặc `ADMIN` mới vào được.
- Action-level trong tab Mua hàng: `can('purchase-requests', 'UPDATE' | 'DELETE' | 'APPROVE', user.role)` — nút Sửa / Xóa / Gửi duyệt chỉ hiện khi đủ quyền. `ADMIN` bypass toàn bộ.
- Supplier CRUD không check `can()` riêng — mọi user vào được `/purchasing/*` đều thấy nút Thêm/Sửa/Xóa (cần siết lại nếu muốn phân quyền mịn hơn).
- Order: `canEdit = ADMIN || DEPARTMENT_HEAD` mới được mở modal Chỉnh sửa đơn hàng.

**KPI cấp phòng ban (stat cards trong mỗi phòng con):**

- Card **Nhà cung cấp**: `total` / `Đang cung cấp` / `Ngừng cung cấp` — đếm từ `supplierService.getAllSuppliers(1, 1000, …, phanLoaiNCC)`.
- Card **Yêu cầu mua hàng**: `total` + breakdown `Chờ báo giá` / `Chờ duyệt` / `Đã duyệt` / `Hoàn thành` — đếm từ `purchaseRequestService.getAllPurchaseRequests(…, { phanLoaiNCC })` + filter local theo `trangThai`. Có bộ lọc Tháng/Năm cho card này.

---

## 2. Tổng quan PurchasingManagement (`PurchasingManagement.tsx`, 402 dòng)

Trang dashboard **không có bảng** — chỉ KPI + biểu đồ + điều hướng. Dùng để nắm nhanh sức khỏe thu mua trước khi drill-down vào 2 phòng con.

### 2.1. KPI row (4 cards)

| Card | `label` | `value` | `sub` | Nguồn dữ liệu |
|------|---------|---------|-------|---------------|
| Yêu cầu mua NVL | `purchaseRequests` | `pagination.total` của PurchaseRequest | `Chờ báo giá: X · Chờ duyệt: Y` | `purchaseRequestService.getAllPurchaseRequests(1,1)` + full fetch 10000 để đếm trạng thái |
| Mua thiết bị | `thietBiSuppliers` | số NCC `phanLoaiNCC === 'Thiết bị'` | `NCC thiết bị: X · Hoàn thành: Y` | `supplierService.getAllSuppliers(1,10000)` filter local |
| Nhà cung cấp | `suppliers` | `pagination.total` của Supplier | `NVL: X · Thiết bị: Y` | như trên |
| Đơn mua hàng | `supplyRequests` | `pagination.total` của SupplyRequest | `Yêu cầu cung cấp: X` | `supplyRequestService.getAllSupplyRequests(1,1)` |

> Lưu ý: `Mua thiết bị` card hiện đang hiển thị `thietBiSuppliers` làm `value` (số NCC thiết bị), không phải số yêu cầu mua thiết bị — dễ gây hiểu nhầm, nên đổi label hoặc value cho nhất quán.

### 2.2. Biểu đồ

| Biểu đồ | Loại | Dữ liệu | Ghi chú |
|---------|------|---------|---------|
| Yêu cầu mua theo trạng thái | Donut Pie (`recharts`, `innerRadius 60`) | `Chờ báo giá` / `Chờ duyệt` / `Đã duyệt` / `Hoàn thành` / `Từ chối` (chỉ hiện khi >0) | Dùng `chartPalettes.product`, legend circle 8px |
| Nhà cung cấp theo phân loại | Donut Pie | `NVL` / `Thiết bị` / `Chưa phân loại` | Màu `SUPPLIER_COLORS` (blue/violet/gray) |
| Xu hướng yêu cầu mua theo tháng | LineChart (dark variant, 260px) | Đếm `prList` theo `ngayYeuCau ?? createdAt`, filter `getFullYear() === currentYear`, 12 điểm `T1..T12` | `LINE_COLOR_PR = product[2]` |
| Xu hướng yêu cầu cung cấp theo tháng | LineChart (dark variant) | Tương tự với `supplyList` | `LINE_COLOR_SUPPLY = product[0]` |

Cả 4 biểu đồ đều fetch `1..10000` records để tính toán client-side — với dữ liệu lớn cần chuyển sang aggregation API.

### 2.3. Điều hướng

- 2 `NavCard` lớn: **Thu mua NVL** → `/purchasing/materials`, **Mua thiết bị** → `/purchasing/equipment`.
- 4 quick-link buttons: `NCC NVL`, `Yêu cầu mua NVL`, `NCC thiết bị`, `Yêu cầu mua thiết bị` (dùng `navigate` với `?tab=suppliers|purchaseRequestList`).

---

## 3. Chi tiết Phòng Thu mua NVL — `PurchasingMaterials.tsx` (1834 dòng)

Đây là file **chuẩn mực** — mọi pattern đúng nằm ở đây. Equipment drift so với file này (xem mục 4).

Có 4 tabs (`VALID_TABS`): `suppliers` | `orderList` | `purchaseRequestList` | `replenishment`. Tab state đồng bộ URL qua `useSearchParams({ tab })`, hỗ trợ deep-link `?purchaseRequestId=`.

### 3.1. Tab Nhà cung cấp NVL — `suppliers`

**Bảng trực tiếp trong file (không delegate), 11 cột:**

| # | Cột | Field Prisma | Hiển thị |
|---|-----|--------------|----------|
| 1 | STT | tính toán `(supplierPage - 1) * 10 + index + 1` | Số thứ tự phân trang |
| 2 | Mã NCC | `Supplier.maNhaCungCap` (unique, auto-generate qua `GET /suppliers/generate-code?phanLoaiNCC=NVL`) | Text xanh `text-blue-600` |
| 3 | Tên NCC | `Supplier.tenNhaCungCap` | Truncate `max-w-xs`, tooltip đầy đủ |
| 4 | Loại cung cấp | `Supplier.loaiCungCap` (VD: Thủy sản, Rau củ, Gia vị) | Text thường |
| 5 | Quốc gia | `Supplier.quocGia` | Kèm icon `Globe` |
| 6 | Liên hệ | `Supplier.nguoiLienHe` + `Supplier.soDienThoai` | 2 dòng: tên đậm + SĐT kèm icon `Phone` |
| 7 | Loại hình | `Supplier.loaiHinh` (`Sản xuất` / `Thương mại`) | Badge xanh/tím |
| 8 | Trạng thái | `Supplier.trangThai` (`Đang cung cấp` / `Ngừng cung cấp`) | Badge xanh/đỏ |
| 9 | Doanh chi | `Supplier.doanhChi` (Float, VNĐ) | Hiển thị `${(doanhChi/1e6).toFixed(0)}M`, `-` nếu null |
| 10 | NV tạo | `Supplier.employee.user.lastName + firstName` | `-` nếu không có |
| 11 | Hoạt động | — | 3 icon: Xem (`Eye`), Sửa (`Edit`), Xóa (`Trash2`) |

**Model Prisma `Supplier` (16 fields, `@@schema("business")`, `@@index([phanLoaiNCC])`):**
`id (cuid)`, `maNhaCungCap (unique)`, `tenNhaCungCap`, `loaiCungCap`, `quocGia`, `website?`, `nguoiLienHe`, `soDienThoai`, `emailLienHe`, `diaChi`, `khaNang?`, `loaiHinh`, `trangThai (default "Đang cung cấp")`, `phanLoaiNCC (default "NVL")`, `doanhChi? (Float)`, `employeeId (FK Employee)`.

**Phân trang & filter:** Server pagination — `supplierService.getAllSuppliers(page, 10, search, 'NVL')` trả về `{ data, pagination: { totalPages, total } }`. Thanh search + nút Tìm kiếm (không auto-search on type), nút Xuất Excel (`GET /suppliers/export/excel?phanLoaiNCC=NVL`). Pagination chỉ có Trước/Sau + `Trang X/Y`.

**Thiếu gì / Đề xuất hiển thị thêm:**

| Thiếu ở bảng chính | Có trong Prisma nhưng không hiện | Đề xuất |
|--------------------|----------------------------------|---------|
| Email liên hệ | `emailLienHe` | Thêm cột Email hoặc gộp vào cột Liên hệ (hiện chỉ có tên + SĐT) |
| Địa chỉ | `diaChi` | Thêm cột Địa chỉ (truncate) hoặc hiện trong tooltip — nhân viên thu mua cần địa chỉ để đánh giá logistics |
| Khả năng cung cấp | `khaNang` | Thêm cột Khả năng (ví dụ: "500 tấn/tháng") — quan trọng khi chọn NCC |
| Website | `website` | Có thể gộp vào tên NCC dạng link |

### 3.2. Tab Danh sách đơn hàng — `orderList`

Delegate hoàn toàn sang `OrderManagement` (`hideHeader={true}`).

**Bảng 9 cột (trong `OrderManagement.tsx`, 1052 dòng):**

| # | Cột | Field |
|---|-----|-------|
| 1 | STT | `(currentPage - 1) * limit + index + 1` |
| 2 | Ngày đặt hàng | `Order.ngayDatHang` |
| 3 | Mã đơn hàng | `Order.maDonHang` (xanh đậm) |
| 4 | Mã báo giá | `Order.maBaoGia` |
| 5 | Khách hàng | `Order.tenKhachHang` |
| 6 | Số lượng SP | `Order.items.length` |
| 7 | Trạng thái SX | `Order.trangThaiSanXuat` (7 giá trị: Chờ lên kế hoạch → Đã giao cho khách hàng), render `StatusBadge` |
| 8 | Trạng thái TT | `Order.trangThaiThanhToan` (3 giá trị: Đã TT đợt 1 → Đã thanh toán đủ), `StatusBadge` |
| 9 | Hành động | Xem bảng tính (`Calculator`), Xóa (`Trash2`); click row mở modal chi tiết |

**Phân trang duy nhất đúng chuẩn:** Server pagination qua `useOrders({ page, limit, search, status })` (TanStack Query, `orderKeys.lists()`), có **limit selector 10/20/50/100**, hiển thị `Hiển thị X–Y / total mục`, pagination số trang có ellipsis.

**Thiếu gì / Đề xuất:**

| Thiếu ở bảng chính | Đề xuất |
|--------------------|---------|
| Giá trị đơn hàng (VND/USD) | Thêm cột Giá trị — nhân viên thu mua cần biết quy mô đơn để ưu tiên |
| Ngày giao hàng | Thêm cột Ngày giao — để theo dõi deadline |
| Nhân viên phụ trách | Thêm cột NV phụ trách (hiện chỉ trong modal chi tiết) |

### 3.3. Tab Danh sách mua hàng — `purchaseRequestList`

**Bảng 8 cột:**

| # | Cột | Field Prisma | Hiển thị |
|---|-----|--------------|----------|
| 1 | STT | `index + 1` (không tính offset trang — bug nhỏ, nên dùng `(page-1)*10 + index + 1` như Suppliers) | Số thứ tự |
| 2 | Mã yêu cầu | `PurchaseRequest.maYeuCau` | Text xanh, kèm badge `Yêu cầu bổ sung` (amber) nếu `sourceType === 'SHORTAGE' && trangThai === 'Chờ báo giá'` |
| 3 | Ngày yêu cầu | `PurchaseRequest.ngayYeuCau` | `toLocaleDateString('vi-VN')` |
| 4 | Nhân viên | `PurchaseRequest.tenNhanVien` | Tên NV yêu cầu |
| 5 | Sản phẩm | `PurchaseRequest.items[]` (relation `PurchaseRequestItem`) | Render từng `tenHangHoa x soLuong donViTinh` + `giaDuKien` xanh nếu có; fallback `tenHangHoa` legacy nếu `items` rỗng |
| 6 | Mức độ ưu tiên | `PurchaseRequest.mucDoUuTien` (`Cao`/`Trung bình`/`Thấp`) | Badge đỏ/vàng/xanh |
| 7 | Trạng thái | `PurchaseRequest.trangThai` (5 giá trị, xem dưới) | Badge cam/vàng/xanh/đỏ/ngọc |
| 8 | Hành động | — | Xem (`Eye`), Sửa (`Edit` nếu `canEditPR`), Xóa (`Trash2` nếu `canDeletePR`), **Gửi duyệt** (cam, nếu `Chờ báo giá` + `canApprovePR`), **Đã mua xong** (ngọc, nếu `Đã duyệt`), badge `Đã hoàn thành` nếu `Hoàn thành` |

Trạng thái PurchaseRequest (5 giá trị, forward-only qua `advanceStatus` ở backend):

| Trạng thái | Màu badge | Ý nghĩa |
|------------|-----------|---------|
| Chờ báo giá | `bg-orange-100` | Thu mua đang báo giá per-item (NCC + đơn giá) |
| Chờ duyệt | `bg-yellow-100` | Đã gửi admin phê duyệt |
| Đã duyệt | `bg-green-100` | Admin đã duyệt, chờ mua hàng |
| Từ chối | `bg-red-100` | Bị từ chối |
| Hoàn thành | `bg-emerald-100` | Đã mua xong, kho được thông báo |

**Model Prisma `PurchaseRequest` (20 fields + relation `items`, `@@schema("business")`):**
`id`, `stt (autoincrement)`, `ngayYeuCau`, `maYeuCau (unique)`, `employeeId (FK)`, `maNhanVien`, `tenNhanVien`, `phanLoai? (@deprecated)`, `tenHangHoa? (@deprecated)`, `soLuong? (@deprecated)`, `donViTinh? (@deprecated)`, `mucDichYeuCau`, `mucDoUuTien`, `ghiChu?`, `fileKemTheo?`, `trangThai (default "Chờ duyệt")`, `nguoiDuyet?`, `ngayDuyet?`, `supplyRequestId? (FK SupplyRequest)`, `nhaCungCapId? (FK Supplier)`, `giaDuKien?`, `ghiChuMuaHang?`, `isQuickPurchase (default false)`, `sourceType (default "MANUAL": MANUAL/SHORTAGE/REORDER/QUICK)`, `createdAt`, `updatedAt`.

**Model `PurchaseRequestItem` (8 fields, `onDelete: Cascade`):**
`id`, `purchaseRequestId (FK)`, `phanLoai`, `tenHangHoa`, `soLuong (Float)`, `donViTinh`, `nhaCungCapId? (FK Supplier, relation "PurchaseRequestItemSupplier")`, `giaDuKien? (Float)`.

**Luồng Gửi duyệt (chỉ NVL có):**

1. Thu mua mở **Chỉnh sửa** → điền **NCC + đơn giá cho từng dòng** trong bảng báo giá per-item (7 cột: `#`, Hàng hóa, SL, ĐVT, Nhà cung cấp (select), Đơn giá, Thành tiền; footer Tổng cộng).
2. Nút **Gửi duyệt** (trong bảng chính) hoặc **Lưu & Gửi duyệt** (trong modal Edit) sẽ validate: mọi `item` phải có `nhaCungCapId` và `giaDuKien > 0`, nếu thiếu sẽ hiện modal cảnh báo liệt kê sản phẩm thiếu.
3. Gọi `POST /purchase-requests/:id/submit-approval` → chuyển `Chờ báo giá` → `Chờ duyệt`.
4. Nút **Đã mua xong** (khi `Đã duyệt`) → `PUT /purchase-requests/:id { trangThai: 'Hoàn thành' }` → thông báo kho nhập hàng.

**Phân trang:** Server pagination `purchaseRequestService.getAllPurchaseRequests(page, 10, search, …, { phanLoaiNCC: 'NVL' })`, Trước/Sau thuần túy.

**Thiếu gì / Đề xuất:**

| Thiếu ở bảng chính | Có trong Prisma nhưng không hiện | Đề xuất |
|--------------------|----------------------------------|---------|
| Tổng tiền dự kiến | `sum(items[].soLuong * giaDuKien)` | Thêm cột Tổng tiền — nhân viên thu mua cần nắm giá trị để ưu tiên xử lý |
| Nhà cung cấp (tóm tắt) | `items[].supplier.tenNhaCungCap` | Thêm cột NCC (ví dụ: "NCC A +2") hoặc tooltip |
| Nguồn gốc | `sourceType` | Thêm cột Nguồn (MANUAL/SHORTAGE/REORDER/QUICK) — hiện chỉ hiện badge bổ sung cho SHORTAGE |
| Mục đích yêu cầu | `mucDichYeuCau` | Thêm cột Mục đích (truncate) — quan trọng để hiểu ngữ cảnh |
| Mức độ ưu tiên đã có | — | Đã có, tốt |

### 3.4. Tab Yêu cầu bổ sung — `replenishment`

Delegate sang `ReplenishmentList.tsx` (138 dòng). Đây là **view lọc** của PurchaseRequest: `sourceType === 'SHORTAGE' && trangThai === 'Chờ báo giá'`. Label hiển thị là **"Yêu cầu bổ sung"** (qua `labelForPurchaseRequest()`), không phải "Yêu cầu mua hàng".

**Bảng 7 cột:**

| # | Cột | Field | Hiển thị |
|---|-----|-------|----------|
| 1 | Mã | `maYeuCau` | Text xanh |
| 2 | Nhãn | `labelForPurchaseRequest(r)` | Badge amber `Yêu cầu bổ sung` + icon `PackageOpen` |
| 3 | Ngày | `ngayYeuCau` | `toLocaleDateString('vi-VN')` |
| 4 | Nhân viên | `tenNhanVien` | Tên NV |
| 5 | Sản phẩm | `items[].tenHangHoa` | Join `, `, truncate 220px, tooltip đầy đủ |
| 6 | Nguồn | `supplyRequestId` → `supplyRequest.maYeuCau` | Link indigo mở tab mới `/supply-requests?supplyRequestId=`, fallback `slice(0,8)` |
| 7 | Thao tác | — | Nút Xem (`Eye`) mở modal chi tiết |

**Phân trang:** Server pagination `PAGE_SIZE 10`, Trước/Sau.

**Thiếu gì / Đề xuất (audit findings):**

| Thiếu ở bảng chính | Có trong model `SupplyRequestDecision` | Đề xuất |
|--------------------|----------------------------------------|---------|
| Số lượng thiếu | `SupplyRequestDecision.shortageQty` | Thêm cột **SL thiếu** — đây là thông tin cốt lõi của yêu cầu bổ sung, nhân viên thu mua cần biết thiếu bao nhiêu để đặt hàng |
| Mức độ ưu tiên | `PurchaseRequest.mucDoUuTien` | Thêm cột **Ưu tiên** (badge đỏ/vàng/xanh) — để sắp xếp xử lý theo độ gấp |
| Tổng tiền / Đơn giá | `items[].giaDuKien` | Thêm cột **Giá trị** nếu đã có báo giá sơ bộ |

---

## 4. Chi tiết Phòng Mua Thiết bị — `PurchasingEquipment.tsx` (994 dòng)

Cấu trúc 4 tabs **giống hệt NVL** (suppliers / orderList / purchaseRequestList / replenishment), nhưng tồn tại **drift nghiêm trọng** — Equipment là bản copy cũ chưa được đồng bộ các cải tiến của NVL.

### 4.1. Tổng quan drift

| Vấn đề | NVL (chuẩn) | Thiết bị (drift) | Mức độ |
|--------|-------------|-------------------|--------|
| **Gửi duyệt** | Có nút `Gửi duyệt` (cam) khi `Chờ báo giá` + validate per-item NCC/đơn giá, gọi `submitForApproval` | **Không có** — chỉ có `Đã mua xong` khi `Đã duyệt` | Nghiêm trọng — luồng báo giá → duyệt bị gãy |
| **Bảng báo giá per-item trong Edit modal** | Có — bảng 7 cột editable (NCC select + đơn giá input + thành tiền auto + tổng cộng), state `editItems[]`, `tongTienEdit` | **Không có** — Edit modal chỉ có các field flat `phanLoai/tenHangHoa/soLuong/donViTinh` legacy | Nghiêm trọng — không thể báo giá chi tiết |
| **Badges trạng thái** | Đủ 5: Chờ báo giá (cam), Chờ duyệt (vàng), Đã duyệt (xanh), Từ chối (đỏ), Hoàn thành (ngọc) | Thiếu **Chờ báo giá** (cam) và **Hoàn thành** (ngọc) — chỉ còn 3 | Trung bình — gây nhầm lẫn |
| **Confirm dialog** | Custom `confirmAction` modal (có `variant`, `confirmLabel`, `hideCancel`, `confirmLoading`) | `window.confirm` / `window.alert` thuần | Trung bình — UX kém, không nhất quán |
| **Auth khi tạo NCC** | `useAuth().user.employeeId` | `localStorage.getItem('user')` parse JSON | Trung bình — dễ vỡ khi đổi storage key |
| **Deep-link purchaseRequestId** | Có — `useEffect` đọc `?purchaseRequestId=` và auto-mở detail | Không có | Nhẹ |
| **Generic detail modal** | Có — `isDetailModalOpen` render `Object.entries(selectedItem)` | Có nhưng khác style | Nhẹ |

### 4.2. Bảng Nhà cung cấp Thiết bị

Giống hệt NVL (11 cột, cùng thứ tự), chỉ khác `phanLoaiNCC: 'Thiết bị'` và theme tím (`text-purple-600`, `bg-purple-600`). Cùng thiếu Email/Địa chỉ/Khả năng cung cấp ở bảng chính.

### 4.3. Bảng Danh sách mua hàng Thiết bị

8 cột giống NVL nhưng:

- Cột STT **đã fix** offset: `(purchaseRequestPage - 1) * 10 + index + 1` (NVL vẫn bug `index + 1`).
- Cột Trạng thái thiếu 2 badges như đã nêu.
- Cột Hành động thiếu nút Gửi duyệt, chỉ còn Xem/Sửa/Xóa/Đã mua xong.

### 4.4. Đề xuất khắc phục drift

1. Copy toàn bộ logic `editItems` + `tongTienEdit` + `updateEditItem` + bảng báo giá per-item + `handleSubmitForApproval` + `confirmAction` modal từ `PurchasingMaterials.tsx` sang `PurchasingEquipment.tsx`.
2. Thay `localStorage.getItem('user')` bằng `useAuth()`.
3. Bổ sung 2 badge trạng thái còn thiếu.
4. Cân nhắc tách shared components (`SupplierTable`, `PurchaseRequestTable`, `PRQuotationModal`) để tránh drift tái diễn — hiện 2 file ~1000-1800 dòng với ~80% code trùng lặp.

---

## 5. Ghi chú cross-cutting

### 5.1. Replenishment (Yêu cầu bổ sung — SHORTAGE)

- **Nguồn gốc:** Khi kho xử lý `SupplyRequest` (yêu cầu cấp hàng) và chọn decision `Chuyển thu mua` hoặc `Cấp một phần`, backend tạo `SupplyRequestDecision` (`decision`, `fulfilledQty`, `shortageQty`, `triggeredPurchaseRequestId`) và auto-tạo `PurchaseRequest` với `sourceType = 'SHORTAGE'`, `trangThai = 'Chờ báo giá'`.
- **Hiển thị:** `ReplenishmentList` filter `sourceType: 'SHORTAGE', trangThai: 'Chờ báo giá'`; sau khi thu mua báo giá và Gửi duyệt, phiếu rời khỏi Replenishment và xuất hiện ở tab Mua hàng với `Chờ duyệt`.
- **Model liên quan:** `SupplyRequestDecision` (`supplyRequestItemId`, `decision`, `fulfilledQty`, `shortageQty`, `decidedByEmployeeId`, `triggeredPurchaseRequestId → PurchaseRequest`).

### 5.2. Đơn hàng (Order — `OrderManagement.tsx`)

- Thuộc `business` schema, không phải `PurchaseRequest` — đây là đơn hàng bán cho khách hàng (có `maDonHang`, `maBaoGia`, `tenKhachHang`, `giaTriDonHangUSD/VND`, `trangThaiSanXuat`, `trangThaiThanhToan`).
- Được nhúng vào cả 2 phòng Thu mua để thu mua nắm được nhu cầu sản xuất liên quan, nhưng **không phải** đơn mua hàng (purchase order) gửi NCC — hiện chưa có model Purchase Order riêng gửi NCC, đây là gap cần làm rõ.

### 5.3. Linh kiện — `SparePartList.tsx` (400 dòng, thuộc Kỹ thuật nhưng liên quan thu mua)

Liệt kê để đủ scope nếu muốn mở rộng:

- **Bảng 8 cột, sticky left/right:** Mã linh kiện (sticky left, mono xanh), Tên linh kiện, Loại (CK/DT/D/TH), Đơn vị, SL tồn, Nhà cung cấp (free text `nhaCungCap`, **không FK** `Supplier`), Trạng thái (badge), Thao tác (sticky right, `ResponsiveRowActions`).
- **Vấn đề:** `SparePart.nhaCungCap` là `String?` free text, không FK tới `Supplier` — không thể join, không validate, không báo cáo theo NCC. Đề xuất: thêm `nhaCungCapId FK Supplier?` và migration backfill.
- Thuộc quyền `technical` + `ADMIN` (`can('spare-parts', …)`), không phải `purchasing` — nhưng luồng mua linh kiện thực tế đi qua Thu mua, nên cần liên kết rõ hơn.

### 5.4. Services

| Service | File | Methods chính |
|---------|------|---------------|
| `supplierService` | `frontend/src/services/supplierService.ts` (132 dòng) | `getAllSuppliers(page, limit, search, phanLoaiNCC)`, `generateCode(phanLoaiNCC)`, `createSupplier`, `updateSupplier`, `deleteSupplier`, `exportToExcel({ search, phanLoaiNCC })` |
| `purchaseRequestService` | `frontend/src/services/purchaseRequestService.ts` (190 dòng) | `getAllPurchaseRequests(page, limit, search, month, year, { phanLoaiNCC, sourceType, trangThai })`, `getPurchaseRequestById`, `createPurchaseRequest(data, file?)`, `updatePurchaseRequest(id, { items, file, … })`, `deletePurchaseRequest`, `submitForApproval(id)`, `exportToExcel` |

Cả hai đều hỗ trợ `FormData` (kèm file) và JSON thuần, tự động chọn branch dựa trên `file` param.

---

## 6. Hướng dẫn sử dụng

### 6.1. Quy trình mua hàng chuẩn (áp dụng cho cả NVL và Thiết bị)

```
Yêu cầu mua hàng (MANUAL/SHORTAGE/REORDER)
        ↓
  Chờ báo giá  ← Thu mua điền NCC + đơn giá per-item trong modal Chỉnh sửa
        ↓  (Gửi duyệt — validate đủ NCC & giá)
  Chờ duyệt    ← Admin phê duyệt (ngoài scope Thu mua)
        ↓
  Đã duyệt     ← Thu mua thực hiện mua hàng
        ↓  (Đã mua xong)
  Hoàn thành   → Kho được thông báo chuẩn bị nhập hàng
        ↓
  Từ chối  (nhánh rẽ từ Chờ duyệt)
```

### 6.2. Thao tác theo tab

**Nhà cung cấp:**

1. Chọn tab **Nhà cung cấp NVL** hoặc **Nhà cung cấp Thiết bị**.
2. Tìm kiếm theo tên/mã, bấm **Tìm kiếm**.
3. Bấm **+ Thêm nhà cung cấp** → form 13 fields (Mã NCC auto-generate, Tên*, Loại cung cấp*, Quốc gia*, Website, Người liên hệ*, SĐT*, Email*, Địa chỉ*, Khả năng, Loại hình*, Trạng thái, Doanh chi) → **Thêm mới**.
4. Icon **Mắt** xem chi tiết, **Bút** sửa, **Thùng rác** xóa (có modal xác nhận).
5. **Xuất Excel** để báo cáo.

**Yêu cầu mua hàng:**

1. Tab **Danh sách mua hàng** → tìm kiếm, xem danh sách 8 cột.
2. Bấm **Mắt** để xem chi tiết (grid 2 cột + bảng items 8 cột per-item với Tổng cộng).
3. Bấm **Bút** để mở modal **Xử lý yêu cầu mua hàng**:
   - Phần trên: thông tin yêu cầu read-only (người YC, ngày, ưu tiên, danh sách hàng hóa).
   - Phần dưới: chọn **Trạng thái**, nếu chọn `Đã duyệt` sẽ hiện thêm Người duyệt/Ngày duyệt.
   - **Báo giá cho từng hàng hóa**: chọn NCC (dropdown từ Suppliers đã load) và nhập Đơn giá cho từng dòng → Thành tiền & Tổng cộng tự tính.
   - Ghi chú mua hàng + File đính kèm (`FileUpload`, accept pdf/doc/xls/jpg/png).
   - **Lưu cập nhật** hoặc **Lưu & Gửi duyệt** (chỉ hiện khi `Chờ báo giá`, có validate).
4. Từ bảng chính: **Gửi duyệt** (cam, Chờ báo giá) hoặc **Đã mua xong** (ngọc, Đã duyệt).

**Yêu cầu bổ sung:**

1. Tab **Yêu cầu bổ sung** → xem các phiếu SHORTAGE đang chờ báo giá.
2. Cột **Nguồn** bấm để mở phiếu cấp hàng gốc (`/supply-requests?supplyRequestId=`).
3. Bấm **Mắt** để xem chi tiết, sau đó xử lý như yêu cầu mua hàng thường (báo giá → gửi duyệt).

**Đơn hàng:**

1. Tab **Danh sách đơn hàng** → filter theo Mã ĐH/Mã BG/Khách hàng/Trạng thái SX.
2. Chọn **Số mục/trang** (10/20/50/100), điều hướng phân trang số.
3. Bấm row để xem chi tiết (6 sections: cơ bản, khách hàng, giá trị, thanh toán đợt 1/2, sản xuất, trạng thái, danh sách hàng hóa).
4. **Xuất Excel** toàn bộ đơn hàng.

### 6.3. Lưu ý quan trọng

| Lưu ý | Chi tiết |
|-------|----------|
| **Phân trang** | NCC và Yêu cầu mua hàng dùng limit cố định 10, chỉ có Trước/Sau. Riêng Đơn hàng có limit selector 10/20/50/100 và pagination số — nên thống nhất. NCC/YC mua hàng nên thêm limit selector và hiển thị `Hiển thị X–Y / total`. |
| **Drift NVL vs Thiết bị** | Thiết bị đang thiếu luồng Gửi duyệt + bảng báo giá per-item — nếu thu mua thiết bị cần báo giá, phải fix drift trước khi dùng. Tạm thời chỉ NVL là đầy đủ. |
| **Phân quyền** | Thu mua chỉ xử lý báo giá và mua hàng; phê duyệt (`Chờ duyệt` → `Đã duyệt`/`Từ chối`) do Admin thực hiện. Nút Gửi duyệt/Đã mua xong có check `can()` — user thiếu quyền sẽ không thấy nút. |
| **SHORTAGE vs MANUAL** | `sourceType` quyết định nhãn hiển thị (`Yêu cầu bổ sung` vs `Yêu cầu mua hàng`) qua `labelForPurchaseRequest()`. Mã phiếu (`maYeuCau`) không đổi — chỉ khác label. |
| **SparePart NCC free text** | `SparePart.nhaCungCap` không FK Supplier — không join được. Nếu cần báo cáo linh kiện theo NCC, phải thêm FK. |
| **File đính kèm** | Mọi PurchaseRequest đều hỗ trợ `fileKemTheo` (FormData upload). Trong modal Edit, `FileUpload` hiện file cũ và cho phép thay/xóa. |
| **Deep-link** | NVL hỗ trợ `?purchaseRequestId=` và `?supplyRequestId=` từ notification — bấm thông báo sẽ auto-mở đúng phiếu và đúng tab. Thiết bị chưa hỗ trợ `purchaseRequestId` deep-link. |

---

## 7. Tổng kết đề xuất cải tiến (hướng tới nhân viên thu mua nắm việc)

| # | Đề xuất | Ưu tiên | File ảnh hưởng |
|---|---------|---------|----------------|
| 1 | Thêm cột **Tổng tiền** + **NCC tóm tắt** + **Nguồn** vào bảng Yêu cầu mua hàng | Cao | `PurchasingMaterials.tsx`, `PurchasingEquipment.tsx` |
| 2 | Thêm cột **Email/Địa chỉ/Khả năng** (hoặc gộp) vào bảng NCC | Cao | Cả 2 |
| 3 | Thêm cột **SL thiếu** + **Ưu tiên** vào bảng Yêu cầu bổ sung | Cao | `ReplenishmentList.tsx` |
| 4 | Thêm cột **Giá trị** + **Ngày giao** vào bảng Đơn hàng | Trung bình | `OrderManagement.tsx` |
| 5 | Đồng bộ drift Thiết bị theo NVL (Gửi duyệt, per-item table, badges, confirm modal, useAuth) | Cao | `PurchasingEquipment.tsx` |
| 6 | Tách shared components (`SupplierTable`, `PRTable`, `PRQuotationModal`) để chống drift tái diễn | Trung bình | Mới |
| 7 | Thêm FK `SparePart.nhaCungCapId → Supplier` | Trung bình | `schema.prisma` + `SparePartList.tsx` |
| 8 | Thống nhất pagination (limit selector + range display) cho NCC và YC mua hàng | Thấp | Cả 2 |
| 9 | Sửa bug STT `index + 1` trong YC mua hàng NVL thành `(page-1)*10 + index + 1` | Thấp | `PurchasingMaterials.tsx` |
| 10 | Đổi card "Mua thiết bị" value từ `thietBiSuppliers` sang số YC mua thiết bị cho nhất quán | Thấp | `PurchasingManagement.tsx` |

---

*Trace từ:* `frontend/src/pages/PurchasingManagement.tsx`, `frontend/src/pages/purchasing/PurchasingMaterials.tsx`, `frontend/src/pages/purchasing/PurchasingEquipment.tsx`, `frontend/src/components/OrderManagement.tsx`, `frontend/src/components/ReplenishmentList.tsx`, `frontend/src/components/SparePartList.tsx`, `frontend/src/services/supplierService.ts`, `frontend/src/services/purchaseRequestService.ts`, `frontend/src/utils/purchaseRequestLabel.ts`, `backend/prisma/schema/business_production.prisma` (Supplier, PurchaseRequest, PurchaseRequestItem, SupplyRequestDecision).
