# 02 — Dashboard Nhân viên (Employee)

> **Route:** `/dashboard` — cùng route với Dashboard Admin, nhưng khi người dùng không có quyền ADMIN (`canSeeStats = false`), `Dashboard1.tsx` render `<EmployeeDashboard />` thay vì các thống kê toàn hệ thống.

## 1. Tổng quan

Dashboard Nhân viên là trang cá nhân tự phục vụ (self-service) dành cho vai trò **EMPLOYEE** (và `TEAM_LEAD` chưa thuộc nhóm admin). Trang chỉ hiển thị dữ liệu **của chính người đăng nhập** — nhiệm vụ cá nhân, kế hoạch cá nhân, điểm danh, nghỉ phép, báo cáo hàng ngày và tự đánh giá. Không có thống kê phòng ban khác, không có bảng PurchaseRequest, không có biểu đồ xu hướng.

| Thuộc tính | Giá trị |
|---|---|
| File nguồn | `frontend/src/pages/EmployeeDashboard.tsx` |
| Route | `/dashboard` (cùng route, phân nhánh bên trong `Dashboard1`) |
| Quyền truy cập | Mọi user đã xác thực; ADMIN bị chuyển sang Dashboard Admin |
| Layout | `ThemeHeader` + `CompanyAnnouncementBanner` + hero strip |
| Data layer | `useMyTasksCount`, `useEmployeeAttendanceHistory`, service calls trực tiếp (notification, workPlan, leaveRequest, dailyWorkReport) |

**Khác biệt chính so với Dashboard Admin:**

| Khía cạnh | Dashboard Admin | Dashboard Nhân viên |
|---|---|---|
| Phạm vi dữ liệu | Toàn công ty | Chỉ của bản thân |
| Quick Stats | 6 thẻ KPI (mua hàng, nhiệm vụ, kế hoạch, góp ý, đánh giá, báo cáo) | 3 thẻ cá nhân (Nhiệm vụ, Kế hoạch, Đánh giá) |
| Bảng / modal | PurchaseRequest, 7 phòng ban, PlanCombinedModal | TaskListModal, WorkPlanListModal, AttendanceHistoryModal, LeaveRequestModal, DailyWorkReportListModal, EmployeeSelfEvaluationModal |
| Biểu đồ | LineChart xu hướng đơn hàng/báo giá | Không có |
| Bộ lọc kỳ | Có (tuần/tháng/quý/năm/tùy chọn) | Không có |
| Calendar | Không | Lịch điểm danh mini theo tháng |

---

## 2. Các thành phần chính

### 2.1 Company Announcement Banner

Banner tĩnh màu hổ phách với icon Megaphone, tiêu đề "Thông báo từ công ty", mặc định "Hiện chưa có thông báo mới". Có nút đóng (X) — chỉ ẩn trong session hiện tại, chưa kết nối backend API. Có `TODO` trong code chờ tích hợp.

### 2.2 Hero strip — Hôm nay

Dải ngang hiển thị: **ngày hiện tại đầy đủ** (Thứ, ngày, tháng, năm) + số nhiệm vụ và kế hoạch (`N nhiệm vụ · M kế hoạch`). Không gọi API thêm — dùng `tasksCount` và `workPlansCount` đã fetch.

### 2.3 Personal Stats — 3 thẻ

Render bởi `getPersonalStats()` + `PersonalStatCard` (grid 1 cột mobile, 3 cột từ `sm`).

| # | Nhãn | Giá trị | Click mở gì |
|---|---|---|---|
| 1 | Nhiệm vụ | `tasksCount` (từ `useMyTasksCount`) | `TaskListModal` (isAdmin=false, chỉ nhiệm vụ của mình) |
| 2 | Kế hoạch | `workPlansCount` (từ `workPlanService.getMyWorkPlans(1,1)` → `pagination.total`) | `WorkPlanListModal` (isAdmin=false) |
| 3 | Đánh giá | `evaluationScore.toFixed(1)%` hoặc "Chưa có thông tin" | `EmployeeSelfEvaluationModal` |

**Lưu ý đặc biệt thẻ Đánh giá:**

- Nếu có `latestEvaluationNotification` chưa đọc → thẻ chuyển **đỏ** (viền đỏ, nền đỏ, chấm nhấp nháy góc phải trên) + subtitle "Đánh giá tháng M/YYYY" + nút "Làm ngay →".
- `latestEvaluationNotification` lấy từ `notificationService.getLatestEvaluationNotification()`.

