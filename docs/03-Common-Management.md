# Trang Chung (Common) — `/common`

## 1. Tổng quan

- **Route:** `/common` — `ProtectedModuleRoute(module="common")` trong `App.tsx`, lazy-load `pages/CommonManagement.tsx`.
- **Quyền truy cập:** Tất cả nhân viên đã xác thực đều thấy trang. Trang không gate card theo role — mọi card đều render; backend `requireRule` mới là nguồn thật khi thao tác. Riêng tạo kế hoạch tăng ca bị chặn thêm ở UI khi người dùng không thuộc phòng ban nào (`noDepartment`: không có `department`/`departmentCode`/`departmentName`/`secondaryDepartments`).
- **Kiến trúc trang:** `CommonManagement.tsx` **không có `<table>` nào**. Trang chỉ render 4 nhóm card (10 card) và mở modal con khi click. Toàn bộ bảng nằm trong các modal con; chi tiết lại mở thêm một cấp modal/preview nữa. Header dùng `PageHeader` với icon `ClipboardList`, hiển thị tên người đăng nhập.

| Nhóm | Số card | Modal mở từ Chung | Dạng hiển thị |
|------|---------|-------------------|----------------|
| 1. Đã ban hành | 2 | `ProcessListModal` (1), toast "đang bảo trì" (1) | Bảng 8 cột + detail + preview file |
| 2. Tạo yêu cầu | 4 | `RepairRequestFormModal`, `SupplyRequestModal`, `ModalForm` fallback, `OvertimePlanListModal` | 2 form tạo + 1 bảng OT 5 cột (+ sub-bảng 6 cột) |
| 3. Nhiệm vụ và kế hoạch | 2 | `CreateTaskModal`, `CreateWorkPlanModal` | 2 form tạo (bảng danh sách nằm ở Dashboard, không mở từ Chung) |
| 4. Góp ý riêng | 2 | `PrivateFeedbackModal` x2 (`GOP_Y` / `NEU_KHO_KHAN`) | 2 form tạo (danh sách card nằm ở Dashboard) |

> Phân biệt quan trọng: Chung mở **form tạo** cho Task/WorkPlan/Feedback; còn **danh sách/chi tiết** (`TaskListModal` 10 cột, `WorkPlanListModal` 10 cột, `FeedbackListModal` card list, `DailyWorkReportListModal` card list) được mở từ `Dashboard1`/`EmployeeDashboard` hoặc từ deep-link thông báo (`highlightPlanId`/`initialItemId`).

---

## 2. Chi tiết từng nhóm

### 2.1. Nhóm "Đã ban hành"

#### Card "Danh sách quy trình" (`ds_gop_y`) → `ProcessListModal` (maxWidth `6xl`)

- **Model Prisma:** `Process` + `ProcessFlowchart` / `ProcessFlowchartSection` / `ProcessFlowchartSectionFile` / `ProcessFlowchartCost` (schema `common`). Các field chính: `maQuyTrinh` (unique), `msnv`, `tenNhanVien`, `tenQuyTrinh`, `loaiQuyTrinh`, `hienThiTrongChung` (boolean), `files: String[]`, `createdAt`, `updatedAt`.
- **API:** `processService.getAllProcesses(page, 10, search, true)` — filter `hienThiTrongChung=true`, limit cứng 10, search theo mã/tên quy trình/nhân viên. `getProcessById(id)` cho detail.
- **Bảng chính (8 cột):**

| STT | Mã quy trình | Tên quy trình | Loại quy trình | Người tạo | Ngày tạo | Files | Hành động |
|-----|--------------|---------------|----------------|-----------|----------|-------|-----------|
| `(page-1)*10+index+1` | `maQuyTrinh` (màu xanh) | `tenQuyTrinh` | `loaiQuyTrinh` | `tenNhanVien` | `createdAt` định dạng `vi-VN` | Badge số `1..n` (icon FileText) | Nút **Xem** |

