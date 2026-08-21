# Capability: department-rule-crud — Quản trị Rule theo Phòng ban

## Purpose

Cho phép thêm/sửa/xóa rule scoped theo Department và SubDepartment qua UI quản trị, có kế thừa và audit trail. Quy tắc mặc định: `CREATE/READ/UPDATE/EXPORT/IMPORT` mọi nhân viên được thao tác; `APPROVE/REJECT` chỉ TEAM_LEAD+; `DELETE` chỉ Trưởng phòng/Trưởng bộ phận — xem REQ-RBAC-006..009.

## Requirements

### REQ-DEPT-001: CRUD Rule scoped Department

- Hệ thống SHALL cho phép admin (hoặc role có quyền `Resource=rules, Action=UPDATE` — `MANAGE_RULES`) tạo/sửa/xóa Rule với scope `DEPARTMENT`, chọn `departmentId`, `resource`, `action`, `allow`, `isActive`.
- UI SHALL hiển thị ma trận Department × Resource × Action với các trạng thái `allow | deny | baseline-allow | baseline-deny | inherit | owner | delegated`. Ô chưa có Rule riêng SHALL hiển thị baseline (theo REQ-RBAC-006: `CREATE/READ/UPDATE/EXPORT/IMPORT = baseline-allow`, `APPROVE/REJECT = baseline-deny(EMPLOYEE)/baseline-allow(TEAM_LEAD+)`, `DELETE = baseline-deny(EMPLOYEE/TEAM_LEAD)/baseline-allow(DEPARTMENT_HEAD)`).

**Scenarios:**
- WHEN admin tạo Rule `Department=Production, Resource=productionProcesses, Action=UPDATE, allow=true` THEN `GET /api/rules?departmentId=<Production>` SHALL trả về Rule mới, và user thuộc Production SHALL được `PUT /api/production-processes/:id`.
- WHEN admin xem ma trận Department=Accounting chưa có Rule nào cho `READ invoices` THEN UI SHALL hiển thị ô `READ invoices` là `baseline-allow` (mọi nhân viên), còn `APPROVE invoices` là `baseline-deny(EMPLOYEE)/baseline-allow(TEAM_LEAD+)` và `DELETE invoices` là `baseline-deny(EMPLOYEE/TEAM_LEAD)`.

### REQ-DEPT-002: CRUD Rule scoped SubDepartment

- Hệ thống SHALL cho phép tạo Rule với scope `SUB_DEPARTMENT`, chọn `subDepartmentId`.
- Nếu không có Rule ở cấp SubDepartment, hệ thống SHALL fallback về Rule ở cấp Department cha; nếu cũng không có, fallback về baseline REQ-RBAC-006 (kèm owner-scope REQ-RBAC-007 và delegation REQ-RBAC-009 trước khi áp baseline).

**Scenarios:**
- WHEN SubDepartment `Warehouse` (thuộc `Production`) không có Rule cho `READ warehouseReceipts`, nhưng Department `Production` có Rule `allow=true` THEN user thuộc `Warehouse` SHALL được `GET /api/warehouse-receipts` (kế thừa Rule cha).
- WHEN cả `Warehouse` và `Production` đều không có Rule cho `READ warehouseReceipts` nhưng `warehouseReceipts` thuộc Production (phòng ban của user) THEN user SHALL vẫn được `GET` theo baseline `READ = baseline-allow`.

### REQ-DEPT-003: Kế thừa và override

- SubDepartment SHALL kế thừa toàn bộ Rule của Department cha trừ khi có Rule riêng override.
- Khi không có Rule nào ở cả hai cấp, thứ tự fallback SHALL là: `delegation → owner-scope → baseline` (REQ-RBAC-006..009).
- UI SHALL hiển thị trạng thái `inherited` cho Rule được kế thừa, `baseline-*` cho ô dùng mặc định, `owner` cho ô được phép do owner-scope, `delegated` cho ô được phép do ủy quyền, và cho phép override bằng cách tạo Rule mới ở cấp con.