### 2.4 Quick Actions — 5 thẻ thao tác nhanh

Render bởi `getQuickActions()` + `QuickActionCard` (grid 2 cột, 3 cột từ `lg`).

| # | Tiêu đề | Mô tả | Action | Modal/Page mở |
|---|---|---|---|---|
| 1 | Dữ liệu điểm danh | Xem lịch sử quẹt và thống kê công | `attendance` | `AttendanceHistoryModal` |
| 2 | Báo cáo công việc | Gửi báo cáo hàng ngày | `report` | `DailyWorkReportListModal` (isAdmin=false) |
| 3 | Xin nghỉ phép | Đăng ký nghỉ phép | `leave` | `LeaveRequestModal` |
| 4 | Thông tin cá nhân | Xem hồ sơ chi tiết | `profile` | `PersonalInfoModal` |
| 5 | Lịch sử của tôi | Xem lịch sử hoạt động cá nhân | `history` | `navigate('/my-history')` |

### 2.5 Lịch điểm danh mini (AttendanceMiniCalendar)

Chỉ hiển thị khi `user.employeeId` tồn tại. Các đặc điểm:

- **Grid 7 cột** (T2–CN), đầu tuần là Thứ Hai (ISO).
- **Màu chấm theo trạng thái:** xanh lá (đủ công), vàng (thiếu/muộn), xanh dương (nghỉ phép đã duyệt). Ngày tương lai và Chủ Nhật không có chấm.
- **Dữ liệu:** `useEmployeeAttendanceHistory(employeeId, startDate, endDate)` cho tháng đang xem + `leaveRequestService.getAllLeaveRequests({employeeId, status:'APPROVED'})` để overlay ngày nghỉ.
- **Điều hướng tháng:** nút mũi tên trái/phải; hỗ trợ **vuốt trái/phải trên mobile** (delta > 50px) để đổi tháng.
- Click ngày → mở `AttendanceHistoryModal`.
- Legend: Đủ công / Thiếu-Muộn / Nghỉ phép.

---

## 3. Chi tiết từng modal

### 3.1 TaskListModal (isAdmin=false)

Cùng component với Admin nhưng gọi `taskService.getMyTasks({page, limit})` — chỉ trả nhiệm vụ mà user là `nguoiNhan`. 10 cột giống hệt bảng trong docs Admin. Khác biệt hành vi:

- Cột Trạng thái hiển thị **trạng thái tiếp nhận của chính mình** (`trangThaiTiepNhan[myUserId]`), không phải tổng hợp.
- Nút Tiếp nhận/Từ chối chỉ hiện khi user là recipient và chưa xử lý.
- Không thấy form đánh giá (chỉ `nguoiGiao` mới đánh giá được).

### 3.2 WorkPlanListModal (isAdmin=false)

Gọi `useMyWorkPlans` — chỉ kế hoạch do mình tạo hoặc mình là người thực hiện. 10 cột giống Admin. Khác biệt:

- Nút Xóa chỉ hiện khi mình là người tạo và trạng thái `CHUA_BAT_DAU`.
- Nút Đổi trạng thái chỉ hiện khi mình là assignee (không phải người tạo).

### 3.3 DailyWorkReportListModal (isAdmin=false)

- Gọi `useMyDailyWorkReports({page, limit:5})`.
- **Có nút "Tạo báo cáo mới"** ở header (chỉ non-admin).
- Click báo cáo → mở modal chi tiết (ngày, giờ, mô tả, thành tựu, khó khăn, kế hoạch ngày mai, file đính kèm, nhận xét quản lý).
- Không auto-mark REVIEWED (chỉ admin mới đánh dấu).

### 3.4 LeaveRequestModal

Form đăng ký nghỉ phép. Các trường chính (theo model `LeaveRequest` trong `common.prisma`):

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `leaveType` | enum | ANNUAL, SICK, PERSONAL, MATERNITY, EMERGENCY, COMPENSATORY |
| `startDate` / `endDate` | DateTime | Ngày bắt đầu/kết thúc |
| `startTime` / `endTime` | String? | Giờ (cho nghỉ nửa ngày) |
| `isHalfDay` | Boolean | Mặc định false |
| `halfDayPeriod` | enum? | MORNING hoặc AFTERNOON |
| `reason` | Text | Bắt buộc |
| `attachments` | String[] | File đính kèm |
| `status` | enum | PENDING → APPROVED / REJECTED |

