# Hướng dẫn sử dụng - Bộ phận Chất lượng

## 1. Tổng quan

Bộ phận Chất lượng quản lý nhân sự, quy trình, kiểm tra nội bộ và đánh giá chất lượng thành phẩm. Đây là bộ phận có nhiều bảng nhất trong hệ thống (12 tab nhân sự + 4 tab quy trình).

**Đường dẫn chính:** `/quality`

**Quyền truy cập:** Nhân viên bộ phận Chất lượng, Admin. Một số tab con bị giới hạn theo vai trò (xem bảng phân quyền bên dưới).

### 1.1. Cấu trúc đường dẫn

| Đường dẫn | Trang | Nội dung |
|-----------|-------|----------|
| `/quality` | `QualityManagement` | Tổng quan bộ phận: KPI + biểu đồ |
| `/quality/personnel` | `QualityPersonnel` | Phòng Chất lượng Nhân sự — 12 tabs |
| `/quality/process` | `QualityProcess` | Phòng Chất lượng Quy trình — 4 tabs |
| `/quality/process-types` | `ProcessTypeSettings` | Cài đặt loại quy trình (danh mục dùng chung) |
| `/quality/office` | `QualityOffice` | Chất lượng khối văn phòng — *đang phát triển* |
| `/quality/production` | `QualityProduction` | Chất lượng khối sản xuất — *đang phát triển* |
| `/quality/process-list` | `ProcessList` | **Prototype chết** — dữ liệu cứng, không nối DB |

> **Lưu ý:** `/quality/process-list` (trang `ProcessList`) là bản nháp cũ với 3 dòng dữ liệu viết cứng trong code, không đọc/ghi database. Chức năng thật nằm ở tab **Danh sách quy trình** bên trong `/quality/process`.

---

## 2. Tổng quan Bộ phận Chất lượng (`/quality`)

Trang tổng quan hiển thị 4 thẻ KPI và 4 biểu đồ (2 tròn, 2 đường).

### 2.1. Thẻ KPI

| Thẻ | Nguồn dữ liệu | Nhấn vào chuyển đến |
|-----|---------------|---------------------|
| Nhân viên | `employeeService` — tổng + đang làm việc | `/quality/personnel` |
| Quy trình | `processService` — tổng quy trình | `/quality/process` |
| Đánh giá chất lượng | `qualityEvaluationService` — tổng đánh giá | `/quality/production` |
| Kiểm tra nội bộ | `internalInspectionService` — tổng kiểm tra | `/quality/office` |

> **Lưu ý quyền trên trang tổng quan:** thẻ **Nhân viên** yêu cầu quyền `ADMIN / DEPARTMENT_HEAD / TEAM_LEAD` (vai trò `EMPLOYEE` nhận 0). Thẻ **Kiểm tra nội bộ** yêu cầu `ADMIN / DEPARTMENT_HEAD` (cả `TEAM_LEAD` và `EMPLOYEE` đều nhận 0). Các thẻ Quy trình và Đánh giá chất lượng hiển thị với mọi vai trò.

### 2.2. Biểu đồ

| Biểu đồ | Loại | Nội dung |
|---------|------|----------|
| Tỉ lệ thành phẩm trung bình | Pie | Trung bình 8 tỉ lệ A / B / B dầu / C / Vụn lớn / Vụn nhỏ / Phế phẩm / Ướt từ `QualityEvaluation` |
| Phân bổ kiểm tra nội bộ theo mức độ | Pie | Đếm `InternalInspection` theo `violationLevel` |
| Đánh giá chất lượng theo tháng | Line | Số đánh giá theo 12 tháng của năm hiện tại |
| Kiểm tra nội bộ theo tháng | Line | Số kiểm tra theo 12 tháng của năm hiện tại |

---

## 3. Phòng Chất lượng Nhân sự (`/quality/personnel`) — 12 tabs

Trang gồm 3 thẻ tổng quan trên cùng, sau đó là 12 tab. Tab đang chọn được đồng bộ qua query string `?tab=...`.

**Thẻ tổng quan đầu trang:**

