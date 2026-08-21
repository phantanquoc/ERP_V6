# Báo cáo phân quyền theo Bộ phận — ERP An Bình Foods

> Ngày: 2026-08-21 · Nguồn: `auth.resources` (78) + `common.positions` (54) + `common.departments`/`sub_departments` + `auth.rules` + middleware `requireRule` (279 usages, 0 hard-code còn sót)

## Quy tắc mặc định (Baseline — áp dụng khi chưa có Rule riêng)

| Hành động | Ai được làm (trong phòng ban của mình) |
|-----------|----------------------------------------|
| `CREATE, READ, UPDATE, EXPORT, IMPORT` | **Mọi nhân viên** (`EMPLOYEE / TEAM_LEAD / DEPARTMENT_HEAD`) |
| `APPROVE, REJECT` | Chỉ **Tổ trưởng trở lên** (`TEAM_LEAD, DEPARTMENT_HEAD, ADMIN`); `EMPLOYEE` mặc định deny |
| `DELETE` | Chỉ **Trưởng phòng / Trưởng bộ phận** (`DEPARTMENT_HEAD, ADMIN`); `EMPLOYEE/TEAM_LEAD` deny |

- Ngoài phòng ban của mình: **deny**, trừ khi có Rule `GLOBAL` hoặc `UserSecondaryDepartment`.
- **ADMIN** bypass toàn bộ.
- **Ngoại lệ Owner-scope:** `createdById == userId` được `UPDATE/DELETE` bản ghi do chính mình tạo trong phòng ban (Rule explicit `deny` vẫn thắng owner).
- **Ủy quyền (Delegation):** Trưởng phòng ủy quyền `(resource, action, [from,to])` cho người khác; check trước baseline.

> Chú: 54 chức vụ đã có `Position.defaultRole` — `DEPARTMENT_HEAD` (9), `TEAM_LEAD` (1), `EMPLOYEE` (44). Role thực tế để tính baseline lấy từ `Position.defaultRole` nếu có, fallback `User.role`.

---

## Bộ phận: Kế toán (DEPT_ACCOUNTING)

**Phòng con:** Phòng KT Hành chính (`SUBDEPT_ACCOUNTING_ADMIN`), Phòng KT thuế (`SUBDEPT_ACCOUNTING_TAX`)
**Tài nguyên (6):** `invoices`, `debts`, `tax-reports`, `general-costs`, `export-costs`, `pricing-overview`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) | Ghi chú |
|------------|-------------------|-------------------------------|---------|
| `invoices` — Hóa đơn | `GET /api/invoices`, `POST /api/invoices`, `PUT /api/invoices/:id`, `DELETE /api/invoices/:id` | `CREATE/READ/UPDATE/EXPORT/IMPORT`: mọi nhân viên · `APPROVE/REJECT`: TEAM_LEAD+ · `DELETE`: chỉ Trưởng phòng/ADMIN | Owner được UPDATE/DELETE bản ghi của mình |
| `debts` — Công nợ | `GET /api/debts`, `POST /api/debts`, `PUT /api/debts/:id`, `DELETE /api/debts/:id` | Tương tự | |
| `tax-reports` — Báo cáo thuế | `GET /api/tax-reports`, `POST`, `PUT`, `DELETE` | Tương tự | Nhạy cảm — nên siết `APPROVE` chỉ `DEPARTMENT_HEAD` bằng Rule khi cần |
| `general-costs` — Chi phí chung | `GET /api/general-costs`, `POST`, `PUT`, `DELETE` | Tương tự | |
| `export-costs` — Chi phí xuất khẩu | `GET /api/export-costs`, `POST`, `PUT`, `DELETE` | Tương tự | |
| `pricing-overview` — Tổng quan giá | `GET /api/pricing/overview` | `READ`: mọi nhân viên | Chỉ đọc |

**Chức vụ liên quan:** `POS_018` Nhân viên kế toán (`EMPLOYEE`), `POS_019` Kế toán trưởng (`DEPARTMENT_HEAD`).

| Chức vụ | Role thực tế | Được làm gì (baseline) | DELETE? | APPROVE? |
|---------|-------------|------------------------|---------|----------|
| Nhân viên kế toán | EMPLOYEE | CREATE/READ/UPDATE/EXPORT/IMPORT trên 6 tài nguyên | Không (trừ bản ghi của mình) | Không |
| Kế toán trưởng | DEPARTMENT_HEAD | Toàn bộ 8 hành động | Có | Có |