Mã đơn tự động (`code`): `NP-001`, `NP-002`, ... Khi bị từ chối có `rejectionReason`.

### 3.5 AttendanceHistoryModal

Hiển thị lịch sử quẹt chi tiết theo `employeeId` + `employeeName`. Dữ liệu từ `useEmployeeAttendanceHistory` — mỗi ngày có `checkInTime`, `checkOutTime`, `status` (PRESENT/LATE/ABSENT/ON_LEAVE), `workHours`, `notes`, `shift`. Trạng thái LATE được chấm vàng trên calendar.

### 3.6 EmployeeSelfEvaluationModal

Form tự đánh giá theo kỳ. Khi mở từ thẻ Đánh giá có thông báo, truyền `evaluationId` + `notificationId` + `evaluationPeriod`. Sau khi tạo đánh giá mới, callback `onEvaluationCreated` cập nhật notification. Theo model `Evaluation`: có `score`, `comment`, `status` (SELF_PENDING → ...), `details[]` theo từng `PositionResponsibility` với `selfScore`.

### 3.7 PersonalInfoModal

Xem hồ sơ cá nhân: họ tên, mã NV, phòng ban, chức vụ, liên lạc, hợp đồng. Dữ liệu lấy từ `Employee` + `User` models.

---

## 4. Hướng dẫn sử dụng

1. **Đăng nhập** bằng tài khoản nhân viên → vào `/dashboard`. Nếu thấy trang thống kê toàn công ty nghĩa là tài khoản có quyền ADMIN.
2. **Kiểm tra thẻ Đánh giá:** nếu có chấm đỏ nhấp nháy, bấm "Làm ngay →" để hoàn thành tự đánh giá trước hạn.
3. **Xem nhiệm vụ:** bấm thẻ "Nhiệm vụ" → xem danh sách, bấm từng dòng để đọc chi tiết. Nếu là người nhận và chưa xử lý, bấm Tiếp nhận hoặc Từ chối.
4. **Xem kế hoạch:** bấm thẻ "Kế hoạch" → xem kế hoạch công việc; nếu là người thực hiện, có thể đổi trạng thái (Chưa bắt đầu → Đang thực hiện → Hoàn thành).
5. **Báo cáo công việc:** bấm "Báo cáo công việc" → bấm "Tạo báo cáo mới" → điền mô tả, giờ làm, thành tựu, khó khăn → Gửi.
6. **Xin nghỉ phép:** bấm "Xin nghỉ phép" → chọn loại, ngày, lý do → Gửi yêu cầu. Theo dõi trạng thái duyệt.
7. **Xem điểm danh:** dùng lịch mini để xem tổng quan tháng; bấm ngày cụ thể để xem chi tiết giờ vào/ra. Hoặc bấm "Dữ liệu điểm danh" trong Quick Actions.
8. **Xem thông tin cá nhân:** bấm "Thông tin cá nhân" để xem hồ sơ.
9. **Xem lịch sử hoạt động:** bấm "Lịch sử của tôi" → chuyển tới trang `/my-history`.

---

## 5. Lưu ý

- **Không có thống kê phòng ban:** Dashboard Nhân viên không hiển thị số liệu của phòng ban hay công ty. Nếu cần, liên hệ quản lý hoặc vào đúng module phân hệ (nếu được phân quyền).
- **Lịch điểm danh chỉ hiện khi có `employeeId`:** user chưa liên kết với hồ sơ Employee sẽ không thấy calendar.
- **Thông báo đánh giá có thời hạn:** nếu thấy chấm đỏ, nên hoàn thành sớm. Sau khi đánh giá xong, chấm đỏ biến mất.
- **Báo cáo công việc:** nên gửi trước khi kết thúc ngày. Quản lý có thể xem và nhận xét; khi nhận xét sẽ hiện trong chi tiết báo cáo.
- **Xin nghỉ phép:** nên đăng ký trước ít nhất 1 ngày (trừ khẩn cấp). Theo dõi trạng thái APPROVED/REJECTED.
- **Vuốt đổi tháng trên mobile:** calendar hỗ trợ swipe trái/phải; trên desktop dùng nút mũi tên.
