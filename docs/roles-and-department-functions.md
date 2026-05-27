# Bảng Vai Trò & Chức Năng Phòng Ban — ERP An Binh Foods

> Cập nhật: 2026-05-27 | Phiên bản: sau khi fix auth gaps

---

## 1. Hệ Thống Vai Trò (Roles)

| Vai trò | Code | Cấp bậc | Mô tả |
|---------|------|----------|--------|
| Quản trị viên | `ADMIN` | 1 (cao nhất) | Toàn quyền hệ thống, bypass mọi kiểm tra ABAC |
| Trưởng bộ phận | `DEPARTMENT_HEAD` | 2 | Quản lý toàn bộ phòng ban, duyệt/tạo/sửa dữ liệu nghiệp vụ |
| Trưởng phòng | `TEAM_LEAD` | 3 | Quản lý phòng con, tạo/sửa dữ liệu trong phạm vi phòng |
| Nhân viên | `EMPLOYEE` | 4 (thấp nhất) | Xem dữ liệu, tạo yêu cầu cá nhân, tự đánh giá |

---

## 2. Cấu Trúc Phòng Ban

| Bộ phận | Code | Phòng con |
|---------|------|-----------|
| Quản trị hệ thống | `admin` | — (toàn quyền) |
| Bộ phận tổng hợp | `general` | Phòng giá thành (`pricing`), Phòng chăm sóc (`partners`) |
| Bộ phận chất lượng | `quality` | Phòng CL nhân sự (`personnel`), Phòng CL quy trình (`process`) |
| Bộ phận kinh doanh | `business` | Phòng KD Quốc Tế (`international`), Phòng KD Nội Địa (`domestic`) |
| Bộ phận kế toán | `accounting` | Phòng KT Hành chính (`admin`), Phòng KT thuế (`tax`) |
| Bộ phận thu mua | `purchasing` | Phòng thu mua NVL (`materials`), Phòng mua Thiết bị (`equipment`) |
| Bộ phận sản xuất | `production` | Phòng QLSX (`management`), Quản lý kho (`warehouse`), Dữ liệu SX (`data`) |
| Bộ phận kỹ thuật | `technical` | Phòng QLHTM (`quality`), Phòng cơ-điện (`mechanical`) |

---

## 3. Ma Trận Quyền Theo Module (Frontend Access)

| Module | Phòng ban được truy cập | Ghi chú |
|--------|------------------------|---------|
| Dashboard | Tất cả | Admin xem toàn bộ stats; nhân viên chỉ xem stats phòng ban |
| Chung (Common) | Tất cả | Quản lý dữ liệu dùng chung |
| Bộ phận tổng hợp | Admin, General | — |
| Bộ phận chất lượng | Admin, Quality | — |
| Bộ phận kinh doanh | Admin, Business | — |
| Bộ phận kế toán | Admin, Accounting | — |
| Bộ phận thu mua | Admin, Purchasing | — |
| Bộ phận sản xuất | Admin, Production | — |
| Bộ phận kỹ thuật | Admin, Technical | — |
| Cài đặt hệ thống | Admin only | — |
| Chấm công khuôn mặt | Admin only | — |

**Secondary departments**: User có thể được gán phòng ban phụ, cho phép truy cập module của phòng ban đó.

---

## 4. Ma Trận Quyền Backend — Chi Tiết Theo API

### 4.1 Quản lý người dùng & hệ thống (Admin only)

| API | Endpoint | Quyền |
|-----|----------|-------|
| Users | GET/POST/PUT/DELETE `/api/users/*` | ADMIN |
| System Settings | PUT `/api/system-settings` | ADMIN |
| Face Attendance (quản lý) | `/api/face-attendance/profiles/*`, `/devices/*` | ADMIN |

### 4.2 Nhân sự (HR)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Employees | `/api/employees` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Departments | `/api/departments` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Positions | `/api/positions` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Position Levels | `/api/position-levels` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Position Responsibilities | `/api/position-responsibilities` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Payroll | `/api/payrolls` | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | — |
| Employee Evaluations | `/api/employee-evaluations` | Tất cả (theo role) | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD | — |
| Attendance | `/api/attendances` | Tất cả authenticated | — | — | — |
| Leave Requests | `/api/leave-requests` | Tất cả authenticated | Tất cả | — | — |
| Overtime Plans | `/api/overtime-plans` | Tất cả authenticated | ADMIN, DEPT_HEAD | — | — |
| Work Shifts | `/api/work-shifts` | Tất cả authenticated | — | — | — |