---

## Bộ phận: Kinh doanh (DEPT_BUSINESS)

**Phòng con:** Phòng KD Quốc Tế (`SUBDEPT_BUSINESS_INTERNATIONAL`), Phòng KD Nội Địa (`SUBDEPT_BUSINESS_DOMESTIC`)
**Tài nguyên (7):** `orders`, `international-customers`, `international-products`, `quotation-requests`, `quotations`, `quotation-calculators`, `customer-feedbacks`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `orders` — Đơn hàng | `GET /api/orders`, `POST`, `PUT`, `DELETE` | Mọi NV: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `international-customers` | `GET/POST/PUT/DELETE /api/international-customers` | Tương tự |
| `international-products` | `GET/POST/PUT/DELETE /api/international-products` | Tương tự |
| `quotation-requests` | `GET/POST/PUT/DELETE /api/quotation-requests` | Tương tự |
| `quotations` — Báo giá | `GET/POST/PUT/DELETE /api/quotations` | Tương tự |
| `quotation-calculators` | `GET/POST/PUT/DELETE /api/quotation-calculators` | Tương tự |
| `customer-feedbacks` | `GET/POST/PUT/DELETE /api/customer-feedbacks` | Tương tự |

**Chức vụ liên quan:** `POS_015` Nhân viên kinh doanh, `POS_016` Nhân viên bán hàng, `POS_017` Nhân viên marketing (`EMPLOYEE`).

---

## Bộ phận: Thu mua (DEPT_PURCHASING)

**Phòng con:** Phòng thu mua NVL (`SUBDEPT_PURCHASING_MATERIALS`), Phòng mua Thiết bị (`SUBDEPT_PURCHASING_EQUIPMENT`)
**Tài nguyên (3):** `supply-requests`, `purchase-requests`, `suppliers`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `supply-requests` — Yêu cầu cung ứng | `GET/POST/PUT/DELETE /api/supply-requests` | Mọi NV: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `purchase-requests` — Yêu cầu mua hàng | `GET/POST/PUT/DELETE /api/purchase-requests` | Tương tự |
| `suppliers` — Nhà cung cấp | `GET/POST/PUT/DELETE /api/suppliers` | Tương tự |

**Chức vụ liên quan:** `POS_020` Nhân viên thu mua (`EMPLOYEE`), `POS_021` Trưởng nhóm thu mua (`DEPARTMENT_HEAD`).

---

## Bộ phận: Sản xuất (DEPT_PRODUCTION)

**Phòng con:** Phòng QLSX (`SUBDEPT_PRODUCTION_MANAGEMENT`), Quản lý kho (`SUBDEPT_PRODUCTION_WAREHOUSE`), Dữ liệu sản xuất (`SUBDEPT_PRODUCTION_DATA`)
**Tài nguyên (10):** `material-standards`, `processes`, `process-types`, `production-processes`, `system-operations`, `material-evaluations`, `material-evaluation-criteria`, `finished-products`, `quality-evaluations`, `production-reports`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `material-standards` — Định mức NVL | `GET/POST/PUT/DELETE /api/material-standards` | Mọi NV: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `processes` — Quy trình | `GET/POST/PUT/DELETE /api/processes` | Tương tự |
| `process-types` — Loại quy trình | `GET/POST/PUT/DELETE /api/process-types` | Tương tự |
| `production-processes` — Quy trình sản xuất | `GET/POST/PUT/DELETE /api/production-processes` | Tương tự |
| `system-operations` — Vận hành hệ thống | `GET/POST/PUT/DELETE /api/system-operations` | Tương tự |
| `material-evaluations` — Đánh giá NVL | `GET/POST/PUT/DELETE /api/material-evaluations` | Tương tự |
| `material-evaluation-criteria` | `GET/POST/PUT/DELETE /api/material-evaluation-criteria` | Tương tự |
| `finished-products` — Thành phẩm | `GET/POST/PUT/DELETE /api/finished-products` | Tương tự |
| `quality-evaluations` — Đánh giá chất lượng | `GET/POST/PUT/DELETE /api/quality-evaluations` | Tương tự |
| `production-reports` — Báo cáo sản xuất | `GET/POST/PUT/DELETE /api/production-reports` | Tương tự |