- **Pagination:** footer `Trang X / Y` + nút `<` `>` — **không hiển thị tổng số bản ghi**. Search bar phía trên (placeholder "Tìm kiếm theo mã, tên quy trình, nhân viên..."), submit bằng nút hoặc Enter, reset về trang 1 khi tìm.
- **Detail sub-modal** (mở khi bấm Xem, fetch lại theo id): mã quy trình, loại, tên, người tạo kèm MSNV, ngày tạo đầy đủ, danh sách file (giải mã tên file + nút Xem/In), và `flowchart.sections` (mỗi phân đoạn: `phanDoan`/`tenPhanDoan`/`noiDungCongViec`, files biểu mẫu xem/in được, bảng chi phí động — chỉ hiện cột nào có dữ liệu: loại chi phí, tên chi phí, đơn vị, định mức lao động).
- **Preview file modal** (lớp thứ ba): iframe cho PDF (`#toolbar=0`), `<img>` cho ảnh (chặn chuột phải), fallback icon cho loại khác; có nút In mở `window.print()`.
- **Thiếu / đề xuất:** Bảng chính thiếu `msnv` (chỉ có ở detail), thiếu cờ `hienThiTrongChung`, thiếu `updatedAt`. Cột Files chỉ hiện số thứ tự — đề xuất tooltip tên file + badge màu theo loại file. Pagination nên hiện "Hiển thị A–B / tổng" cho đồng bộ với các modal khác. Thêm filter theo `loaiQuyTrinh`.

#### Card "Danh sách các cuộc họp" (`ds_cuoc_hop`)

Chỉ hiện `toast.error('Chức năng đang bảo trì, vui lòng quay lại sau!')` — chưa có modal/backend.

---

### 2.2. Nhóm "Tạo yêu cầu"

#### Card "Tạo phiếu yêu cầu sửa chữa kiểm tra" (`yeu_cau_sua_chua`) → `RepairRequestFormModal`

- **Model Prisma:** `RepairRequest` (PK `Int` autoincrement, `maYeuCau` unique, `mucDoUuTien`, `trangThai` enum `CHO_XU_LY`/`DANG_SUA_CHUA`/`HOAN_THANH`/`DA_HUY`, `ghiChu`, `fileDinhKem`, `createdById`/`createdByName`) + bảng con `RepairRequestItem` (mỗi dòng: `tenHeThong`, `tinhTrangThietBi`, `loaiLoi`, `noiDungLoi`, link tùy chọn tới `MachineSystem`/`MachineSystemDetail`/`FaultRecord`).
- **Form:** `mode="create"`, `hideCodeField`. Các trường: Ngày (tự động), Mã yêu cầu (tự động, ẩn khi tạo), Ưu tiên (bắt buộc); mỗi dòng thiết bị gồm: Hệ thống*, Chi tiết máy (tùy chọn), Tên thiết bị*, Vị trí/khu vực*, Loại lỗi*, Nội dung lỗi*, Lỗi liên quan (tùy chọn — chọn từ `FaultRecord`, có thể bỏ liên kết), Ghi chú chung. Có nút **Thêm** để thêm nhiều dòng thiết bị. File đính kèm qua `FileDropZone`.

#### Card "Tạo yêu cầu cung cấp" (`yeu_cau_bo_sung`) → `SupplyRequestModal`

- **Form:** Tên nhân viên + Bộ phận (readonly, tự điền từ phiên đăng nhập); bảng dòng vật tư với ô search ("Tìm theo mã, tên hoặc loại hàng hóa, hoặc nhập tên mới..."), Số lượng, Đơn giá; Mục đích yêu cầu* (textarea), Mức độ ưu tiên* (select), Ghi chú. Gửi `FormData` kèm file.

#### Card "Đề nghị điều chỉnh, bổ sung quy trình" (`de_nghi_dieu_chinh`)

Chỉ hiện toast "đang bảo trì". Form `ModalForm` fallback (Tiêu đề*, Mô tả*, Ưu tiên*, Phòng ban readonly, FileDropZone) tồn tại trong code nhưng không được card nào kích hoạt hiện tại.

#### Card "Danh sách kế hoạch tăng ca" (`ke_hoach_tang_ca`) → `OvertimePlanListModal` (maxWidth `5xl`)