**Scenarios:**
- WHEN admin override Rule `READ warehouseReceipts` ở cấp `Warehouse` thành `allow=false` trong khi Department `Production` đang `allow=true` THEN user thuộc `Warehouse` SHALL bị deny `GET /api/warehouse-receipts` dù user thuộc `Production/Management` vẫn được allow.
- WHEN `EMPLOYEE/Warehouse` là owner của `WarehouseReceipt #55` và không có Rule nào, baseline `DELETE` deny cho EMPLOYEE, nhưng owner-scope SHALL cho phép `DELETE /api/warehouse-receipts/55` (bản ghi do mình tạo).
- WHEN admin tạo Rule `DELETE warehouseReceipts, allow=true, scope=SUB_DEPARTMENT(Warehouse), positionId=TEAM_LEAD` để nới DELETE cho TEAM_LEAD ở kho THEN TEAM_LEAD/Warehouse SHALL được DELETE dù baseline deny.

### REQ-DEPT-004: Validation và guard

- Hệ thống SHALL từ chối tạo Rule trùng `(scope, scopeId, resource, action, positionId/role)` khi Rule đã tồn tại và đang active — mỗi ô chỉ một Rule; muốn đổi phải UPDATE `allow`.
- Baseline REQ-RBAC-006 (bao gồm `APPROVE/REJECT` chỉ TEAM_LEAD+ và `DELETE` chỉ DEPARTMENT_HEAD) SHALL được enforce ngay cả khi chưa có Rule nào cho action đó — đây là guard mặc định, không cần Rule explicit.
- Owner-scope (REQ-RBAC-007) và delegation (REQ-RBAC-009) là ngoại lệ cho baseline guard, nhưng Rule explicit `deny` vẫn thắng cả hai.
- Xóa Rule SHALL là soft-delete hoặc hard-delete kèm audit; Rule đã bị reference bởi active user session SHALL vẫn có hiệu lực tới khi cache hết hạn / re-login.

**Scenarios:**
- WHEN admin cố tạo Rule trùng với Rule active hiện có THEN API SHALL trả về `409 Conflict` với message `Rule đã tồn tại cho scope này`.
- WHEN chưa có Rule nào cho `DELETE /api/invoices/:id` và user `EMPLOYEE/Accounting` (không phải owner, không có delegation) gọi DELETE THEN hệ thống SHALL deny `403` do baseline guard.
- WHEN cùng `EMPLOYEE/Accounting` là owner của Invoice #123 và gọi `DELETE /api/invoices/123` THEN hệ thống SHALL allow do owner-scope, dù baseline deny.
- WHEN `TEAM_LEAD/Accounting` có delegation `APPROVE invoices` từ Trưởng phòng và gọi `POST /api/invoices/:id/approve` THEN hệ thống SHALL allow do delegation, dù baseline `APPROVE` đã allow cho TEAM_LEAD (không cần delegation nhưng vẫn hợp lệ).

### REQ-DEPT-005: Audit trail cho thay đổi Rule

- Mọi thêm/sửa/xóa Rule scoped Department/SubDepartment SHALL ghi `RuleAuditLog` (hoặc `AuditLog` với `entityType='Rule'`) với `actorId, action, before, after, createdAt`.
- `RuleAuditLog.action` SHALL là `CREATE | UPDATE | DELETE` (không dùng `UPDATE_LABEL` của Lookup).
- Hệ thống SHALL cung cấp `GET /api/rules/audit-log` cho admin xem lịch sử. Khi admin nới quyền theo hướng nguy hiểm (ví dụ: nới `DELETE` cho `EMPLOYEE` hoặc nới `APPROVE` cho `EMPLOYEE`), UI SHALL hiển thị warning "Bạn đang nới quyền <action> cho <role> — xác nhận?" trước khi lưu.

**Scenarios:**
- WHEN admin đổi `allow` của một Rule từ `true` sang `false` THEN `GET /api/rules/audit-log?ruleId=<id>` SHALL chứa entry `action=UPDATE` với `before.allow=true, after.allow=false`.
- WHEN admin tạo Rule `EMPLOYEE + invoices + DELETE = allow` (nới DELETE cho nhân viên) THEN UI SHALL show warning trước khi cho phép lưu; sau khi lưu, audit log SHALL ghi `action=CREATE` với `after.allow=true` để truy vết.
