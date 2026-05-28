---
department: DEPT_ALL
department_name: "Hệ thống thông báo"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: all
language: vi
---

# Hệ thống thông báo (Notification System)

## 1. Tổng quan

Hệ thống thông báo gửi thông báo real-time đến nhân viên khi có sự kiện liên quan xảy ra. Mỗi thông báo có:
- **Icon** — phân biệt loại thông báo bằng màu sắc và biểu tượng
- **Title + Message** — mô tả ngắn gọn sự kiện
- **Click hành xử** — nhấn vào sẽ mở modal hoặc chuyển trang chi tiết

### Cách nhận thông báo

| Phương thức | Mô tả |
|---|---|
| **Chuông thông báo** 🔔 (góc trên header) | Hiển thị số thông báo chưa đọc. Nhấn để xem danh sách dropdown |
| **WebSocket real-time** | Thông báo xuất hiện ngay lập tức không cần refresh trang |
| **Web Push (VAPID)** | Thông báo hiển thị ngoài trình duyệt (khi tab đang background) |

---

## 2. Danh sách thông báo theo bộ phận

### 2.1 Bộ phận chất lượng (DEPT_QUALITY)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Nhân viên gửi đơn nghỉ phép mới (`LEAVE_REQUEST_SUBMITTED`) | Phòng CL Nhân sự (`SUBDEPT_QUALITY_PERSONNEL`) + admin + user có **secondary** sub-department này | Mở modal chi tiết nghỉ phép |
| Đơn nghỉ phép được duyệt/từ chối (`LEAVE_REQUEST_RESPONDED`) | Người gửi đơn | Mở modal chi tiết nghỉ phép |
| Đánh giá mới được tạo cho bạn (`EVALUATION_CREATED`) | Nhân viên được đánh giá | Mở modal đánh giá |
| Đánh giá cần duyệt cấp 1 (`EVALUATION_SUPERVISOR1_PENDING`) | Cấp trên 1 | Mở modal đánh giá |
| Đánh giá cần duyệt cấp 2 (`EVALUATION_SUPERVISOR2_PENDING`) | Cấp trên 2 | Mở modal đánh giá |
| Đánh giá hoàn thành (`EVALUATION_COMPLETED`) | Nhân viên được đánh giá | Mở modal đánh giá |
| Bảng lương tháng mới (`PAYROLL_PUBLISHED`) | Nhân viên có bảng lương | Mở modal chi tiết lương |

### 2.2 Bộ phận tổng hợp (DEPT_GENERAL)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Báo giá được tạo/từ chối (không có noti riêng — theo dõi qua YCBG) | — | — |

### 2.3 Bộ phận kinh doanh (DEPT_BUSINESS)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Đơn hàng mới (`ORDER_CREATED`) | Bộ phận sản xuất (`DEPT_PRODUCTION`) + admin + user có **secondary** production | Vào `/business/international` |
| Cập nhật trạng thái đơn hàng (`ORDER_STATUS_UPDATED`) | Admin | Vào `/business/international` |

### 2.4 Bộ phận kế toán (DEPT_ACCOUNTING)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Hóa đơn mới (`INVOICE_CREATED`) | Admin | Vào `/accounting/admin?tab=invoices` |
| Công nợ mới (`DEBT_CREATED`) | Admin | Vào `/accounting/admin?tab=debts` |
| Phiếu nhập kho mới (`WAREHOUSE_RECEIPT_CREATED`) | Admin | Vào `/production/warehouse` |
| Phiếu xuất kho mới (`WAREHOUSE_ISSUE_CREATED`) | Admin | Vào `/production/warehouse` |

### 2.5 Bộ phận thu mua (DEPT_PURCHASING)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| YC-MH được duyệt (`PURCHASE_REQUEST_APPROVED`) | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |
| YC-MH bị từ chối (`PURCHASE_REQUEST_REJECTED`) | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |
| YC-MH hoàn thành (`PURCHASE_REQUEST_COMPLETED`) | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |

### 2.6 Bộ phận sản xuất (DEPT_PRODUCTION)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| YC-CC mới (`SUPPLY_REQUEST_CREATED`) | Kho (`SUBDEPT_PRODUCTION_WAREHOUSE`) + admin + user có **secondary** sub-department này | Vào `/production/warehouse` |
| YC-CC đang xử lý (`SUPPLY_REQUEST_PROCESSING`) | Người yêu cầu | Vào `/production/warehouse` |
| YC-CC đã duyệt (`SUPPLY_REQUEST_APPROVED`) | Người yêu cầu | Vào `/production/warehouse` |
| YC-CC hoàn thành (`SUPPLY_REQUEST_FULFILLED`) | Người yêu cầu | Vào `/production/warehouse` |
| Báo cáo sản lượng mới (`PRODUCTION_REPORT_CREATED`) | Admin | Vào `/production/management?tab=productionReport` |