- **Model Prisma:** `OvertimePlan` (`ngayTao`, `nguoiTaoId`, `noiDung`, `ghiChu`, `files: String[]`, `mucDoUuTien` dùng chung enum `TaskPriority`, `trangThai` enum `CHO_DUYET`/`DA_DUYET`/`TU_CHOI`/`HOAN_THANH`/`HUY`, `nguoiDuyetId`, `ngayDuyet`, `lyDoTuChoi`) + bảng con `OvertimePlanItem` (`ngayTangCa`, `gioBatDau`/`gioKetThuc` dạng `HH:mm`, `workShiftId`/`workShiftName` snapshot lúc tạo, `nguoiThamGiaIds: String[]`, `ghiChuItem`, `trangThaiTiepNhan` JsonB map userId→trạng thái, `gioThucTe` JsonB map userId→{gioVao, gioRa}). `Attendance.overtimePlanId` là `SetNull` — xóa plan không mất dữ liệu chấm công.
- **Phân quyền UI:** `isAdmin = can('overtime-plans','APPROVE')`; `canViewAll = can('overtime-plans','READ')` (fallback legacy: ADMIN/DEPARTMENT_HEAD/phòng general/quality); `canCreate = !noDepartment && isManagerOrAdmin`. Người không phòng ban bị ẩn toàn bộ nút tạo/duyệt/xóa dù prop có true.
- **Dữ liệu:** admin/canViewAll gọi `useOvertimePlans` (`GET /overtime-plans`), còn lại `useMyOvertimePlans` (`GET /overtime-plans/my-plans`). Limit 10/trang, title thêm hậu tố "(Quản lý)" khi có quyền quản lý.
- **Bảng chính (5 cột):**

| Ngày tăng ca | Người tạo | Nội dung | Trạng thái | Hành động |
|--------------|-----------|----------|------------|-----------|
| Dải ngày tính từ items: "1 ngày DD/MM" hoặc "N ngày (DD/MM – DD/MM)" sort ASC, kèm badge `mucDoUuTien` | Họ tên + MSNV + phòng ban | `noiDung` `line-clamp-2` + số người tham gia (unique) + số file | Badge màu theo trạng thái (Chờ duyệt vàng / Đã duyệt xanh / Từ chối đỏ / Hoàn thành xanh lá / Hủy xám) | Duyệt ✓ / Từ chối ✕ (chỉ admin + trạng thái Chờ duyệt), Xóa (admin, mọi trạng thái) |

- Click cả dòng mở detail; dòng được highlight ring xanh khi mở từ thông báo (`highlightPlanId`). Pagination đầy đủ: "Hiển thị A–B / tổng" + Trước/Sau + số trang với dấu `...`.
- **Detail sub-modal (sub-bảng 6 cột):** header Người tạo + Trạng thái, Nội dung/Ghi chú full text, bảng "Chi tiết ngày tăng ca (N dòng)" sort theo `ngayTangCa` ASC:

| Ngày | Ca | Nhân sự | Giờ bắt đầu | Giờ kết thúc | Tổng giờ |
|------|----|---------|-------------|--------------|----------|
| `vi-VN` | `workShiftName` hoặc "—" | Danh sách "Họ tên (MSNV)" | `HH:mm` | `HH:mm` | Tính `(kết thúc − bắt đầu)`, định dạng `x.xh` |

  Kèm danh sách `FileCard` (icon theo loại: image có thumbnail 80px, spreadsheet, doc, text), nút **Chỉnh sửa** ở footer khi `isEditableStatus` (chỉ `CHO_DUYET`/`DA_DUYET` — trạng thái cuối bị khóa vì sẽ ghi đè lương đã chốt). Modal phụ: nhập lý do từ chối (bắt buộc, có cảnh báo đỏ), xác nhận xóa, `CreateOvertimePlanModal` dùng chung cho tạo và sửa.
- **Thiếu / đề xuất:** Bảng chính thiếu tổng giờ OT (chỉ tính được khi mở detail), thiếu ngày tăng ca dạng cột riêng, thiếu `lyDoTuChoi` và người duyệt khi plan bị từ chối. Cột Nội dung bị `line-clamp-2` khó đọc — đề xuất tooltip full text. Nên thêm filter trạng thái/ưu tiên/khoảng ngày và search nội dung.

---

### 2.3. Nhóm "Tạo nhiệm vụ và kế hoạch công việc"

Chung mở **form tạo** trực tiếp. **Bảng danh sách** của Task/WorkPlan không nằm trong Chung mà mở từ Dashboard hoặc deep-link thông báo.

#### Card "Tạo nhiệm vụ" (`nhiem_vu`) → `CreateTaskModal`