**Chức vụ liên quan:** `POS_008` Kỹ sư sản xuất, `POS_022` Nhân viên kho, `POS_023` Quản lý kho (`DEPARTMENT_HEAD`), `POS_040` Nhân viên vận hành máy, `POS_PROD_WORKER` Nhân viên sản xuất, `POS_041` Nhân viên giám sát (`TEAM_LEAD`).

---

## Bộ phận: Kho (thuộc Sản xuất — SUBDEPT_PRODUCTION_WAREHOUSE, tách riêng để rõ)

**Tài nguyên (8):** `warehouses`, `lots`, `lot-products`, `warehouse-receipts`, `warehouse-issues`, `warehouse-stock`, `inventory`, `reorder-rules`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `warehouses` — Kho | `GET/POST/PUT/DELETE /api/warehouses` | Mọi NV kho: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP kho: DELETE |
| `lots` — Lô | `GET/POST/PUT/DELETE /api/lots` | Tương tự |
| `lot-products` — Sản phẩm theo lô | `GET/POST/PUT/DELETE /api/lot-products` | Tương tự |
| `warehouse-receipts` — Phiếu nhập kho | `GET/POST/PUT/DELETE /api/warehouse-receipts` | Tương tự |
| `warehouse-issues` — Phiếu xuất kho | `GET/POST/PUT/DELETE /api/warehouse-issues` | Tương tự |
| `warehouse-stock` — Tồn kho | `POST /api/warehouse-stock/receive`, `POST /api/warehouse-stock/issue` | `CREATE`: mọi NV kho |
| `inventory` — Kiểm kê | `GET/POST/PUT/DELETE /api/inventory` | Tương tự |
| `reorder-rules` — Quy tắc đặt lại hàng | `GET/POST/PUT/DELETE /api/reorder-rules` | Tương tự |

**Chức vụ liên quan:** `POS_022` Nhân viên kho (`EMPLOYEE`), `POS_023` Quản lý kho (`DEPARTMENT_HEAD`), `POS_041` Nhân viên giám sát (`TEAM_LEAD`).

---

## Bộ phận: Kỹ thuật (DEPT_TECHNICAL)

**Phòng con:** Phòng đảm bảo và cải tiến (`SUBDEPT_TECHNICAL_QUALITY` — QLHTM), Phòng cơ-điện (chung), Phòng phát triển (`SUBDEPT_TECHNICAL_PROJECTS`)
**Tài nguyên (12):** `machine-status-logs`, `repair-requests`, `machine-systems`, `machine-system-details`, `fault-templates`, `fault-records`, `maintenance-templates`, `maintenance-plans`, `maintenance-records`, `spare-parts`, `acceptance-handovers`, `technical-summary`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `machine-status-logs` — Nhật ký trạng thái máy | `GET/POST/PUT/DELETE /api/machine-status-logs` | Mọi NV kỹ thuật: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `repair-requests` — Yêu cầu sửa chữa | `GET/POST/PUT/DELETE /api/repair-requests` | Tương tự |
| `machine-systems` — Hệ thống máy | `GET/POST/PUT/DELETE /api/machine-systems` | Tương tự |
| `machine-system-details` — Chi tiết hệ thống máy | `GET/POST/PUT/DELETE /api/machine-system-details` | Tương tự |
| `fault-templates` — Mẫu lỗi | `GET/POST/PUT/DELETE /api/fault-templates` | Tương tự |
| `fault-records` — Ghi nhận lỗi | `GET/POST/PUT/DELETE /api/fault-records` | Tương tự |
| `maintenance-templates` — Mẫu bảo trì | `GET/POST/PUT/DELETE /api/maintenance-templates` | Tương tự |
| `maintenance-plans` — Kế hoạch bảo trì | `GET/POST/PUT/DELETE /api/maintenance-plans` | Tương tự |
| `maintenance-records` — Ghi nhận bảo trì | `GET/POST/PUT/DELETE /api/maintenance-records` | Tương tự |
| `spare-parts` — Phụ tùng | `GET/POST/PUT/DELETE /api/spare-parts` | Tương tự |
| `acceptance-handovers` — Biên bản nghiệm thu | `GET/POST/PUT/DELETE /api/acceptance-handovers` | Tương tự |
| `technical-summary` — Tổng quan kỹ thuật | `GET /api/technical-summary` | `READ`: mọi NV kỹ thuật |

**Chức vụ liên quan:** `POS_009` Kỹ sư cơ khí, `POS_010` Kỹ sư điện, `POS_032` Nhân viên bảo trì, `POS_033` Thợ cơ khí, `POS_034` Thợ điện, `POS_035` Thợ hàn, `POS_036` Thợ lắp ráp.