> **Lưu ý**: `SUPPLY_REQUEST` (không phải `SUPPLY_REQUEST_PROCESSING`) khi tạo sẽ gửi đến kho + admin. Các sự kiện `PROCESSING`, `APPROVED`, `FULFILLED` gửi đến người yêu cầu.

### 2.7 Bộ phận kỹ thuật (DEPT_TECHNICAL)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Yêu cầu sửa chữa mới (`REPAIR_REQUEST_CREATED`) | Kỹ thuật (`DEPT_TECHNICAL`) + admin + user có **secondary** technical | Vào `/technical/quality?tab=repairRequests` |
| Yêu cầu sửa chữa cập nhật (`REPAIR_REQUEST_UPDATED`) | Kỹ thuật + admin + user có **secondary** technical | Vào `/technical/quality?tab=repairRequests` |
| Báo cáo hoạt động máy (`MACHINE_ACTIVITY_REPORTED`) | Kỹ thuật + admin + user có **secondary** technical | Vào `/production/management?tab=productionReport` |

### 2.8 Tất cả nhân viên (chức năng chung)

| Sự kiện | Gửi cho | Nhấn vào |
|---------|---------|----------|
| Nhiệm vụ mới (`TASK_ASSIGNED`) | Người được giao | Mở popup danh sách nhiệm vụ |
| Nhiệm vụ mới (bản sao admin) (`TASK_ADMIN_COPY`) | Admin | Mở popup danh sách nhiệm vụ |
| Kế hoạch tăng ca cần duyệt (`OVERTIME_PLAN_SUBMITTED`) | Admin | Mở popup chi tiết |
| Kế hoạch tăng ca được duyệt/từ chối (`OVERTIME_PLAN_RESPONDED`) | Người tạo | Mở popup chi tiết |
| Kế hoạch tăng ca được duyệt (nhân viên tham gia) | Người tham gia | Mở popup chi tiết |
| Góp ý mới (`PRIVATE_FEEDBACK_SUBMITTED`) | Admin | Mở popup danh sách góp ý |
| Báo cáo công việc mới (`DAILY_WORK_REPORT_SUBMITTED`) | Admin | Mở popup danh sách báo cáo |
| Kế hoạch công việc mới (`WORK_PLAN_ASSIGNED`) | Người được giao | Mở popup danh sách kế hoạch |
| Yêu cầu đặt lại mật khẩu (`PASSWORD_RESET_REQUESTED`) | Admin | Mở popup chi tiết |
| Nghiệm thu bàn giao mới (`ACCEPTANCE_HANDOVER_CREATED`) | Người được chỉ định | Mở modal nghiệm thu bàn giao |

> **Tất cả sự kiện "admin"** đều chỉ gửi đến user có `role: ADMIN` (primary), không bao gồm secondary role ADMIN.

---

## 3. Chi tiết kỹ thuật

### 3.1 Luồng gửi thông báo

```
Sự kiện business (ví dụ: duyệt YC-MH)
        │
        ▼
notify(event, context)                            # notificationService.ts
        │
        ├─ registry.get(event) → định nghĩa        # notificationRegistry.ts
        ├─ resolveRecipients(ctx) → [employeeIds]  # resolver
        ├─ buildMessage(ctx) → { title, message }
        │
        ├─ prisma.notification.createMany(...)      # Lưu DB (per employeeId)
        │
        └─ Promise.allSettled([
             pushNotification(employeeId, payload), # WebSocket real-time
             sendPushToEmployee(employeeId, ...),   # Web Push (VAPID)
           ])
```

### 3.2 Resolver: Ai nhận được thông báo?

| Resolver | Cách hoạt động | Secondary department? |
|----------|---------------|----------------------|
| `resolveDirectRecipients(ctx)` | Dùng `targetEmployeeIds` tường minh từ context | ✅ Không liên quan (ID cụ thể) |
| `getEmployeeIdsBySubDeptCode(code)` | Tìm employee theo `subDepartment.code` + user có `UserSecondaryDepartment.subDepartmentId` | ✅ **Đã bao gồm** secondary |
| `getEmployeeIdsByDeptCode(code)` | Tìm employee theo `subDepartment.department.code` + user có `UserSecondaryDepartment.departmentId` | ✅ **Đã bao gồm** secondary |
| `getAdminEmployeeIds(excludeUserId?)` | Chỉ user có `role: ADMIN` (primary) | ❌ Chỉ primary ADMIN |