| Thẻ | Số liệu |
|-----|---------|
| Tổng quan nhân viên | Tổng nhân viên; Chính thức / Thử việc / Bán thời gian (theo `contractType`) |
| Tổng quan đánh giá | Lọc theo Tháng/Năm; Đã đánh giá; Vượt KPI / Đạt KPI / Chưa đạt |
| Tổng quan điểm danh | Lọc theo Ngày; Tổng điểm danh; Đã vào / Đã ra / Chưa điểm danh |

### 3.1. Tab Danh sách nhân viên

**Model Prisma:** `Employee` (`employees`, schema `common`)
**Component:** `EmployeeManagement.tsx` — 7 cột
**Pagination:** Client-side, 10 dòng/trang (fetch 100 bản ghi rồi cắt lát)

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã NV | `employeeCode` |
| 2 | Họ tên | Ghép `user.lastName` + `user.firstName` |
| 3 | Email | Từ `user.email` |
| 4 | Vị trí | `position.name` |
| 5 | Bộ phận | Phòng ban của user |
| 6 | Trạng thái | Pill màu theo `status` |
| 7 | Hoạt động | Xem / Sửa / Xóa |

**Bộ lọc:** tìm kiếm (mã NV, họ tên, email), loại hợp đồng, trạng thái, phòng ban. Có xuất Excel.

**Thiếu / nên hiển thị thêm:**
- **`contractType` và `hireDate`** không có trong bảng chính — nhân viên Chất lượng muốn biết loại hợp đồng và ngày vào phải mở từng chi tiết. Nên thêm 2 cột này để nắm nhanh.
- **`positionLevel`** (cấp bậc) cũng không hiển thị — hữu ích khi đối chiếu bậc lương.
- Trạng thái đang gộp 4 enum (`ACTIVE/INACTIVE/ON_LEAVE/TERMINATED`) vào một pill — dễ nhầm "Không hoạt động" với "Đã nghỉ việc". Nên tách màu rõ ràng.
- Chỉ fetch tối đa 100 bản ghi rồi phân trang phía client — **vượt quá 100 nhân viên sẽ thiếu dữ liệu**. Nên chuyển sang phân trang server.

### 3.2. Tab Quản lý vị trí

**Model Prisma:** `Position` (`positions`, schema `common`)
**Component:** `PositionManagement.tsx` — 7 cột (1 checkbox + 6 dữ liệu)
**Pagination:** Client-side, 10 dòng/trang

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | (checkbox) | Chọn nhiều để cập nhật danh mục hàng loạt |
| 2 | Mã vị trí | `code` |
| 3 | Tên vị trí | `name` |
| 4 | Số NV | Số nhân viên đang giữ vị trí |
| 5 | Danh mục | `category`: Sản xuất / Văn phòng / Quản lý |
| 6 | Mô tả | `description` |
| 7 | Hành động | Xem / Sửa / Xóa |

**Tính năng đặc biệt:** cảnh báo vị trí **Chưa chọn danh mục**, lọc theo "Đang dùng / Trống", liên kết chéo sang tab Trách nhiệm và Cấp độ.

### 3.3. Tab Quản lý cấp độ & lương

**Model Prisma:** `PositionLevel` (`position_levels`, schema `common`)
**Component:** `PositionLevelManagement.tsx` — 7 cột
**Pagination:** Không (master-detail, hiển thị toàn bộ cấp độ của vị trí đang chọn)

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Bậc | `level` |
| 2 | Lương cơ bản | `baseSalary` |
| 3 | Lương KPI | `kpiSalary` |
| 4 | Tổng | Cơ bản + KPI |
| 5 | KPI % | Tỉ lệ KPI trên tổng |
| 6 | Chênh bậc trước | Chênh lệch so với bậc liền trước |
| 7 | Hành động | Sửa / Xóa |

**Tính năng đặc biệt:** dải tóm tắt (bậc thấp nhất / cao nhất / chênh lệch / KPI trung bình), 3 mẫu lương dựng sẵn, sao chép cấp độ từ vị trí khác.

### 3.4. Tab Danh sách trách nhiệm

**Model Prisma:** `PositionResponsibility` (`position_responsibilities`, schema `common`)
**Component:** `ResponsibilityManagement.tsx` — 4 cột
**Pagination:** Không (hiển thị toàn bộ)

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Tiêu chí | `title` |
| 2 | Mô tả | `description` |
| 3 | Trọng số | `weight` (%) |
| 4 | Hành động | Sửa / Xóa |

