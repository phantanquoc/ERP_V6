# Bộ phận Kỹ thuật — Hướng dẫn sử dụng & Tham chiếu

> Tài liệu này được viết lại từ trace code thực tế (frontend components + Prisma schema).
> Phạm vi: `/technical`, `/technical/quality`, `/technical/projects`.

---

## 1. Tổng quan

Bộ phận Kỹ thuật quản lý vòng đời thiết bị sản xuất: **hệ thống máy**, **cây linh kiện**, **yêu cầu sửa chữa**, **lỗi cơ điện**, **kế hoạch bảo dưỡng**, **linh kiện tồn kho** và **dự án kỹ thuật** (giai đoạn, công việc, chi phí).

| Route | Component | Quyền |
|-------|-----------|-------|
| `/technical` | `TechnicalManagement.tsx` | Technical, Admin |
| `/technical/quality` | `technical/TechnicalQuality.tsx` | Technical, Admin |
| `/technical/mechanical` | chuyển hướng → `/technical/quality?tab=repairAndFault` | Technical, Admin |
| `/technical/projects` | `technical/TechnicalProjects.tsx` | Technical, Admin |

Trong `TechnicalManagement`, quyền mở từng phòng con được kiểm tra bằng `hasSubModuleAccess('technical', subModule, ...)` với hai subModule: **`quality`** (Phòng Đảm bảo & Cải tiến — QLHTM/Cơ-điện) và **`projects`** (Phòng Phát triển). Route `/technical/mechanical` là alias cũ, nay tự động chuyển về tab Sửa chữa & Lỗi của `quality`.

Dữ liệu lưu trong schema `business` (PostgreSQL) qua Prisma, ID dùng **CUID**. Ngoại lệ: `RepairRequest` dùng ID số nguyên auto-increment do là model tạo sớm.

---

## 2. Tổng quan Kỹ thuật (`TechnicalManagement.tsx`)

Trang dashboard tổng hợp — **không có bảng dữ liệu**, chỉ có KPI và biểu đồ.

### 2.1. Hàng KPI — 6 thẻ

| # | Thẻ | Ý nghĩa | Sub-label |
|---|-----|---------|-----------|
| 1 | **Hệ thống máy** | Số hệ thống đang hoạt động | `active/total hoạt động` + chấm màu theo tỉ lệ vận hành |
| 2 | **Chi tiết máy** | Số chi tiết máy đang hoạt động | `Tổng: N` |
| 3 | **Yêu cầu sửa chữa** | Số yêu cầu đang chờ xử lý | `N tổng` + chấm cảnh báo nếu >0 |
| 4 | **Nghiệm thu** | Tổng số nghiệm thu | `trên N yêu cầu` |
| 5 | **Mẫu lỗi** | Số mẫu lỗi đang áp dụng | `N bản ghi lỗi` |
| 6 | **Linh kiện** | Tổng số linh kiện | `N hết hàng` / `N sắp hết` / `Đủ hàng` |

### 2.2. Hàng Bento — 4 biểu đồ (4 ô, không có bảng)

| Ô | Nội dung | Kiểu |
|---|----------|------|
| **Trạng thái hệ thống** | Donut máy Hoạt động vs Ngừng hoạt động, % vận hành ở giữa | PieChart |
| **Yêu cầu sửa chữa** | Lưới thẻ theo trạng thái + ProgressBar phân đoạn | Stat + Progress |
| **Bản ghi lỗi** | Danh sách lỗi theo trạng thái + donut phân bố | List + PieChart |
| **Phòng phát triển** | CircularProgress % hoàn thành dự án + cảnh báo công việc chưa phân giai đoạn | Circular |

---

## 3. Phòng Đảm bảo & Cải tiến (`TechnicalQuality.tsx`)

Có **4 tab chính**, đồng bộ với URL (`?tab=` và `?sub=`):