### 4.3 Kinh doanh (Business)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| International Customers | `/api/international-customers` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| International Products | `/api/international-products` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Quotation Requests | `/api/quotation-requests` | Tất cả authenticated | ADMIN, DEPT_HEAD, EMPLOYEE | ADMIN, DEPT_HEAD, EMPLOYEE | ADMIN |
| Quotations | `/api/quotations` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Orders | `/api/orders` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Customer Feedbacks | `/api/customer-feedbacks` | Tất cả authenticated | Tất cả | — | — |

### 4.4 Kế toán (Accounting)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Invoices | `/api/invoices` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Debts | `/api/debts` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Tax Reports | `/api/tax-reports` | Tất cả authenticated | — | — | — |
| General Costs | `/api/general-costs` | Tất cả authenticated | — | — | — |
| Export Costs | `/api/export-costs` | Tất cả authenticated | — | — | — |

### 4.5 Thu mua (Purchasing)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Suppliers | `/api/suppliers` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Purchase Requests | `/api/purchase-requests` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN |
| Supply Requests | `/api/supply-requests` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | — | ADMIN |

### 4.6 Sản xuất (Production)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Warehouse Receipts | `/api/warehouse-receipts` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | — | — |
| Warehouse Issues | `/api/warehouse-issues` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | — | — |
| Warehouses | `/api/warehouses` | Tất cả authenticated | — | — | — |
| Lots | `/api/lots` | Tất cả authenticated | — | — | — |
| Lot Products | `/api/lot-products` | Tất cả authenticated | — | — | — |
| Finished Products | `/api/finished-products` | Tất cả authenticated | — | — | — |
| Production Processes | `/api/production-processes` | Tất cả authenticated | — | — | — |
| Production Reports | `/api/production-reports` | Tất cả authenticated | — | — | — |
| Daily Work Reports | `/api/daily-work-reports` | Tất cả authenticated | Tất cả | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD, TEAM_LEAD |

### 4.7 Kỹ thuật (Technical)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Machines | `/api/machines` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Machine Systems | `/api/machine-systems` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD |
| Machine Activity Reports | `/api/machine-activity-reports` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD |
| System Operations | `/api/system-operations` | Tất cả (theo role) | Tất cả | Tất cả | ADMIN, DEPT_HEAD |
| Repair Requests | `/api/repair-requests` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD, EMPLOYEE | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD |
| Acceptance Handovers | `/api/acceptance-handovers` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD |

### 4.8 Chất lượng (Quality)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Processes | `/api/processes` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Internal Inspections | `/api/internal-inspections` | Tất cả authenticated | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD |
| Material Standards | `/api/material-standards` | Tất cả authenticated | ADMIN, DEPT_HEAD, TEAM_LEAD | ADMIN, DEPT_HEAD | ADMIN |
| Material Evaluations | `/api/material-evaluations` | Tất cả (theo role) | Tất cả | Tất cả | ADMIN, DEPT_HEAD |
| Material Eval Criteria | `/api/material-evaluation-criteria` | Tất cả (theo role) | ADMIN, DEPT_HEAD | ADMIN, DEPT_HEAD | ADMIN |
| Quality Evaluations | `/api/quality-evaluations` | Tất cả authenticated | — | — | — |
| Quotation Calculator | `/api/quotation-calculators` | Tất cả authenticated | — | — | — |

### 4.9 Tổng hợp (General)

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Work Plans | `/api/work-plans` | Tất cả authenticated | — | ADMIN, DEPT_HEAD | — |
| Tasks | `/api/tasks` | Tất cả authenticated | — | — | — |
| Private Feedbacks | `/api/private-feedbacks` | Tất cả authenticated | — | — | — |

### 4.10 Hệ thống chung