**Tính năng đặc biệt:** thanh tổng trọng số (cảnh báo nếu tổng ≠ 100%) và nút **Chuẩn hóa 100%**.

### 3.5. Tab Đánh giá nhân viên

**Model Prisma:** `Evaluation` + `EvaluationDetail` (`evaluations` / `evaluation_details`, schema `common`)
**Component:** `EmployeeEvaluationManagement.tsx` — **giao diện split-view** (danh sách bên trái + chi tiết bên phải), không phải bảng phẳng.

| # | Cột trong bảng chi tiết | Ghi chú |
|---|-------------------------|---------|
| 1 | STT | Số thứ tự tiêu chí |
| 2 | Trách nhiệm | Tên trách nhiệm được đánh giá |
| 3 | Tỷ trọng (%) | Trọng số tiêu chí |
| 4 | Cá nhân tự đánh giá | `selfScore` |
| 5 | Cấp trên 1 | `supervisorScore1` |
| 6 | Cấp trên 2 | `supervisorScore2` |

**Tính năng đặc biệt:** thống kê mức độ hoàn thành (Tổng số / Chờ tự đánh giá / Chờ cấp trên / Hoàn thành), tab **Calibration** (hiệu chuẩn), chế độ `QUICK` / `FULL`, xuất Excel, tạo đánh giá hàng loạt, tải PDF từng nhân viên.

**Thiếu / nên hiển thị thêm:**
- 8 tỉ lệ (A/B/C... ) **không hiển thị** ở dạng tóm tắt trong đánh giá nhân viên — chỉ có điểm số. Nếu cần đối chiếu tỉ lệ thành phẩm, xem tab Đánh giá chất lượng ở phần Sản xuất.

### 3.6. Tab Bảng tính lương

**Model Prisma:** `Payroll` (`payrolls`, schema `common`)
**Component:** `PayrollManagement.tsx` — 12 cột
**Pagination:** Client-side, 10 dòng/trang

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | STT | Số thứ tự |
| 2 | Mã NV | `employeeCode` |
| 3 | Tên NV | Họ tên nhân viên |
| 4 | Vị trí | Chức vụ |
| 5 | Lương cơ bản | `baseSalary` |
| 6 | Lương KPI | `kpiBonus` |
| 7 | Phụ cấp khác | Tổng `positionAllowance` + `otherAllowances` |
| 8 | Giờ TC kế hoạch | Có nhãn "Đang tính lương" nếu nguồn = PLANNED |
| 9 | Giờ TC thực tế | Có nhãn "Đang tính lương" nếu nguồn = ACTUAL |
| 10 | Tổng khấu trừ | BHXH, BHYT, BHTN, thuế TNCN, trừ KPI, trừ nghỉ |
| 11 | Thực lĩnh | `netSalary` |
| 12 | Hành động | Chi tiết / Sửa |

**Có dòng `tfoot` tổng cộng** (Tổng cộng N nhân viên) ở cuối bảng.

**Thiếu / nên hiển thị thêm:**
- **`projectBonus` (thưởng dự án)** không có cột riêng — đang bị gộp hoặc bỏ sót. Nhân viên Chất lượng cần thấy khoản này tách bạch.
- Cột **Phụ cấp khác** đang gộp phụ cấp chức vụ + phụ cấp khác — nên tách để dễ đối chiếu.
- **Ngày công (`workDays`) và số ngày nghỉ (`leaveDays`)** không hiển thị trong bảng chính — đây là thông tin lương quan trọng. Nên thêm cột Ngày công.
- Badge **"Chờ đánh giá"** (`evaluationPending`) xuất hiện khi chưa có kết quả đánh giá KPI.

### 3.7. Tab Bảng điểm danh nhân viên

**Model Prisma:** `Attendance` (`attendances`, schema `common`)
**Component:** `AttendanceManagement.tsx` — 8 cột (chế độ bảng) + chế độ lịch
**Pagination:** Client-side, 10 dòng/trang

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Nhân viên | Mã + họ tên |
| 2 | Ngày | `attendanceDate` |
| 3 | Giờ vào | `checkInTimes` (mảng, hỗ trợ nhiều lần quẹt) |
| 4 | Giờ ra | `checkOutTimes` |
| 5 | Số giờ | `workHours` |
| 6 | Trạng thái | PRESENT / LATE / ABSENT / ON_LEAVE / OVERTIME |
| 7 | Ghi chú | `notes` |
| 8 | Hành động | Sửa |