| Tab | Nội dung |
|-----|----------|
| **Hệ thống máy** (`machineSystems`) | Danh sách hệ thống + cây chi tiết + Hồ sơ máy |
| **Sửa chữa & Lỗi** (`repairAndFault`) | 2 sub-view: *Yêu cầu sửa chữa* / *Danh sách lỗi* |
| **Bảo dưỡng** (`maintenance`) | Kế hoạch bảo dưỡng + Biên bản bảo dưỡng |
| **Linh kiện & Đơn hàng** (`partsAndOrders`) | 2 sub-view: *Linh kiện* / *Đơn hàng* |

---

### 3.1. Tab Hệ thống máy (`MachineSystemList.tsx`)

#### Bảng hệ thống máy — 9 cột (sticky Mã + Thao tác)

| # | Cột | Kiểu |
|---|-----|------|
| 1 | Mã | sticky trái, mono |
| 2 | Tên hệ thống | text |
| 3 | Loại | danh mục `MachineSystemCategory` (Sản xuất, Đóng gói, Điện, Nước...) |
| 4 | Khu vực | text |
| 5 | Vị trí | text |
| 6 | Người thực hiện | text |
| 7 | Hoạt động | badge Đang hoạt động / Dừng |
| 8 | Tình trạng | badge `MachineStatus` (Hoạt động / Bảo trì / Ngừng hoạt động) |
| 9 | Thao tác | sticky phải: Sửa / Nhân bản / Cập nhật trạng thái / Xóa |

**Model Prisma:** `MachineSystem` (`@@map("machine_systems")`) — CUID, `maHeThong` unique, hỗ trợ nhân bản qua `parentSystemId`, file đính kèm `fileDinhKem`.

**Cây chi tiết máy** (hiện khi chọn hệ thống) — bảng 7 cột: Tên chi tiết (thụt theo cấp), Mã, Loại (`MachineSystemDetailType`: Thiết bị/Cụm/Linh kiện/Điểm kiểm tra), Vị trí, Phụ trách, Trạng thái, Thao tác.

**Hồ sơ máy** (`MachineSummaryDrawer.tsx`) — drawer toàn màn hình, 7 thẻ số liệu + 6 tab:
- Thông tin chung, Chi tiết/cây linh kiện, Nhật ký trạng thái, Lỗi & sửa chữa, Bảo dưỡng, Vận hành.

#### Nhật ký trạng thái máy (`MachineStatusLogList.tsx`) — 7 cột

Máy, Trạng thái cũ, Trạng thái mới, Nguyên nhân, Người cập nhật, Ghi chú, Thời điểm.

**Model:** `MachineStatusLog`. Filter: máy, trạng thái mới, từ ngày / đến ngày (`dateFrom`, `dateTo`).

> ⚠️ **Thiếu trên bảng máy:** `chucNang`, `maThietBi`, `nhiemVu`, `fileDinhKem` có trong Prisma nhưng **chưa hiện** ở bảng 9 cột (chỉ thấy trong form và hồ sơ máy).
> ⚠️ **Bug ngày:** filter nhật ký dùng `dateFrom`/`dateTo` ở frontend; cần đồng nhất tên tham số với backend.

---

### 3.2. Tab Sửa chữa & Lỗi

#### 3.2a. Yêu cầu sửa chữa (`RepairRequestList.tsx`) — 10 cột

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã yêu cầu | sticky trái |
| 2 | Ngày | định dạng `vi-VN` |
| 3 | Người yêu cầu | |
| 4 | Thiết bị lỗi | nhiều dòng (mỗi item một thiết bị) |
| 5 | Bối cảnh | chi tiết máy hoặc hệ thống |
| 6 | Ưu tiên | badge (Khẩn cấp/Cao/Trung bình/Thấp) |
| 7 | Trạng thái | badge theo `STATUS_LABELS` |
| 8 | File | link xem file đính kèm |
| 9 | Nghiệm thu | badge `N NT` hoặc `Chưa có` |
| 10 | Thao tác | sticky phải: Bắt đầu / Nghiệm thu / Xem / Sửa / Lịch sử / Hủy / Xóa |