---

## Bộ phận: Nhân sự / HR (DEPT_QUALITY — Phòng chất lượng nhân sự + các phòng ban chung)

> HR không có DEPT riêng — các tài nguyên nhân sự được gắn `group=hr` và thuộc phạm vi các phòng ban có liên quan (thường `DEPT_QUALITY/PERSONNEL` hoặc `ADMIN`).

**Tài nguyên (14):** `employees`, `departments`, `positions`, `position-responsibilities`, `position-levels`, `employee-evaluations`, `payrolls`, `attendances`, `attendance-codes`, `holidays`, `timesheet`, `work-shifts`, `overtime-plans`, `face-attendance`, `leave-requests`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `employees` — Nhân viên | `GET/POST/PUT/DELETE /api/employees` | Mọi NV HR: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `departments` — Phòng ban | `GET/POST/PATCH/DELETE /api/departments` | Tương tự (`public/all` không cần auth) |
| `positions` — Chức vụ | `GET/POST/PUT/DELETE /api/positions` | Tương tự |
| `position-responsibilities` — Tiêu chí đánh giá | `GET/POST/PUT/DELETE /api/position-responsibilities` | Tương tự |
| `position-levels` — Bậc chức vụ | `GET/POST/PUT/DELETE /api/position-levels` | Tương tự |
| `employee-evaluations` — Đánh giá nhân viên | `GET/POST/PUT/DELETE /api/employee-evaluations` | Tương tự (có ABAC theo phòng ban) |
| `payrolls` — Bảng lương | `GET/POST/PUT/DELETE /api/payrolls` | Tương tự — nhạy cảm, nên siết `READ` bằng Rule nếu cần |
| `attendances` — Chấm công | `GET/POST/PUT/DELETE /api/attendances` | Tương tự |
| `attendance-codes` — Mã chấm công | `GET/POST/PUT/DELETE /api/attendance-codes` | Tương tự |
| `holidays` — Ngày lễ | `GET/POST/PUT/DELETE /api/holidays` | Tương tự |
| `timesheet` — Bảng chấm công | `GET/POST/PUT/DELETE /api/timesheet` | Tương tự |
| `work-shifts` — Ca làm việc | `GET/POST/PUT/DELETE /api/work-shifts` | Tương tự |
| `overtime-plans` — Kế hoạch tăng ca | `GET/POST/PUT/DELETE /api/overtime-plans` | Tương tự |
| `face-attendance` — Chấm công khuôn mặt | `GET/POST/PUT/DELETE /api/face-attendance` | Tương tự |
| `leave-requests` — Đơn nghỉ phép | `GET/POST/PUT/DELETE /api/leave-requests` | Tương tự — `APPROVE/REJECT` chỉ TEAM_LEAD+ |

**Chức vụ liên quan:** `POS_026` Nhân viên hành chính, `POS_027` Nhân viên nhân sự, `POS_028` Trưởng nhóm nhân sự (`DEPARTMENT_HEAD`), `POS_041` Nhân viên giám sát (`TEAM_LEAD`).

---

## Bộ phận: Dự án (group=project)

**Tài nguyên (4):** `daily-work-reports`, `tasks`, `work-plans`, `projects`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `daily-work-reports` — Báo cáo công việc hàng ngày | `GET/POST/PUT/DELETE /api/daily-work-reports` | Mọi NV: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |
| `tasks` — Công việc | `GET/POST/PUT/DELETE /api/tasks` | Tương tự |
| `work-plans` — Kế hoạch công việc | `GET/POST/PUT/DELETE /api/work-plans` | Tương tự |
| `projects` — Dự án | `GET/POST/PUT/DELETE /api/projects` | Tương tự |

**Chức vụ liên quan:** `POS_014` Quản lý dự án, `POS_046` Nhân viên thiết kế, `POS_047` Nhân viên lập kế hoạch.

---

## Bộ phận: Chất lượng — Kiểm tra (DEPT_QUALITY)

**Tài nguyên (1 + HR chung):** `internal-inspections`

| Tài nguyên | Endpoint tiêu biểu | Hành động cho phép (baseline) |
|------------|-------------------|-------------------------------|
| `internal-inspections` — Kiểm tra nội bộ | `GET/POST/PUT/DELETE /api/internal-inspections` | Mọi NV chất lượng: CRU/EXPORT/IMPORT · TEAM_LEAD+: APPROVE · Chỉ TP: DELETE |