**Hai chế độ xem:**
- **Bảng:** danh sách dòng như trên, có lọc theo tháng.
- **Lịch:** dạng lưới ngày × nhân viên, có cột **Tổng** và **Tổng OT (h)**; bấm vào ngày mở modal chi tiết.

**Thiếu / nên hiển thị thêm:**
- **Trường `shift` (Ca)** đã có trong database (`Attendance.shift`) nhưng **chưa hiển thị** ở cả chế độ bảng lẫn lịch. Nhân viên Chất lượng cần biết nhân viên thuộc ca nào khi đối chiếu chấm công. Nên thêm cột Ca.

### 3.8. Tab Chấm công tháng

**Model Prisma:** `TimesheetCell` (`timesheet_cells`) + `MonthlyTimesheetOverride` (`monthly_timesheet_overrides`), schema `common`
**Component:** `MonthlyTimesheetGrid.tsx` — **~60 cột**, dạng lưới bảng tính (spreadsheet)
**Pagination:** Không (hiển thị toàn bộ)

**Cấu trúc cột:** 6 cột thông tin nhân viên + N cột ngày trong tháng + ~25 cột tổng hợp.

**Nhóm cột thông tin nhân viên:**

| # | Cột |
|---|-----|
| 1 | STT |
| 2 | MSNV |
| 3 | Họ và Tên |
| 4 | Chức vụ |
| 5 | Bộ phận |
| 6 | Ngày vào |

**Nhóm cột ngày trong tháng:** mỗi ngày một cột, hiển thị mã chấm công (`TimesheetCell.code`).

**Nhóm cột tổng hợp (rút gọn):** Giờ lương, Làm CT, Số giờ nghỉ, Thử việc, Trễ/Sớm, Ký nhận, Cơm NC, Tăng ca, Số KM, Xăng xe, Cơm TC, Phép TT, Phép HT, Ghi chú, Chuyên cần, Tính cơm, Giờ CC KL, Truy thu ứng phép, Phép bù, Cơm CN, Ngày nghỉ việc.

**Tính năng đặc biệt:** chỉnh sửa ô trực tiếp (chọn mã chấm công + ghi chú), phím tắt điều hướng, dán từ clipboard, nhân bản giá trị (Ctrl+D), import/export Excel.

**Thiếu / nên hiển thị thêm:**
- Mỗi ô ngày chỉ hiện **mã** chấm công, **không hiện `workHours`** (số giờ) của ô đó. Muốn biết số giờ phải mở chi tiết. Có thể cân nhắc hiển thị giờ dạng tooltip.

### 3.9. Tab Ngày lễ

**Model Prisma:** `Holiday` (`holidays`, schema `common`)
**Component:** `HolidayManager.tsx` — 4 cột (3 dữ liệu + 1 hành động)
**Pagination:** Không

| # | Cột |
|---|-----|
| 1 | Tên |
| 2 | Ngày |
| 3 | Ghi chú |
| 4 | (Hành động) — Sửa / Xóa |

Lọc theo năm. Form thêm/sửa dạng inline.

### 3.10. Tab Mã chấm công

**Model Prisma:** `AttendanceCode` (`attendance_codes`, schema `common`)
**Component:** `AttendanceCodeManager.tsx` — 6 cột (5 dữ liệu + 1 hành động)
**Pagination:** Không

| # | Cột |
|---|-----|
| 1 | Mã |
| 2 | Tên |
| 3 | Mô tả |
| 4 | TT (thứ tự) |
| 5 | Trạng thái (Bật/Tắt) |
| 6 | (Hành động) — Sửa / Xóa |

### 3.11. Tab Danh sách đơn nghỉ phép