Trên bảng còn có **dashboard thống kê 3 thẻ** (Tổng, Chờ xử lý, Đang sửa chữa, Hoàn thành — thực tế 4 StatCard) với so sánh kỳ trước (`delta`) và thời gian hoàn thành trung bình, lọc theo khoảng ngày (mặc định 90 ngày).

**Model:** `RepairRequest` (ID **số nguyên**) + `RepairRequestItem` + `RepairRequestStatusLog`.

> ⚠️ Search hiện tại không quét vào `items` (chỉ trường cấp yêu cầu).
> ⚠️ Liên kết `faultRecordId` chưa hiển thị chip trên bảng.

#### 3.2b. Danh sách lỗi (`FaultRecordList.tsx`)

Gồm 2 chế độ xem: **Bản ghi lỗi** và **Mẫu lỗi** (chỉ người có quyền mới thấy tab Mẫu lỗi).

**Bản ghi lỗi — 7 cột:**

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã lỗi | sticky trái |
| 2 | Tên lỗi | kèm mẫu lỗi gốc |
| 3 | Vị trí | hệ thống + chi tiết máy |
| 4 | Mức độ | badge Nghiêm trọng / Trung bình / Nhẹ |
| 5 | Trạng thái | Đang theo dõi / Đã xử lý / Tái phát |
| 6 | Phát hiện | ngày + người + ngày xử lý |
| 7 | Thao tác | sticky phải |

**Mẫu lỗi (`FaultTemplate`) — 7 cột:**

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã mẫu | sticky trái |
| 2 | Tên mẫu | |
| 3 | Vị trí | hệ thống + chi tiết |
| 4 | Mức độ | badge |
| 5 | Trạng thái | Đang áp dụng / Tạm dừng / Dừng |
| 6 | Bản ghi | số bản ghi lỗi dùng mẫu này |
| 7 | Thao tác | sticky phải |

Ngoài ra có:
- **Chi tiết mẫu lỗi** (`FaultTemplateDetail.tsx`) — drawer hiển thị thông tin chung, biểu đồ theo tháng, **5 bản ghi gần nhất** và **các bước sửa chữa** (`RepairStep`).
- **Bản đồ nhiệt** (`FaultHeatmap.tsx`) — ma trận máy × mẫu lỗi, **giới hạn 10×10**, màu theo tần suất.
- Thống kê: máy hay lỗi nhất, lỗi hay tái phát, xu hướng tháng, mới phát sinh.

**Model:** `FaultRecord` + `FaultTemplate` + `RepairStep` + `FaultRecordStatusLog` (enum `FaultRecordStatus`).

> ⚠️ **Thiếu trên bảng:** `moTa` và `fileDinhKem` có trong Prisma nhưng không hiện ở bảng bản ghi/mẫu lỗi.

---

### 3.3. Tab Bảo dưỡng (`maintenance`)

#### Kế hoạch bảo dưỡng (`MaintenancePlanList.tsx`)

Hiển thị theo **card từng kế hoạch**, mỗi card chứa bảng hạng mục với **header T1–T12** (12 cột tháng) + 4 cột đầu:

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Thiết bị | chi tiết máy, gom nhóm cha–con |
| 2 | Nội dung BD | nội dung bảo dưỡng |
| 3 | Tần suất | Hàng ngày/tuần/tháng/2-3-6 tháng/năm/Không cố định |
| 4 | Tổ thực hiện | Cơ khí / Cơ điện / Điện / Tổng hợp |
| 5–16 | T1 … T12 | ô checkbox hoàn thành từng tháng (có màu tháng hiện tại) |

Footer card: người lập, ngày lập, số biên bản, tiến độ `completed/total (%)`.

**Model:** `MaintenancePlan` + `MaintenancePlanItem` (có `soLuong`, `thangBatDau`) + `MaintenancePlanItemLog` (unique theo `item+thang+lanThu`) + `MaintenanceTemplate`.

> ⚠️ **Thiếu trên bảng:** `soLuong`, `thangBatDau` có trong Prisma nhưng không hiện ở bảng hạng mục.
> ⚠️ `limit 5` hardcode; chi tiết >100 bị cap ở 100.

