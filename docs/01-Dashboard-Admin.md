# 01 — Dashboard Quản trị (Admin)

> **Route:** `/dashboard` (redirect mặc định từ `/`) · **Guard:** `ProtectedLayout` (JWT) + nhánh `canSeeStats = isAdmin(user.department)` bên trong `Dashboard1.tsx`. Nếu không phải ADMIN, component render `EmployeeDashboard` thay vì 403.

## 1. Tổng quan

Dashboard Quản trị là trang tổng quan toàn hệ thống dành cho vai trò **ADMIN**. Trên code hiện tại chỉ ADMIN thấy đầy đủ số liệu; `DEPARTMENT_HEAD` / `TEAM_LEAD` theo thiết kế phân quyền sẽ thuộc nhóm quản lý nhưng hiện vẫn rơi vào nhánh Employee (cần đồng bộ guard nếu muốn mở rộng). Trang tập trung trả lời câu hỏi "hôm nay hệ thống đang ở đâu" — gộp KPI vận hành, xu hướng đơn hàng/báo giá và lối tắt đi sâu từng phân hệ.

| Thuộc tính | Giá trị |
|---|---|
| File nguồn | `frontend/src/pages/Dashboard1.tsx` |
| Route | `/dashboard` |
| Quyền truy cập | `ADMIN` (code thực tế). Thiết kế mong muốn: `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD` |
| Layout | `ProtectedLayout` + `ThemeHeader` (theo `activeTheme` từ `SystemSettingsContext`) |
| Data layer | TanStack Query (`useQuery`) — 20+ query song song, `enabled: canSeeStats` |

---

## 2. Các thành phần chính

### 2.1 Quick Stats — 6 thẻ KPI

Render bởi `getQuickStats()` + `QuickStatCard` (grid `2 / 3 / 6` cột, cao đều nhau).

| # | Nhãn | Giá trị | Dòng phụ (`change`) | Click mở gì |
|---|---|---|---|---|
| 1 | Mua hàng | `purchaseRequestCount` (đã lọc theo kỳ) | `Chờ duyệt: N` (đếm toàn bộ, không lọc kỳ) | Modal Yêu cầu mua hàng |
| 2 | Nhiệm vụ | `tasksCount` | `N nhiệm vụ` | `TaskListModal` (isAdmin=true, tất cả) |
| 3 | Kế hoạch | `workPlanCount + overtimeCount` | `TC chờ duyệt: N` (đỏ khi >0) | `PlanCombinedModal` (2 tab) |
| 4 | Góp ý & KK | `feedbackCount` | `N góp ý` | `FeedbackListModal` |
| 5 | Đánh giá | — | `N chưa đánh giá` | `EmployeeSelfEvaluationModal` (tab subordinate) |
| 6 | Báo cáo | — | `N chưa xem` | `DailyWorkReportListModal` (isAdmin=true) |

Hai thẻ đầu hỗ trợ `delta` (↑/↓ % so với kỳ trước) khi có dữ liệu — hiện áp dụng cho Mua hàng và Nhiệm vụ.

### 2.2 Bộ lọc kỳ thống kê

Segmented control 6 lựa chọn: **Tuần này / Tháng này / Quý này / Năm này / Tất cả / Tùy chọn**.

- 5 preset tính `filterStart` bằng `getPresetStart()` (đầu tuần T2, đầu tháng/quý/năm); `filterEnd = null` (đến hiện tại).
- `Tùy chọn` mở dải `DatePicker` Từ ngày — Đến ngày (có nút Xóa).
- Áp dụng qua `filterByDateRange(items, start, end, dateField)` cho các nguồn giao dịch: `orders`, `quotations`, `feedbacks`, `inspections`, `qualityEvals`, `invoices`, `costs`, `taxReports`, `finishedProducts`, `supplyRequests`, `workPlans`, `purchaseRequests`.
- **Không lọc:** `employees`, `machines`, `processes`, `suppliers`, `customers`, `debt` (số tồn tại thời điểm).

### 2.3 Biểu đồ xu hướng — Hero LineChart

`ChartCard` + Recharts, cao 260px, bucket theo tháng T1–T12 của năm hiện tại.

| Series | Nguồn | Cách đếm |
|---|---|---|
| Đơn hàng | `filteredOrders` | `ngayDatHang \|\| createdAt` rơi vào tháng đó |
| Báo giá | `filteredQuotations` | `createdAt \|\| ngayTao` rơi vào tháng đó |

Tooltip tối màu, Legend phân biệt Đơn hàng / Báo giá. Dữ liệu đã tôn trọng bộ lọc kỳ.

### 2.4 Thẻ phòng ban — 7 khối

Mỗi `DepartmentCard` có dải màu trên cùng + icon + lưới chỉ tiêu. Click thẻ → `navigate('/<deptKey>')`, click chỉ tiêu → `navigate(link)`.