**Chức vụ liên quan:** `POS_007` Kỹ sư chất lượng, `POS_029` Nhân viên an toàn lao động, `POS_037` Nhân viên kiểm tra, `POS_QC_LEAD` Trưởng nhóm QC (`DEPARTMENT_HEAD`), `POS_QC_STAFF` Nhân viên QC.

---

## Bộ phận: Hệ thống / System (group=system) — ADMIN là chính

**Tài nguyên (12):** `auth`, `users`, `private-feedbacks`, `notifications`, `login-history`, `audit-logs`, `docs`, `system-settings`, `data-entry-page-positions`, `lookups`, `rules`, `kiosk`

| Tài nguyên | Endpoint tiêu biểu | Ai được làm |
|------------|-------------------|-------------|
| `auth` — Xác thực | `POST /api/auth/login`, `/register`, `/refresh` | Public (không cần auth) |
| `users` — Người dùng | `GET/POST/PUT/DELETE /api/users` | ADMIN; DEPARTMENT_HEAD được READ trong phòng ban |
| `private-feedbacks` — Góp ý riêng | `GET/POST/PUT/DELETE /api/private-feedbacks` | Mọi NV (trong phạm vi) |
| `notifications` — Thông báo | `GET /api/notifications` | Mọi NV |
| `login-history` — Lịch sử đăng nhập | `GET /api/login-history` | ADMIN/DEPARTMENT_HEAD |
| `audit-logs` — Nhật ký kiểm toán | `GET /api/audit-logs` | ADMIN/DEPARTMENT_HEAD |
| `docs` — Tài liệu | `GET /api/docs` | Mọi NV |
| `system-settings` — Cài đặt hệ thống | `GET/PUT /api/system-settings` | ADMIN |
| `data-entry-page-positions` — Phân quyền trang nhập liệu | `GET/POST/PUT/DELETE /api/data-entry-page-positions` | ADMIN |
| `lookups` — Danh mục dùng chung | `GET/POST/PUT/DELETE /api/lookups` | ADMIN (sửa label cascade) |
| `rules` — Quy tắc phân quyền | `GET /api/rules`, `POST/PATCH/DELETE /api/rules`, `GET /api/rules/my-permissions`, `GET /api/rules/matrix`, `GET /api/rules/audit-log`, delegations | `my-permissions`: mọi NV · `list/matrix`: ADMIN/DEPARTMENT_HEAD · `CREATE/UPDATE/DELETE`: ADMIN |
| `kiosk` — Kiosk | `GET /api/kiosk/attended-operators` | `deviceOrJwtAuth('DATA_ENTRY')` (thiết bị hoặc JWT) |

---

## Tổng hợp nhanh — Ai được làm gì (baseline)

| Vai trò thực tế (`Position.defaultRole` hoặc `User.role`) | CREATE | READ | UPDATE | DELETE | APPROVE | REJECT | EXPORT | IMPORT |
|------------------------------------------------------------|--------|------|--------|--------|---------|--------|--------|--------|
| **EMPLOYEE** (44 vị trí) | ✓ | ✓ | ✓ | ✗ (chỉ bản ghi của mình) | ✗ | ✗ | ✓ | ✓ |
| **TEAM_LEAD** (Nhân viên giám sát) | ✓ | ✓ | ✓ | ✗ (chỉ bản ghi của mình) | ✓ | ✓ | ✓ | ✓ |
| **DEPARTMENT_HEAD** (9 vị trí: Giám đốc, Phó GĐ, Trưởng phòng, Kế toán trưởng, Quản lý kho, ...) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

- ✓/✗ trên là **trong phòng ban của mình**; ngoài phòng ban: deny trừ khi có Rule `GLOBAL` hoặc kiêm nhiệm (`UserSecondaryDepartment`).
- **Ngoại lệ Owner:** mọi role được `UPDATE/DELETE` bản ghi do chính mình tạo (`createdById == userId`), trừ khi có Rule explicit `deny`.
- **Ủy quyền:** Trưởng phòng có thể ủy quyền `DELETE/APPROVE/...` cho người khác trong khoảng `[from,to]`.

> File này được sinh từ DB thực tế (`auth.resources`, `common.positions`, `common.departments`). Cập nhật khi thêm Resource/Position/Department mới.