#### Form kế hoạch (`MaintenancePlanForm.tsx`) — bảng editor 6 cột

Thiết bị, Nội dung BD, Tần suất, Bắt đầu (tháng), Tổ thực hiện, Nút xóa. Có khối **áp dụng hàng loạt** (bulk) cho tần suất + tháng bắt đầu + tổ.

#### Biên bản bảo dưỡng (`MaintenanceRecordList.tsx`) — 8 cột

Mã BB (+ badge "Tự sinh"), Loại (Bảo dưỡng/Sửa chữa), Hệ thống, Thiết bị, Nội dung, Ngày, Người thực hiện (+ số người phụ), Thao tác.

**Model:** `MaintenanceRecord`.

---

### 3.4. Tab Linh kiện & Đơn hàng

#### Linh kiện (`SparePartList.tsx`) — 8 cột (sticky Mã + Thao tác)

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã linh kiện | sticky trái |
| 2 | Tên linh kiện | |
| 3 | Loại | CK Cơ khí / DT Điện tử / D Điện / TH Tổng hợp |
| 4 | Đơn vị | Cái / Bộ / Mét / Kg |
| 5 | SL tồn | số lượng tồn kho |
| 6 | Nhà cung cấp | free text |
| 7 | Trạng thái | Đang sử dụng / Chưa sử dụng / Hết hàng |
| 8 | Thao tác | sticky phải: Sửa / Xóa |

Hỗ trợ **Xuất Excel**, tìm kiếm, lọc theo loại và trạng thái.

**Model:** `SparePart`.

> ⚠️ **Thiếu trên bảng chính:** `giaNhap`, `ngayMua` có trong Prisma (và trong bản Excel xuất ra) nhưng **không hiện** ở bảng 8 cột.
> ⚠️ `nhaCungCap` là text tự do, không phải khóa ngoại.

#### Đơn hàng

Sub-view **Đơn hàng** tái sử dụng component `OrderManagement` (dùng chung với bộ phận Kinh doanh), ẩn header.

---

## 4. Phòng Phát triển (`TechnicalProjects.tsx` → `ProjectList.tsx`)

Quản lý **dự án → giai đoạn → công việc**, kèm **chi phí** và **timeline Gantt**. Quyền: người tạo dự án, Admin, hoặc người có quyền technical.

### 4.1. Bảng dự án master (`ProjectList.tsx`) — 7 cột

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã | sticky trái |
| 2 | Tên dự án | click mở chi tiết |
| 3 | Trạng thái | Lên kế hoạch / Chờ duyệt / Đang thực hiện / Hoàn thành / Tạm dừng |
| 4 | Giai đoạn | số giai đoạn |
| 5 | Công việc | số công việc |
| 6 | Thời gian | ngày bắt đầu – kết thúc |
| 7 | Thao tác | sticky phải: Xóa |

**Model:** `Project` + `ProjectMember` + `ProjectApproval` (quy trình duyệt).

> ⚠️ **Thiếu trên bảng master:** cột **Tiến độ %** (`tienDoTongThe`) — có trong model và hiển thị ở modal chi tiết nhưng chưa đưa ra bảng master.

### 4.2. Modal chi tiết dự án — 5 tab

| Tab | Component | Nội dung |
|-----|-----------|----------|
| **Tổng quan** | `ProjectOverview.tsx` | 4 thẻ KPI (tiến độ, ngân sách, thời gian còn lại, công việc) + progress + 2 biểu đồ (chi phí theo loại, ngân sách theo giai đoạn) + thành viên + tiến độ giai đoạn. **Không có bảng.** |
| **Kế hoạch** | inline | Danh sách giai đoạn (drag-drop sắp xếp) + bảng công việc |
| **Thực tế** | inline | Tiến độ thực tế, công việc phát sinh, tổng chi phí |
| **Chi phí** | `ProjectCosts.tsx` | Bảng chi phí 11 cột |
| **Timeline Gantt** | `ProjectGantt.tsx` | Biểu đồ Gantt giai đoạn + công việc + milestone |