| Phòng ban | Màu accent | Chỉ tiêu | Link đích |
|---|---|---|---|
| Tổng hợp | `bg-slate-400` | Đơn hàng, Báo giá, Khách hàng, Phản hồi KH | `/general/...` |
| Chất lượng | `bg-emerald-400` | Quy trình, Kiểm tra NB, Đánh giá CL, Nhân viên | `/quality/...` |
| Kinh doanh | `bg-blue-400` | Đơn hàng, Khách hàng, Báo giá, Phản hồi | `/business/...` |
| Kế toán | `bg-amber-400` | Hóa đơn, Chi phí, Công nợ, Báo cáo thuế | `/accounting/...` |
| Sản xuất | `bg-indigo-400` | Hệ thống máy, Đang SX, Thành phẩm, Đã giao | `/production/...` |
| Mua hàng | `bg-teal-400` | Yêu cầu mua, Nhà cung cấp, Yêu cầu cung ứng, Chờ duyệt | `/purchasing/...` |
| Kỹ thuật | `bg-rose-400` | Hệ thống máy, Yêu cầu sửa chữa, Mẫu lỗi, Linh kiện, Dự án | `/technical/...` |

---

## 3. Chi tiết từng bảng / modal

### 3.1 Bảng Yêu cầu mua hàng (inline)

> **Nguồn:** `purchaseRequestService.getAllPurchaseRequests(1, 10000)` — fetch 1 lần, render toàn bộ, **không phân trang**.

**10 cột:**

| STT | Mã yêu cầu | Ngày yêu cầu | Nhân viên | Sản phẩm | Tổng tiền | Ưu tiên | Trạng thái | Người duyệt | Hành động |
|---|---|---|---|---|---|---|---|---|---|
| Index | `maYeuCau` | dd/MM/yyyy | `tenNhanVien` | join `items[].tenHangHoa` | sum(`giaDuKien*soLuong`) | badge Cao/TB/Thấp | badge Chờ duyệt/Đã duyệt/Từ chối | `nguoiDuyet` | Eye + Duyệt/Từ chối |

- Cột Sản phẩm hiện tối đa **3 items đầu**, thừa thì `...` + `title` đầy đủ. Tổng tiền tính client-side.
- Hành động: Eye mở modal chi tiết; Duyệt/Từ chối gọi `updatePurchaseRequest` với `nguoiDuyet` + `ngayDuyet`.

**Modal chi tiết:** lưới 2 cột (mã, ngày, nhân viên, mã NV, ưu tiên, trạng thái, người duyệt, ngày duyệt) + Mục đích yêu cầu + Ghi chú + bảng items **8 cột** (`#`, Phân loại, Tên hàng hóa, SL, ĐVT, Nhà cung cấp, Đơn giá, Thành tiền) + Tổng cộng + Ghi chú mua hàng.

**Vấn đề & đề xuất:**

| Vấn đề hiện tại | Nên hiển thị thêm |
|---|---|
| Fetch 10k + render hết → lag khi >200 dòng | Phân trang server (20–50/trang) + cột **Còn X ngày** |
| Thiếu Mục đích, Nguồn, file trong bảng | Thêm **Mục đích** (truncate), badge **Nguồn** `MANUAL/SHORTAGE/REORDER/QUICK`, icon **File** |
| Không filter/search/sort | Search `maYeuCau`/`tenNhanVien`, filter Trạng thái + Nguồn + Ưu tiên, sort Ngày/Tổng tiền |

### 3.2 TaskListModal — Nhiệm vụ

**10 cột:**

| STT | Nội dung | Người giao | Người nhận | Ngày giao | Hạn hoàn thành | Ưu tiên | Trạng thái | Đánh giá | Hành động |
|---|---|---|---|---|---|---|---|---|---|
| … | `noiDung` clamp 2 | `nguoiGiao` | `N người` | dd/MM/yyyy | dd/MM/yyyy | badge | badge tiếp nhận | `diemDanhGia/100` | Tiếp nhận/Từ chối |

- Pagination `limit 10`, có `total/totalPages`. Click dòng → detail (ghi chú, files, trạng thái từng người nhận, form đánh giá 0–100).
- **Thiếu trong bảng chính:** `ghiChu`, `files`, **không search** dù backend hỗ trợ.
- **Đề xuất:** thêm cột **Còn X ngày / Quá hạn**, icon **File**, ô search + filter Ưu tiên/Trạng thái.

### 3.3 Kế hoạch — PlanCombinedModal (WorkPlan + OvertimePlan)

**WorkPlanListModal — 10 cột:**

| STT | Tiêu đề | Người tạo | Người thực hiện | Ngày bắt đầu | Ngày kết thúc | Ưu tiên | Trạng thái | File | Thao tác |
|---|---|---|---|---|---|---|---|---|---|
| … | `tieuDe` clamp 2 | `nguoiTao` | `N người` | dd/MM/yyyy | dd/MM/yyyy | badge | badge | link files | Đổi trạng thái, Xóa |

- Query: `useWorkPlans` / `useMyWorkPlans`, `limit 10`. Search debounce 300ms.
- **Thiếu trong bảng chính:** `noiDung`, `ghiChu`, không hiện **Còn X ngày**.
- **Đề xuất:** badge **Còn X ngày / Quá hạn**, cột **Tiến độ**, filter Trạng thái + Ưu tiên.