- **Model Prisma:** `Task` (`ngayGiao`, `nguoiGiaoId`, `nguoiNhanIds: String[]`, `noiDung`, `thoiHanHoanThanh`, `ghiChu`, `files: String[]`, `mucDoUuTien` enum `KHAN_CAP`/`CAO`/`TRUNG_BINH`/`THAP`, `trangThaiTiepNhan: Json` map userId → `CHUA_TIEP_NHAN`/`DA_TIEP_NHAN`/`TU_CHOI`, `diemDanhGia: Int?` 0–100, `noiDungDanhGia`).
- **Form tạo:** chọn Phòng ban để lọc → tick chọn 1..n người nhận (dùng `useAllEmployeesForAssignment`), Nội dung*, Thời hạn hoàn thành* (`DatePicker`), Mức độ ưu tiên (mặc định Trung bình), Ghi chú, `FileUpload` multiple. Validate client: tối thiểu 1 người nhận, nội dung và thời hạn không trống. Gửi `FormData` (`nguoiNhan[]`, `files`).

#### Bảng danh sách nhiệm vụ — `TaskListModal` (mở từ Dashboard, 10 cột)

- **API:** `getAllTasks` (isAdmin) hoặc `getMyTasks`, limit 10/trang, pagination lấy từ `pagination.total`/`totalPages`.

| STT | Nội dung | Người giao | Người nhận | Ngày giao | Hạn hoàn thành | Ưu tiên | Trạng thái | Đánh giá | Hành động |
|-----|----------|------------|------------|-----------|----------------|---------|------------|----------|-----------|
| `(page-1)*10+i+1` | `line-clamp-2` + title | Họ tên hoặc N/A | "N người" + danh sách truncate | `vi-VN` | `vi-VN` | Badge ưu tiên | Admin: tổng hợp `n/total đã tiếp nhận`; nhân viên: trạng thái của chính mình | `điểm/100` hoặc "Chưa đánh giá" | Tiếp nhận ✓ / Từ chối ✕ (chỉ người nhận chưa xử lý) |

- Click dòng mở detail view: Nội dung full, Người giao/Ngày giao/Hạn, badge ưu tiên, danh sách người nhận kèm badge trạng thái từng người, Ghi chú, file đính kèm (link mở tab mới), nút Tiếp nhận/Từ chối, khối Đánh giá — người giao được chấm/sửa điểm 0–100 + nội dung đánh giá.
- **Thiếu / đề xuất:** Bảng chính thiếu `ghiChu` và file (chỉ thấy trong detail), **không có ô search** — đề xuất thêm search theo nội dung/người giao như WorkPlanListModal. Nên thêm cảnh báo quá hạn (so `thoiHanHoanThanh` với hôm nay).

#### Card "Tạo kế hoạch công việc" (`ke_hoach`) → `CreateWorkPlanModal`

- **Model Prisma:** `WorkPlan` (`tieuDe`, `noiDung` Text, `nguoiTaoId`, `nguoiThucHienIds: String[]` — lưu ý là **employee ID** chứ không phải user ID, `ngayBatDau`/`ngayKetThuc`, `mucDoUuTien` dùng chung `TaskPriority`, `trangThai` enum `CHUA_BAT_DAU`/`DANG_THUC_HIEN`/`HOAN_THANH`/`HUY`, `ghiChu` Text, `files: String[]`).
- **Form tạo/sửa** (dùng chung, phân biệt bằng `initialData`): Tiêu đề*, Nội dung*, Ngày bắt đầu*/Ngày kết thúc* (`DatePicker`), Mức độ ưu tiên, Trạng thái (chỉ khi sửa), Ghi chú, chọn Người thực hiện qua `EmployeeSelectionModal` (hiện chip tên), file cũ `keepFiles` + file mới. Mặc định tự chọn chính người tạo làm người thực hiện. Validate đủ: tiêu đề, ≥1 người thực hiện, nội dung, 2 ngày.

#### Bảng danh sách kế hoạch — `WorkPlanListModal` (mở từ Dashboard, 10 cột)

- Có **search debounce 300ms** (theo tiêu đề hoặc nội dung), limit 10/trang.

| STT | Tiêu đề | Người tạo | Người thực hiện | Ngày bắt đầu | Ngày kết thúc | Ưu tiên | Trạng thái | File | Thao tác |
|-----|---------|-----------|-----------------|--------------|---------------|---------|------------|------|----------|
| `(page-1)*10+i+1` | `line-clamp-2` | Họ tên | "N người" + danh sách truncate | `vi-VN` | `vi-VN` | Badge | Badge 4 trạng thái | Link file từng cái (truncate 80px) | Đổi trạng thái (assignee) / Xóa |