**Model Prisma:** `LeaveRequest` (`leave_requests`, schema `common`)
**Component:** `LeaveRequestManagement.tsx` — 7 cột
**Pagination:** Client-side, 10 dòng/trang (fetch 1000 bản ghi rồi cắt lát)

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | Mã đơn | `code` |
| 2 | Nhân viên | Họ tên + mã NV |
| 3 | Loại nghỉ | `leaveType`: Nghỉ phép năm / Ốm / Việc riêng / Thai sản / Khẩn cấp / Bù |
| 4 | Thời gian | Từ ngày → đến ngày |
| 5 | Trạng thái | Chờ / Đã duyệt / Từ chối |
| 6 | Ngày tạo | `createdAt` |
| 7 | Thao tác | Duyệt / Từ chối / Xem |

**Thiếu / nên hiển thị thêm:**
- **Số ngày nghỉ** không hiển thị thành cột riêng — phải tự tính từ khoảng thời gian. Nên thêm cột Số ngày.
- **Lý do (`reason`)** không hiển thị trong bảng chính — phải mở chi tiết mới đọc được. Với việc duyệt phép, lý do là thông tin quan trọng nhất. Nên đưa vào bảng (hoặc cột rút gọn).
- Fetch 1000 bản ghi rồi phân trang client — tương tự rủi ro như tab Nhân viên.

### 3.12. Tab Quản lý user

**Model Prisma:** `User` (schema `auth`)
**Component:** `UserManagement.tsx` — 7 cột
**Pagination:** Client-side, 10 dòng/trang
**Quyền:** chỉ `ADMIN` mới thấy tab này

| # | Cột |
|---|-----|
| 1 | Họ tên |
| 2 | Email |
| 3 | Vai trò |
| 4 | Bộ phận |
| 5 | Phòng ban |
| 6 | Trạng thái |
| 7 | Hoạt động |

**Thao tác:** Khóa/Mở khóa, đặt lại mật khẩu, phân quyền, thêm/sửa/xóa.

---

## 4. Phòng Chất lượng Quy trình (`/quality/process`) — 4 tabs + cài đặt

Đầu trang có bộ lọc **Tháng/Năm** áp dụng cho danh sách quy trình. Hai thẻ tổng quan:

| Thẻ | Số liệu |
|-----|---------|
| Tổng quan danh sách quy trình | Tổng số; Sản xuất / Kiểm tra / Đóng gói / Vận chuyển / Khác |
| Tổng quan danh sách sản phẩm | Tổng sản phẩm; NL tươi / NL đông / SP khô / SP đông / Phụ liệu |

### 4.1. Tab Danh sách quy trình

**Model Prisma:** `Process` (`processes`, schema `common`)
**Component:** `ProcessManagement.tsx` — 8-9 cột
**Pagination:** Client-side, 10 dòng/trang

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | STT | Số thứ tự |
| 2 | Mã quy trình | `maQuyTrinh` |
| 3 | MSNV | Mã số nhân viên phụ trách |
| 4 | Tên nhân viên | `tenNhanVien` |
| 5 | Tên quy trình | `tenQuyTrinh` |
| 6 | Loại quy trình | `loaiQuyTrinh` (liên kết `ProcessType`) |
| 7 | Files | Số file đính kèm |
| 8 | Công khai | Hiển thị trong trang Chung (`hienThiTrongChung`) |
| 9 | Hoạt động | Xem / Sửa / Xóa |

Mở rộng dòng cho thấy bảng **phân đoạn** (STT / Phân đoạn / Nội dung công việc / Biểu mẫu / ... / Số lượng nhân công-vật tư). Có nút chuyển sang **Cài đặt loại quy trình** (chỉ ADMIN hoặc Trưởng phòng Chất lượng).

### 4.2. Tab Quy trình sản xuất

**Model Prisma:** `ProductionProcess` (`production_processes`, schema `common`)
**Component:** `ProductionProcessManagement.tsx` — 10 cột
**Pagination:** Client-side, 10 dòng/trang

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | STT | Số thứ tự |
| 2 | Mã QTSX | `maQuyTrinhSanXuat` |
| 3 | Tên quy trình sản xuất | `tenQuyTrinhSanXuat` |
| 4 | Mã NV | `maNVSanXuat` |
| 5 | Mã NV | **⚠️ BUG: header lặp lại "Mã NV" thay vì một cột khác (vd: Tên NV / `tenNVSanXuat`)** |
| 6 | Định mức NVL | Liên kết `MaterialStandard` |
| 7 | Sản phẩm đầu ra | `sanPhamDauRa` |
| 8 | Khối lượng (Kg) | `khoiLuong` |
| 9 | Thời gian (Ngày) | `thoiGian` |
| 10 | Hoạt động | Xem / Sửa / Xóa |