### 4.3. Bảng công việc (task) — 5–9 cột tùy chế độ

Bảng task dùng chung cho cả tab **Kế hoạch** (`viewMode="plan"`) và **Thực tế** (`viewMode="actual"`):

| Cột | Plan | Actual |
|-----|:----:|:------:|
| STT | ✅ | ✅ |
| Công việc | ✅ | ✅ |
| Phụ trách | ✅ | ✅ |
| Ưu tiên | — | ✅ |
| Tiến độ | — | ✅ |
| Trạng thái | — | ✅ |
| Ngày (KH/TT) | ✅ | ✅ |
| Chi phí | ✅ | ✅ |
| Thao tác | nếu có quyền | nếu có quyền |

→ **5 cột** ở chế độ plan (không quyền) và tối đa **9 cột** ở chế độ actual (có quyền).

### 4.4. Bảng chi phí (`ProjectCosts.tsx`) — 11 cột

| # | Cột | # | Cột |
|---|-----|---|-----|
| 1 | Loại | 7 | SL thực tế |
| 2 | Tên chi phí | 8 | Giá thực tế |
| 3 | Đơn vị | 9 | Thành tiền thực tế |
| 4 | SL kế hoạch | 10 | Giai đoạn |
| 5 | Giá kế hoạch | 11 | Thao tác (nếu có quyền) |
| 6 | Thành tiền kế hoạch | | |

Trên bảng còn có **bảng tổng hợp** theo loại chi phí (Nhân công / Vật tư / Phụ liệu / Khác) với cảnh báo vượt kế hoạch.

**Model:** `ProjectCost`.

### 4.5. Các component dự án khác

- **`ProjectOverview.tsx`** — KPI + biểu đồ, **không có bảng**.
- **`ProjectGantt.tsx`** — biểu đồ Gantt, **không có bảng** (render theo dòng phase/task).
- **`ProjectUpdates.tsx`** — nhật ký cập nhật dự án. ⚠️ **Component này hiện không được mount** trong `ProjectList` (orphan) — tab "Thực tế" dùng bảng task inline thay vì `ProjectUpdates`.

> ⚠️ Task và chi phí **không phân trang** (hiển thị toàn bộ trong modal).

---

## 5. Hướng dẫn sử dụng

### 5.1. Xem tổng quan
1. Vào `/technical` → xem 6 thẻ KPI và 4 biểu đồ.
2. Click vào từng ô bento hoặc thẻ điều hướng để vào phòng con tương ứng.

### 5.2. Quản lý hệ thống máy
1. Vào tab **Hệ thống máy** → tìm kiếm, lọc theo trạng thái, sắp xếp.
2. Click hàng để mở **Hồ sơ máy** xem đầy đủ (thông tin, cây linh kiện, nhật ký, lỗi, bảo dưỡng, vận hành).
3. Dùng **Thêm hệ thống** / **Nhân bản** / **Cập nhật trạng thái** ở cột Thao tác.

### 5.3. Xử lý sửa chữa
1. Tab **Sửa chữa & Lỗi** → sub-view **Yêu cầu sửa chữa**.
2. Click hàng để mở chi tiết; dùng nút **Bắt đầu**, **Nghiệm thu** theo trạng thái.
3. Xem lịch sử trạng thái qua menu Thao tác.

### 5.4. Ghi nhận lỗi cơ điện
1. Tab **Sửa chữa & Lỗi** → sub-view **Danh sách lỗi**.
2. Thêm bản ghi lỗi; có thể chọn từ **Mẫu lỗi** để tự điền và gợi ý các bước sửa chữa.
3. Mở **Bản đồ nhiệt** để phát hiện máy hay lỗi nhất.

### 5.5. Lập & theo dõi bảo dưỡng
1. Tab **Bảo dưỡng** → tạo kế hoạch theo hệ thống + năm, điền hạng mục (nội dung, tần suất, tháng bắt đầu, tổ thực hiện).
2. Tick vào ô tháng tương ứng khi hoàn thành; hệ thống tự sinh biên bản bảo dưỡng.