**OvertimePlanListModal — 5 cột chính + detail 6 cột:**

| Ngày tăng ca | Người tạo | Nội dung | Trạng thái | Hành động |
|---|---|---|---|---|
| `renderDateRange(items)` + badge ưu tiên | Tên + mã NV + phòng | `noiDung` clamp 2 + `N người` + `N file` | badge | Duyệt/Từ chối/Xóa |

- Pagination `limit 10`. Detail có sub-table **6 cột**: Ngày, Ca, Nhân sự, Giờ bắt đầu, Giờ kết thúc, **Tổng giờ**.
- **Thiếu trong bảng chính:** tổng giờ OT, ngày OT thực tế từng dòng, `lyDoTuChoi`.
- **Đề xuất:** thêm cột **Tổng giờ OT** (sum items), hiện **Ngày OT thực tế** khi chỉ 1–2 ngày, cột **Lý do từ chối** khi `TU_CHOI`.

### 3.4 FeedbackListModal — Góp ý & Khó khăn

- **Card list** (không phải table). Tabs: Tất cả / Góp ý / Khó khăn.
- **Không phân trang thực sự:** fetch cố định 100, không dùng `total`, **cắt data khi >100**.
- **Đề xuất:** thêm pagination + total (limit 10–20), filter Trạng thái (`PENDING/IN_PROGRESS/RESOLVED/REJECTED`), search content/code, hiện **Còn X ngày chưa xử lý**.

### 3.5 DailyWorkReportListModal — Báo cáo công việc

- **Card list** (mỗi báo cáo: ngày, badge DRAFT/SUBMITTED/REVIEWED/APPROVED/REJECTED, tên NV, `workHours`, `workDescription` clamp 2, `supervisorComment`).
- Filter tabs (admin): Tất cả / Chưa xem / Đã xem. Auto-mark `REVIEWED` khi admin mở.
- Pagination `limit 5`, có `totalPages`.
- **Đề xuất:** hiện **Ngày nộp vs Ngày báo cáo** (phát hiện muộn), **Số file đính kèm** trên card, filter khoảng ngày.

### 3.6 Đánh giá — EmployeeSelfEvaluationModal

Mở từ Quick Stat "Đánh giá", `initialTab="subordinate"`. Không phải bảng trong Dashboard mà là modal đánh giá theo `Evaluation` model.

---

## 4. Hướng dẫn sử dụng

1. **Đăng nhập bằng tài khoản ADMIN** → vào `/dashboard`. Nếu thấy trang cá nhân (3 thẻ + Lịch điểm danh) nghĩa là không có quyền ADMIN — liên hệ quản trị gán `department = ADMIN`.
2. **Chọn kỳ thống kê** ở dải "Kỳ thống kê": bấm Tuần/Tháng/Quý/Năm/Tất cả hoặc Tùy chọn → quan sát Quick Stats, biểu đồ và thẻ phòng ban tự lọc.
3. **Xem nhanh KPI:** bấm 1 trong 6 thẻ Quick Stats để mở modal. Ví dụ: "Mua hàng" → duyệt/từ chối ngay; "Nhiệm vụ" → xem chi tiết, đánh giá 0–100 nếu là người giao.
4. **Đi sâu phòng ban:** bấm thẻ phòng ban vào module, hoặc bấm chỉ tiêu (ví dụ "Đơn hàng" → `/general/pricing?tab=orders`).
5. **Xử lý Yêu cầu mua hàng:** trong modal, bấm Eye xem đủ items + tổng tiền + mục đích; bấm Duyệt/Từ chối → toast xác nhận.
6. **Theo dõi xu hướng:** xem biểu đồ "Xu hướng đơn hàng & báo giá" T1–T12; đổi kỳ để lọc dữ liệu đầu vào.

---

## 5. Lưu ý

- **Phân quyền hiển thị:** mọi query có `enabled: canSeeStats` — non-ADMIN không gọi API thống kê. Đừng dựa vào ẩn UI để bảo mật; backend vẫn phải enforce RBAC.
- **Hiệu năng PurchaseRequest:** đang fetch `limit 10000` và render tất cả — giật khi >200 yêu cầu. Ưu tiên phân trang server + virtualize trước khi thêm cột.
- **Phân trang nhất quán:** Task/WorkPlan/Overtime `limit 10` có `total`; Feedback cứng 100 không pager; DailyReport `limit 5`. Nên thống nhất 10–20/trang và luôn trả `pagination.total`.
- **"Chờ duyệt" luôn đếm toàn bộ:** `purchaseRequestPendingCount` cố tình không lọc theo kỳ để không bỏ sót yêu cầu cũ còn treo — hành vi có chủ đích.
- **DEPARTMENT_HEAD/TEAM_LEAD:** nếu muốn thấy Dashboard Admin, đổi `canSeeStats` và bổ sung ABAC lọc theo phòng ban, tránh lộ số liệu toàn công ty.