> **Bug đã biết:** cột 4 và cột 5 cùng tiêu đề "Mã NV". Cần sửa cột 5 thành tên nhân viên sản xuất để tránh nhầm lẫn.

### 4.3. Tab Danh sách đơn hàng

**Model Prisma:** `Order` (`orders`, schema `business`)
**Component:** `OrderManagement.tsx` — 9 cột
**Pagination:** Server-side, mặc định 20 dòng/trang

| # | Cột |
|---|-----|
| 1 | STT |
| 2 | Ngày đặt hàng |
| 3 | Mã đơn hàng |
| 4 | Mã báo giá |
| 5 | Khách hàng |
| 6 | Số lượng SP |
| 7 | Trạng thái SX |
| 8 | Trạng thái TT |
| 9 | Hành động |

Mở rộng dòng hiển thị bảng chi tiết đơn hàng: Người thực hiện / Vai trò / Thời gian, và Mã SP / Tên hàng hóa / Loại / Yêu cầu / Đóng gói / Số lượng / Đơn vị.

### 4.4. Tab Kiểm tra nội bộ

**Model Prisma:** `InternalInspection` (`internal_inspections`, schema `common`)
**Component:** `InternalInspectionManagement.tsx` — 9 cột

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | STT | Số thứ tự |
| 2 | Mã kiểm tra | `inspectionCode` |
| 3 | Ngày kiểm tra | `inspectionDate` |
| 4 | Mã vi phạm | `violationCode` |
| 5 | Nội dung vi phạm | `violationContent` |
| 6 | Mức độ | `violationLevel` |
| 7 | Người kiểm tra | `inspectedBy` |
| 8 | Trạng thái | `status` (mặc định PENDING) |
| 9 | Thao tác | Xem / Sửa / Xóa |

**Thiếu / nên hiển thị thêm:**
- **Mã kế hoạch kiểm tra (`inspectionPlanCode`)** có trong DB nhưng **không hiển thị** thành cột. Đây là liên kết quan trọng để truy ngược về kế hoạch kiểm tra gốc. Nên thêm cột Mã kế hoạch.

### 4.5. Cài đặt loại quy trình (`/quality/process-types`)

**Model Prisma:** `ProcessType` (`process_types`, schema `common`)
**Component:** `ProcessTypeSettings.tsx` — 6 cột

| # | Cột | Ghi chú |
|---|-----|---------|
| 1 | STT | Số thứ tự |
| 2 | Tên | `name` (có icon khóa nếu là loại mặc định hệ thống) |
| 3 | Mã | `code` (font mono) |
| 4 | Thứ tự | `thuTu` — sửa inline |
| 5 | Kích hoạt | `kichHoat` — toggle switch |
| 6 | Thao tác | Sửa / Xóa |

**Quy tắc:** Loại có `macDinhHeThong = true` không thể đổi tên hoặc xóa (nút bị vô hiệu hóa). Xóa loại đang được quy trình sử dụng sẽ bị hệ thống từ chối.

**Thiếu / nên hiển thị thêm:**
- **Số quy trình đang dùng mỗi loại** không hiển thị — người dùng không biết loại nào đang được bao nhiêu quy trình tham chiếu trước khi cân nhắc xóa. Nên thêm cột này.

---

## 5. Các bảng chất lượng khác (trong phạm vi Chất lượng)

### 5.1. Đánh giá chất lượng thành phẩm (QualityEvaluation)

**Model Prisma:** `QualityEvaluation` (`quality_evaluations`, schema `business`)
**Component:** `QualityEvaluationManagement.tsx` — 11 cột hiển thị

| # | Cột hiển thị |
|---|--------------|
| 1 | STT |
| 2 | Mã chiên |
| 3 | Thời gian chiên |
| 4 | Mã hàng hóa |
| 5 | Màu sắc |
| 6 | Mùi hương |
| 7 | Vị |
| 8 | Độ ngọt |
| 9 | Độ giòn |
| 10 | Mã NV thực hiện |
| 11 | Hoạt động |