### 5.6. Quản lý linh kiện
1. Tab **Linh kiện & Đơn hàng** → sub-view **Linh kiện**.
2. Thêm / sửa / xóa linh kiện; dùng **Xuất Excel** để lấy danh sách đầy đủ (có cả giá nhập, ngày mua).

### 5.7. Quản lý dự án
1. Vào `/technical/projects` → **Tạo dự án**, thêm giai đoạn và công việc.
2. Gửi duyệt cho Admin; khi được duyệt, kế hoạch khóa và chuyển sang **Đang thực hiện**.
3. Cập nhật tiến độ thực tế, chi phí; xem **Timeline Gantt** để theo dõi mốc.

---

## 6. Lưu ý & đề xuất cải tiến

### 6.1. Giới hạn phân trang
- `MachineSystemList` cap **100** bản ghi.
- `MaintenancePlanList` dùng `limit 5` hardcode; chi tiết >100 bị cap.
- Task/chi phí dự án **không phân trang**.

### 6.2. Phân quyền
- Mọi thao tác ghi yêu cầu quyền **technical** hoặc **Admin**.
- Tab **Mẫu lỗi** và các nút sửa/xóa chỉ hiện khi có quyền (kiểm tra qua Rule Matrix `can(...)` hoặc fallback theo `department === 'technical'`).
- Dự án có quy trình phê duyệt (`ProjectApproval`): người tạo gửi duyệt, Admin duyệt/từ chối.

### 6.3. Đề xuất hiển thị thêm (hướng tới nhân viên kỹ thuật nắm việc)

| Màn hình | Nên thêm | Lý do |
|----------|----------|-------|
| Hệ thống máy | **Chức năng** (`chucNang`), Mã thiết bị, Nhiệm vụ, File | Giúp kỹ thuật viên hiểu công dụng máy ngay trên bảng |
| Yêu cầu sửa chữa | **Nội dung lỗi** từ `items`, chip liên kết `faultRecordId` | Thấy ngay lỗi cụ thể, không cần mở chi tiết |
| Bản ghi lỗi | **Mô tả** (`moTa`), File đính kèm | Nắm nhanh bản chất lỗi |
| Linh kiện | **Giá nhập**, Ngày mua | Quản lý giá trị tồn kho trực tiếp trên bảng |
| Dự án | **Tiến độ %** (`tienDoTongThe`) ở bảng master | Đánh giá nhanh mức độ hoàn thành |

### 6.4. Lỗi đã biết
- Filter nhật ký trạng thái máy: tên tham số ngày chưa đồng nhất giữa frontend/backend (`dateFrom`/`dateTo`).
- Search yêu cầu sửa chữa không quét vào `items`.
- `ProjectUpdates.tsx` chưa được mount (orphan component).

---

## 7. Tham chiếu nhanh các model Prisma (`business_machines.prisma`)

| Nhóm | Model |
|------|-------|
| Máy móc | `MachineSystem`, `MachineSystemDetail`, `MachineStatusLog` |
| Lỗi | `FaultRecord`, `FaultTemplate`, `RepairStep`, `FaultRecordStatusLog` |
| Sửa chữa | `RepairRequest`, `RepairRequestItem`, `RepairRequestStatusLog`, `AcceptanceHandover`, `AcceptanceHandoverItem` |
| Bảo dưỡng | `MaintenancePlan`, `MaintenancePlanItem`, `MaintenancePlanItemLog`, `MaintenanceRecord`, `MaintenanceTemplate` |
| Linh kiện | `SparePart` |
| Dự án | `Project`, `ProjectPhase`, `ProjectTask`, `ProjectTaskGroup`, `ProjectMember`, `ProjectUpdate`, `ProjectCost`, `ProjectApproval` |

Tất cả thuộc schema `business`, ID dùng CUID (riêng `RepairRequest` dùng ID số nguyên).