- **Quyền trên dòng:** sửa = admin hoặc người tạo; xóa = admin hoặc (người tạo + trạng thái Chưa bắt đầu); đổi trạng thái = người thực hiện không phải admin/người tạo. Detail modal hiện đầy đủ tiêu đề, nội dung, ghi chú (khung vàng), người tạo/người thực hiện (chip tím), ngày, badge, file download, thời gian tạo/cập nhật, nút Chỉnh sửa nếu được phép.
- **Thiếu / đề xuất:** Bảng chính thiếu `noiDung`/`ghiChu` (chỉ trong detail) — đề xuất tooltip hoặc cột tóm tắt. Nên thêm filter theo trạng thái/ưu tiên và cột cảnh báo quá hạn kết thúc.

---

### 2.4. Nhóm "Góp ý riêng"

#### Card "Góp ý riêng" / "Nêu khó khăn" → `PrivateFeedbackModal` (2 biến thể theo `FeedbackType`)

- **Model Prisma:** `PrivateFeedback` (`code` unique tự động `GY-xxx`/`KK-xxx`, `type` enum `GOP_Y`/`NEU_KHO_KHAN`, `userId` FK `auth.User`, `date`, `content` Text, `notes` Text?, `purpose` Text? chỉ cho GOP_Y, `solution` Text? chỉ cho NEU_KHO_KHAN, `attachments: String[]`, `status` enum `PENDING`/`IN_PROGRESS`/`RESOLVED`/`REJECTED`, `response`/`respondedBy`/`respondedAt` cho phản hồi quản lý).
- **Form:** Ngày tháng (tự động, disabled), Nội dung góp ý/khó khăn* (4 dòng), Mục đích góp ý* (chỉ GOP_Y) hoặc Giải pháp đề xuất* (chỉ NEU_KHO_KHAN), Ghi chú (tùy chọn), File kèm theo (tối đa 5 file, 100MB/file, chấp nhận jpg/jpeg/png/gif/pdf/doc/docx/xls/xlsx/txt). Gửi `FormData` kèm `Authorization: Bearer <accessToken>` tới `POST /private-feedbacks`. Validate client-side với thông báo lỗi tiếng Việt dưới từng trường.

#### Danh sách Góp ý & Khó khăn — `FeedbackListModal` (mở từ Dashboard)

- **Dạng hiển thị: card list, không phải bảng.** Gọi `getAll({ page: 1, limit: 100, type })` — **không có phân trang**, quá 100 bản ghi sẽ không thấy. Có 3 tab: Tất cả / Góp ý / Khó khăn.
- Mỗi card: badge loại (Góp ý hồng / Khó khăn cam) + badge trạng thái (Chờ xử lý vàng / Đang xử lý xanh / Đã giải quyết xanh lá / Từ chối đỏ), mã `code`, họ tên người gửi, nội dung `line-clamp-2`, dòng Mục đích/Giải pháp nếu có, ngày tạo, nút Chi tiết.
- Detail modal: mã, loại, trạng thái, người gửi, nội dung, mục đích/giải pháp, ghi chú, khối Phản hồi từ quản lý (nền xanh, kèm thời gian phản hồi), ngày tạo.
- **Đề xuất:** thêm phân trang hoặc infinite scroll (làm theo cursor pattern của `AllNotificationsModal`), sort theo ngày/trạng thái, search theo nội dung/mã.

#### Báo cáo công việc hàng ngày — `DailyWorkReportListModal` (mở từ Dashboard)

- **Model Prisma:** `DailyWorkReport` (`employeeId`, `reportDate`, `workDescription` Text, `achievements`/`challenges`/`planForNextDay` Text?, `workHours`, `status` enum `DRAFT`/`SUBMITTED`/`REVIEWED`/`APPROVED`/`REJECTED`, `supervisorComment`/`supervisorId`/`reviewedAt`, `attachments` lưu JSON string).
- **Dạng hiển thị: card list, limit 5/trang, có phân trang** "Trang X / Y" + Trước/Sau. Admin có filter pill Tất cả / Chưa xem / Đã xem; admin mở báo cáo `SUBMITTED` sẽ tự động chuyển `REVIEWED`. Card hiện: ngày dạng đầy đủ (Thứ, ngày tháng năm), badge trạng thái, nhân viên + chức danh (admin), số giờ làm việc, mô tả `line-clamp-2`, nhận xét quản lý nếu có. Nút "Tạo báo cáo mới" chỉ cho non-admin. Limit 5 là hợp lý cho dạng card — giữ nguyên.