| API | Endpoint | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|-----|----------|-----------|------------|------------|--------------|
| Auth | `/api/auth` | Public (login/register) | Public | — | — |
| Notifications | `/api/notifications` | Tất cả authenticated | — | — | — |
| Login History | `/api/login-history` | Tất cả authenticated | — | — | — |
| Chat | `/api/chat` | Tất cả authenticated | Tất cả | — | — |
| Agent (AI) | `/api/agent` | Tất cả authenticated | Tất cả | — | — |

---

## 5. Cơ Chế Bảo Mật (3 Lớp)

```
Request → authenticate (JWT) → authorize (RBAC) → checkAccess (ABAC) → Controller
```

| Lớp | Middleware | Chức năng | Áp dụng |
|-----|-----------|-----------|---------|
| 1 | `authenticate` | Xác thực JWT token | Tất cả routes (trừ auth) |
| 2 | `authorize(...roles)` | Kiểm tra role có trong whitelist | Write operations |
| 3 | `checkAccess({...})` | Kiểm tra department/sub-department | Routes cần ABAC (HR, payroll, evaluation) |

### Quy tắc ADMIN bypass:
- ADMIN luôn pass `authorize` (vì role nằm trong whitelist)
- ADMIN luôn pass `checkAccess` (kiểm tra `req.user.role === 'ADMIN'` → `next()` ngay)
- ADMIN truy cập được tất cả module trên frontend

---

## 6. Frontend Guards (2 Lớp)

| Guard | Component | Chức năng |
|-------|-----------|-----------|
| Module-level | `ProtectedModuleRoute` | Kiểm tra `hasModuleAccess(module, role, department, secondaryDepts)` |
| Sub-module-level | `ProtectedSubRoute` | Kiểm tra `hasSubModuleAccess(dept, subModule, ...)` |

### Logic truy cập sub-module:
1. **ADMIN** → luôn pass
2. **DEPARTMENT_HEAD / TEAM_LEAD** trong đúng department → xem tất cả sub-modules
3. **EMPLOYEE** trong đúng department → chỉ xem sub-module mình thuộc về
4. **Secondary department** → áp dụng cùng logic với role được gán trong secondary entry

---

## 7. Tóm Tắt Quyền Theo Vai Trò

### ADMIN
- Toàn quyền CRUD trên mọi module
- Quản lý users, system settings, face attendance
- Bypass mọi kiểm tra ABAC
- Xem dashboard toàn công ty

### DEPARTMENT_HEAD
- Tạo/sửa dữ liệu nghiệp vụ trong phòng ban
- Duyệt đánh giá, bảng lương
- Quản lý nhân viên (tạo/sửa, không xóa)
- Xem tất cả sub-modules trong phòng ban

### TEAM_LEAD
- Tạo/sửa một số dữ liệu (purchase requests, warehouse receipts/issues, daily reports, machine reports)
- Tạo kiểm tra chất lượng
- Xem tất cả sub-modules trong phòng ban
- Không được xóa dữ liệu

### EMPLOYEE
- Xem dữ liệu (read-only phần lớn)
- Tạo yêu cầu báo giá, đánh giá vật liệu, báo cáo công việc
- Tự đánh giá bản thân
- Chỉ xem sub-module mình thuộc về
- Không được tạo/sửa/xóa dữ liệu master

---

## 8. Test Accounts (Development)

| Email | Password | Role | Department |
|-------|----------|------|------------|
| `admin@example.com` | `admin123` | ADMIN | General |
| `office1@example.com` | `office1123` | EMPLOYEE | General |
| `office2@example.com` | `office2123` | EMPLOYEE | General |
| `nguyễnvăn a@example.com` | `employee123` | EMPLOYEE | General |
| `trầnthị b@example.com` | `employee123` | EMPLOYEE | Quality |
| `lêvăn c@example.com` | `employee123` | EMPLOYEE | Business |
| `phạmthị d@example.com` | `employee123` | EMPLOYEE | Accounting |
| `hoàngvăn e@example.com` | `employee123` | EMPLOYEE | Purchasing |
| `vũthị f@example.com` | `employee123` | EMPLOYEE | Production |
| `đặngvăn g@example.com` | `employee123` | EMPLOYEE | Technical |