**Thiếu / nên hiển thị thêm:**
- Model có **8 trường tỉ lệ** (`aTiLe`, `bTiLe`, `bDauTiLe`, `cTiLe`, `vunLonTiLe`, `vunNhoTiLe`, `phePhamTiLe`, `uotTiLe`) nhưng **bảng chính không hiển thị tỉ lệ A/B/C% nào**. Nhân viên Chất lượng muốn xem tỉ lệ phải mở chi tiết. Nên hiển thị ít nhất các cột A% / B% / C% để nắm nhanh chất lượng thành phẩm.

### 5.2. Đánh giá nguyên liệu (MaterialEvaluation)

**Model Prisma:** `MaterialEvaluation` (`material_evaluations`, schema `business`)
**Component:** `MaterialEvaluationManagement.tsx` — 16 cột

| # | Cột |
|---|-----|
| 1 | STT |
| 2 | Mã chiên |
| 3 | Ca |
| 4 | Thời gian chiên |
| 5 | Mã hàng hóa |
| 6 | Số lô kiện |
| 7 | KL (Kg/tua) |
| 8 | Số lần ngâm |
| 9 | Nhiệt độ trước ngâm |
| 10 | Nhiệt độ sau vớt |
| 11 | TG ngâm (Phút) |
| 12 | Brix nước ngâm |
| 13 | ĐG trước ngâm |
| 14 | ĐG sau ngâm |
| 15 | Ghi chú |
| 16 | Thao tác |

**Thiếu / nên hiển thị thêm:**
- **Người thực hiện (`nguoiThucHien`)** không hiển thị trong bảng chính. Nên thêm cột Người TH để biết ai thực hiện đánh giá.

### 5.3. Tiêu chí đánh giá nguyên liệu (MaterialCriteria)

**Model Prisma:** `MaterialEvaluationCriteria` (`material_evaluation_criteria`, schema `business`)
**Component:** `MaterialCriteriaManager.tsx` — 4 cột

| # | Cột |
|---|-----|
| 1 | Mã |
| 2 | Nội dung |
| 3 | Trạng thái |
| 4 | Thao tác |

---

## 6. Hướng dẫn sử dụng

### 6.1. Xem tổng quan bộ phận

1. Vào `/quality`
2. Xem 4 thẻ KPI: Nhân viên, Quy trình, Đánh giá chất lượng, Kiểm tra nội bộ
3. Quan sát 2 biểu đồ tròn (tỉ lệ thành phẩm, phân bổ kiểm tra) và 2 biểu đồ đường (xu hướng theo tháng)
4. Nhấn vào từng thẻ KPI để chuyển đến phòng chức năng tương ứng

### 6.2. Quản lý nhân sự (12 tabs)

1. Vào `/quality/personnel`
2. Chọn tab cần làm việc; tab đang chọn lưu trong URL (`?tab=...`)
3. Dùng thanh lọc phía trên mỗi bảng để tìm kiếm/lọc nhanh
4. Với tab có phân trang (Nhân viên, Vị trí, Bảng lương, Nghỉ phép, User), dùng nút chuyển trang ở cuối bảng
5. Với tab dạng lưới (Chấm công tháng), chỉnh sửa trực tiếp trên ô, dùng phím tắt để di chuyển nhanh

### 6.3. Quản lý quy trình (4 tabs)

1. Vào `/quality/process`
2. Chọn Tháng/Năm ở góc phải trên nếu cần lọc quy trình theo kỳ
3. Chọn tab: **Danh sách quy trình** / **Quy trình sản xuất** / **Đơn hàng** / **Kiểm tra nội bộ**
4. Mở rộng một dòng để xem chi tiết phân đoạn / chi phí / sản phẩm
5. (Chỉ ADMIN hoặc Trưởng phòng Chất lượng) Vào **Cài đặt loại quy trình** để quản lý danh mục loại

### 6.4. Duyệt đơn nghỉ phép