---

## 3. Hướng dẫn sử dụng step-by-step

### 3.1. Xem quy trình đã ban hành
1. Vào `/common` → nhóm **Đã ban hành** → bấm **Danh sách quy trình**.
2. Nhập từ khóa (mã/tên quy trình/tên nhân viên) → bấm **Tìm kiếm** hoặc Enter. Lật trang bằng nút `<` `>`.
3. Bấm **Xem** ở dòng cần xem → modal chi tiết hiện thông tin + sơ đồ quy trình + bảng chi phí từng phân đoạn.
4. Bấm badge số ở cột Files (hoặc link file trong detail) để preview PDF/ảnh; bấm **In** để in file. Đóng lần lượt: preview → chi tiết → danh sách.

### 3.2. Tạo phiếu yêu cầu sửa chữa kiểm tra
1. Nhóm **Tạo yêu cầu** → **Tạo phiếu yêu cầu sửa chữa kiểm tra**.
2. Chọn **Ưu tiên**. Với mỗi thiết bị: chọn **Hệ thống** → (tùy chọn) **Chi tiết máy** → điền **Tên thiết bị**, **Vị trí/khu vực**, **Loại lỗi**, **Nội dung lỗi**; có thể gắn **Lỗi liên quan** từ danh sách lỗi cũ.
3. Bấm **Thêm** nếu cần báo nhiều thiết bị trong một phiếu; điền **Ghi chú** chung và đính kèm file nếu có.
4. Bấm nút tạo → toast thành công, modal tự đóng. Theo dõi tiến độ ở trang bộ phận Kỹ thuật.

### 3.3. Tạo yêu cầu cung cấp
1. **Tạo yêu cầu cung cấp** → modal mở với tên nhân viên và bộ phận tự điền.
2. Thêm từng dòng vật tư: gõ vào ô search để tìm hàng hóa có sẵn hoặc nhập tên mới → nhập **Số lượng**, **Đơn giá**.
3. Điền **Mục đích yêu cầu** (bắt buộc), chọn **Mức độ ưu tiên**, thêm **Ghi chú** nếu cần.
4. Bấm **Gửi yêu cầu** → phiếu chuyển sang bộ phận Thu mua xử lý.

### 3.4. Xem và quản lý kế hoạch tăng ca
1. **Danh sách kế hoạch tăng ca** → bảng 5 cột. Quản lý thấy kế hoạch toàn quyền; nhân viên thường chỉ thấy kế hoạch của mình.
2. Bấm **Tạo kế hoạch** (chỉ hiện khi có quyền + thuộc phòng ban): thêm các dòng ngày tăng ca (Ngày, Giờ bắt đầu/kết thúc, Ca, Người tham gia, Ghi chú), điền **Nội dung công việc**, chọn ưu tiên, đính kèm file → **Tạo**.
3. Click một dòng để xem detail: bảng 6 cột từng ngày tăng ca, file đính kèm, nút **Chỉnh sửa** (chỉ khi Chờ duyệt/Đã duyệt).
4. Người duyệt: bấm ✓ để duyệt hoặc ✕ để từ chối (bắt buộc nhập lý do) ngay trên dòng; bấm thùng rác để xóa. Người được phân công tiếp nhận từng ngày qua thông báo.

### 3.5. Tạo nhiệm vụ
1. **Tạo nhiệm vụ** → chọn **Phòng ban** để lọc danh sách → tick chọn người nhận (được nhiều người).
2. Nhập **Nội dung**, chọn **Thời hạn hoàn thành**, **Mức độ ưu tiên**, Ghi chú, đính kèm file.
3. Bấm **Tạo nhiệm vụ** → người nhận được thông báo. Người nhận mở **Danh sách nhiệm vụ** (Dashboard) để **Tiếp nhận** hoặc **Từ chối**.
4. Sau khi hoàn thành, người giao mở detail nhiệm vụ để chấm **Đánh giá** (0–100 điểm + nhận xét) — điểm hiện ở cột Đánh giá của bảng.