**Giải thích "secondary department":**
- Một user có thể được gán nhiều phòng ban phụ qua **Bộ phận phụ / Phòng ban phụ** trong form tạo/sửa người dùng (admin system)
- Dữ liệu này lưu trong bảng `UserSecondaryDepartment`
- User chỉ có **1 employee record** duy nhất — tất cả thông báo đều gửi đến employee ID đó
- Resolver `getEmployeeIdsBySubDeptCode` và `getEmployeeIdsByDeptCode` đã được cập nhật để query cả `UserSecondaryDepartment`, nên user có phòng ban phụ vẫn nhận được thông báo đúng

### 3.3 Nhấn vào thông báo — điều hướng

| Loại (type) | Hành vi |
|-------------|---------|
| `EVALUATION*`, `TASK*`, `PAYROLL`, `LEAVE_REQUEST*`, `OVERTIME_PLAN*`, `PRIVATE_FEEDBACK`, `DAILY_WORK_REPORT`, `WORK_PLAN`, `ACCEPTANCE_HANDOVER`, `PASSWORD_RESET` | Mở popup/modal tương ứng |
| `SUPPLY_REQUEST*` | Chuyển trang → `/production/warehouse` |
| `REPAIR_REQUEST` | Chuyển trang → `/technical/quality?tab=repairRequests` |
| `PURCHASE_REQUEST` | Chuyển trang → `/purchasing/materials?purchaseRequestId=ID` (mở đúng chi tiết) |
| `ORDER`, `ORDER_STATUS_UPDATED` | Chuyển trang → `/business/international` |
| `WAREHOUSE` | Chuyển trang → `/production/warehouse` |
| `INVOICE` | Chuyển trang → `/accounting/admin?tab=invoices` |
| `DEBT` | Chuyển trang → `/accounting/admin?tab=debts` |
| `PRODUCTION_REPORT` | Chuyển trang → `/production/management?tab=productionReport` |

> Các thông báo có chứa `purchaseRequestId` trong metadata sẽ tự động mở modal chi tiết YC-MH khi nhấn.

### 3.4 WebSocket real-time

- User kết nối WebSocket qua `/ws?token=JWT_TOKEN` khi đăng nhập
- Server resolve `userId → employeeId` và route thông báo theo employeeId
- Mỗi user có thể có nhiều tab trình duyệt — tất cả đều nhận được thông báo real-time

---

## 4. FAQ

**Q1: Tôi có thấy thông báo không nếu tôi đang ở tab khác?**
Có. Nếu trình duyệt hỗ trợ Web Push (VAPID), thông báo sẽ hiện ngay cả khi tab đang background.

**Q2: Tôi được gán phòng ban phụ nhưng không thấy thông báo?**
Kiểm tra:
- Tài khoản đang `isActive: true`
- Phòng ban phụ được gán đúng qua `UserSecondaryDepartment` (kiểm tra trong Admin → Quản lý người dùng)
- Thông báo thuộc loại department-based (xem bảng ở mục 2) — nếu là `resolveDirectRecipients` thì chỉ gửi theo ID cụ thể

**Q3: Admin có thấy tất cả thông báo không?**
Admin nhận được:
- Tất cả thông báo từ `getAdminEmployeeIds()` (password reset, feedback, daily report, overtime approval, order status, warehouse, invoice, debt, production report)
- Thông báo department-based nếu admin thuộc department đó (primary)
- Thông báo được gửi trực tiếp đến employeeId của admin

**Q4: Tôi nhấn vào thông báo "YC-MH được duyệt" nhưng không thấy chi tiết?**
Thông báo `PURCHASE_REQUEST` có chứa `purchaseRequestId` trong metadata. Khi nhấn:
1. Chuyển đến `/purchasing/materials?purchaseRequestId=ID`
2. Trang tự động chuyển sang tab "Danh sách mua hàng"
3. Tự động fetch và mở modal chi tiết YC-MH

**Q5: Tại sao tôi không thấy icon cho một số thông báo?**
Tất cả 27 loại thông báo đều có icon riêng trong hệ thống. Nếu thấy icon mặc định (hình tròn xám), vui lòng báo admin.

**Q6: Làm sao để xóa thông báo?**
Nhấn nút **X** (hoặc swipe) trên từng thông báo trong dropdown.

**Q7: Thông báo cũ có tự động biến mất không?**
Danh sách dropdown chỉ hiển thị 20 thông báo gần nhất. Thông báo cũ vẫn còn trong database nhưng không hiện trên dropdown — có thể xem qua API nếu cần.