1. Vào tab **Danh sách đơn nghỉ phép**
2. Lọc theo trạng thái "Chờ duyệt"
3. Nhấn **Duyệt** hoặc **Từ chối** (bắt buộc nhập lý do khi từ chối)
4. Xem chi tiết đơn (loại nghỉ, khoảng thời gian, file đính kèm) trước khi quyết định

---

## 7. Phân quyền theo vai trò

### 7.1. Quyền xem tab trong Phòng Nhân sự

| Tab | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|-----|-------|-----------------|-----------|----------|
| Danh sách nhân viên | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Quản lý vị trí | ✓ | ✓ | — | — |
| Quản lý cấp độ & lương | ✓ | ✓ | — | — |
| Danh sách trách nhiệm | ✓ | ✓ | — | — |
| Đánh giá nhân viên | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Bảng tính lương | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Bảng điểm danh | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Chấm công tháng | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Ngày lễ | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Mã chấm công | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Đơn nghỉ phép | ✓ | ✓ | ✓ | ✓ (chỉ xem) |
| Quản lý user | ✓ | — | — | — |

> Vai trò `EMPLOYEE` khi xem các tab nhân sự ở **chế độ chỉ đọc** — không có nút Thêm/Sửa/Xóa.

### 7.2. Quyền trong Phòng Quy trình

| Hành động | ADMIN | DEPARTMENT_HEAD (Quality) | Vai trò khác |
|-----------|-------|---------------------------|--------------|
| Xem quy trình, QTSX, đơn hàng, kiểm tra | ✓ | ✓ | ✓ (nếu thuộc bộ phận) |
| Tạo/Sửa/Xóa quy trình | ✓ | ✓ | — |
| Cài đặt loại quy trình | ✓ | ✓ | — |
| Xóa loại quy trình đang được dùng | bị từ chối | bị từ chối | — |

### 7.3. Quyền Kiểm tra nội bộ (chi tiết)

| Hành động | Nhân viên Chất lượng | TEAM_LEAD trở lên | Trưởng phòng |
|-----------|----------------------|-------------------|--------------|
| Tạo / Sửa / Xem | ✓ | ✓ | ✓ |
| Xuất / Import Excel | ✓ | ✓ | ✓ |
| Phê duyệt (APPROVE) | — | ✓ | ✓ |
| Xóa (DELETE) | — | — | ✓ |

---

## 8. Lưu ý

1. **Phân trang phía client:** một số bảng (Nhân viên, Vị trí, Bảng lương, Nghỉ phép, User, Quy trình) fetch một lượng lớn bản ghi rồi tự cắt lát phía client. Khi dữ liệu vượt ngưỡng fetch (100 hoặc 1000), các bản ghi ngoài ngưỡng **sẽ không hiển thị**. Kiểm tra tổng số qua API hoặc cân nhắc chuyển sang phân trang server.
2. **Tab `/quality/process-list` là prototype chết** — dữ liệu viết cứng trong code, không nối DB. Dùng tab **Danh sách quy trình** trong `/quality/process` thay thế.
3. **`/quality/office` và `/quality/production`** đang là trang placeholder ("Chức năng đang được phát triển").
4. **Bug header lặp "Mã NV"** trong tab Quy trình sản xuất (cột 4 và 5).
5. **Mã chấm công** trong Chấm công tháng chỉ hiện mã, không hiện số giờ — cần mở chi tiết để xem `workHours`.
6. **Ngày lễ và Mã chấm công** không có phân trang (hiển thị toàn bộ) — phù hợp vì số lượng ít.
7. **Đánh giá chất lượng** thiếu 8 cột tỉ lệ A/B/C trong bảng chính — mở chi tiết để xem đầy đủ.
8. **Kiểm tra nội bộ** thiếu cột Mã kế hoạch — thông tin này có trong DB, cần bổ sung nếu muốn truy ngược kế hoạch.
9. **Trạng thái nhân viên** gộp 4 enum vào một pill — cẩn thận khi phân biệt "Không hoạt động" và "Đã nghỉ việc".
10. Trên trang tổng quan `/quality`, thẻ **Nhân viên** ẩn số liệu với vai trò `EMPLOYEE`; thẻ **Kiểm tra nội bộ** ẩn số liệu với cả `TEAM_LEAD` và `EMPLOYEE` (API không được gọi do thiếu quyền, hiển thị 0).