### 3.6. Tạo kế hoạch công việc
1. **Tạo kế hoạch công việc** → nhập **Tiêu đề**, **Nội dung**, chọn **Ngày bắt đầu**/**Ngày kết thúc**, **Mức độ ưu tiên**.
2. Bấm chọn **Người thực hiện** (mặc định có sẵn chính bạn) → đính kèm file.
3. Bấm **Tạo kế hoạch**. Người thực hiện cập nhật tiến độ bằng nút **Đổi trạng thái** trong Danh sách kế hoạch (Chưa bắt đầu → Đang thực hiện → Hoàn thành). Người tạo hoặc admin sửa/xóa được (xóa chỉ khi Chưa bắt đầu).

### 3.7. Gửi góp ý / Nêu khó khăn
1. Bấm **Góp ý riêng** (hoặc **Nêu khó khăn**) → modal tương ứng mở với ngày hiện tại tự điền.
2. Nhập **Nội dung** (bắt buộc), nhập **Mục đích góp ý** (bắt buộc với góp ý) hoặc **Giải pháp đề xuất** (bắt buộc với khó khăn), Ghi chú tùy chọn.
3. Đính kèm tối đa 5 file → bấm **Gửi**. Mã phản hồi `GY-xxx`/`KK-xxx` được tạo tự động.
4. Khi quản lý phản hồi, nội dung phản hồi hiện trong detail của **Danh sách Góp ý & Khó khăn** (mở từ Dashboard/thông báo).

---

## 4. Lưu ý

- **Không có bảng inline trong trang Chung:** mọi bảng nằm trong modal con. Đóng modal là mất vị trí trang/từ khóa tìm — nếu cần chia sẻ link sâu, đề xuất thêm query param (vd `?modal=process&page=2`).
- **Phân trang không đồng nhất giữa các modal:**
  - `ProcessListModal`: "Trang X/Y", không tổng số.
  - `OvertimePlanListModal`, `TaskListModal`, `WorkPlanListModal`: "Hiển thị A–B / tổng" đầy đủ.
  - `FeedbackListModal`: limit 100, không pager — nguy cơ mất dữ liệu khi vượt 100.
  - `DailyWorkReportListModal`: limit 5, có pager (phù hợp card list).
- **Role và phòng ban:** ADMIN bypass mọi gate; người không phòng ban bị ẩn nút tạo/duyệt/xóa kế hoạch tăng ca; `canViewAll`/`isAdmin` quyết định endpoint `/overtime-plans` hay `/overtime-plans/my-plans` (Task, WorkPlan cũng phân nhánh `getAll` vs `getMy*` tương tự). Lỗi 403 từ backend là nguồn thật cuối cùng — UI chỉ ẩn nút chứ không thay thế kiểm tra server.
- **File đính kèm:** các form dùng `FileDropZone`/`FileUpload`/`FileCard` + `getFileUrl`. PrivateFeedback giới hạn 5 file/100MB; các form khác chưa giới hạn cứng trên UI — đề xuất thống nhất giới hạn và hiện tiến trình upload. Preview chỉ hỗ trợ PDF và ảnh; loại file khác hiện icon, mở tab mới để tải.
- **Trạng thái không sửa trực tiếp:** Task đổi trạng thái tiếp nhận qua `PATCH /tasks/:id/accept`, đánh giá qua `/evaluate`; OvertimePlan duyệt qua `/approve`, tiếp nhận qua `/accept`, giờ thực tế qua `/actual-time`. Không có endpoint PATCH status chung (đúng nguyên tắc forward-only của hệ thống).
- **Deep-link từ thông báo:** `OvertimePlanDetailModal` (read-only, fetch thẳng theo `planId` — dùng cho luồng click thông báo để DEPARTMENT_HEAD xem được plan broadcast của phòng dù không có trong list "my plans"); `TaskListModal`/`WorkPlanListModal`/`FeedbackListModal`/`DailyWorkReportListModal` nhận `initialItemId` để tự mở detail tương ứng.
- **Hai card đang bảo trì:** "Danh sách các cuộc họp" và "Đề nghị điều chỉnh, bổ sung quy trình" đều chỉ báo toast — chưa có backend; tránh viết tài liệu hướng dẫn hai card này như tính năng hoạt động.

---

**Tài liệu liên quan:** `docs/roles-and-department-functions.md` (ma trận quyền theo bộ phận), `docs/01-Dashboard-Admin.md` và `docs/02-Dashboard-Employee.md` (nơi đặt các bảng danh sách Task/WorkPlan/Feedback/DailyReport).
