# Capability: position-rule-crud — Quản trị Rule theo Chức vụ

## Purpose

Chuẩn hoá quy tắc cho từng chức vụ (Position) — cho phép thêm/sửa/xóa quyền gắn với Position thay vì chỉ UserRole 4 bậc, đồng thời hỗ trợ nhiều Position/Department trên một user. Quy tắc mặc định: `CREATE/READ/UPDATE/EXPORT/IMPORT` mọi nhân viên được thao tác; `APPROVE/REJECT` chỉ TEAM_LEAD+; `DELETE` chỉ Trưởng phòng — xem REQ-RBAC-006..009; Rule theo Position dùng để override baseline khi cần siết/nới.

> Scope phase 1: chỉ `Position`, chưa `PositionLevel`. `PositionLevel` để phase 2.

## Requirements

### REQ-POS-001: Rule gắn với Position

- Hệ thống SHALL cho phép tạo Rule gắn với `positionId` (ví dụ: "Kế toán trưởng", "Kỹ sư QLHTM", "Nhân viên kho").
- Rule ở cấp Position SHALL được đánh giá trước Rule ở cấp UserRole khi cùng scope; và Rule ở cấp Position SHALL override baseline REQ-RBAC-006 (bao gồm siết `APPROVE` hoặc nới `DELETE`).

**Scenarios:**
- WHEN admin tạo Rule `Position=Kế toán viên, Resource=invoices, Action=APPROVE, allow=false, scope=DEPARTMENT(Accounting)` để siết duyệt (EMPLOYEE vốn đã deny APPROVE theo baseline, Rule này là explicit) THEN user "Kế toán viên" vẫn deny — không đổi, nhưng Rule được ghi nhận cho audit và UI hiển thị `deny (explicit)` thay vì `baseline-deny`.
- WHEN admin tạo Rule `Position=Kế toán viên, Resource=invoices, Action=APPROVE, allow=true, scope=DEPARTMENT(Accounting)` để nới duyệt cho Kế toán viên THEN user "Kế toán viên" SHALL được `POST /api/invoices/:id/approve` dù baseline deny — Rule nới thắng baseline (UI SHALL show warning khi nới APPROVE cho EMPLOYEE).
- WHEN chưa có Rule nào cho `Position=Kế toán viên` với `READ invoices` THEN user SHALL vẫn được `GET /api/invoices` theo baseline `READ = baseline-allow`.

### REQ-POS-002: Mapping mặc định Position → UserRole

- Hệ thống SHALL lưu mapping `Position.defaultRole` hoặc bảng cấu hình `PositionRoleMapping` để suy ra UserRole mặc định cho mỗi Position khi chưa có Rule riêng.
- Mapping này SHALL được seed từ dữ liệu hiện có và cho phép admin sửa qua UI.
- Khi `User.role` (trên `auth.User`) và `Position.defaultRole` khác nhau, Rule engine SHALL ưu tiên `Position.defaultRole` cho Rule lookup và cho baseline REQ-RBAC-006 (ví dụ: `APPROVE` check TEAM_LEAD+ dựa trên `Position.defaultRole`), nhưng `User.role` vẫn giữ cho ADMIN bypass check.

**Scenarios:**
- WHEN Position "Trưởng phòng" chưa có Rule nào cho `READ orders` nhưng mapping của nó là `DEPARTMENT_HEAD` và tồn tại Rule `DEPARTMENT_HEAD + READ orders = allow` ở cấp GLOBAL THEN user có Position đó SHALL được allow.
- WHEN `User.role=EMPLOYEE` nhưng `Position.defaultRole=DEPARTMENT_HEAD` (lệch do backfill) và user gọi `DELETE` THEN `DELETE` SHALL được allow theo `Position.defaultRole` (đã là Trưởng phòng về nghiệp vụ) — `APPROVE` cũng allow.

### REQ-POS-003: Hỗ trợ UserSecondaryDepartment với Position khác nhau

- Mỗi `UserSecondaryDepartment` row đã có `role` riêng; hệ thống SHALL mở rộng để lưu `positionId` (nếu thiếu) cho secondary, và Rule engine SHALL đánh giá quyền trên từng secondary position.
- User được allow nếu **bất kỳ** position nào (primary hoặc secondary) cho phép — áp dụng cho cả baseline (REQ-RBAC-006) lẫn Rule explicit, owner-scope và delegation; deny ở scope hẹp vẫn thắng.

**Scenarios:**
- WHEN user có primary `Position=Nhân viên KD (BUSINESS, EMPLOYEE)` và secondary `Position=Kỹ sư QLHTM (TECHNICAL/QLHTM, TEAM_LEAD)` THEN `POST /api/machine-systems/:id/approve` SHALL được allow qua secondary `TEAM_LEAD` (APPROVE baseline cho TEAM_LEAD+) dù primary là EMPLOYEE.
- WHEN user `EMPLOYEE/Production` (primary) có secondary `DEPARTMENT_HEAD/Warehouse` THEN `DELETE /api/warehouse-receipts/:id` (không phải owner) SHALL được allow qua secondary DEPARTMENT_HEAD dù primary là EMPLOYEE.

### REQ-POS-004: Ma trận Position × Resource × Action

- Hệ thống SHALL cung cấp `GET /api/rules/matrix?positionId=&departmentId=` trả về ma trận đầy đủ kèm trạng thái `allow | deny | baseline-allow | baseline-deny | owner | delegated | inherit | none` cho mỗi ô (baseline theo REQ-RBAC-006..007, delegated theo REQ-RBAC-009).
- UI quản trị SHALL render ma trận này dạng bảng có filter theo Position, Department, Resource. UI SHALL show warning khi admin tạo Rule nới quyền nguy hiểm (`DELETE` cho EMPLOYEE/TEAM_LEAD, `APPROVE` cho EMPLOYEE).

**Scenarios:**
- WHEN admin mở trang quản trị Rule và chọn `Position = Kỹ sư cơ khí (TEAM_LEAD), Department = Technical/Mechanical` chưa có Rule nào THEN UI SHALL hiển thị `CREATE/READ/UPDATE/EXPORT/IMPORT = baseline-allow`, `APPROVE/REJECT = baseline-allow` (TEAM_LEAD được duyệt), `DELETE = baseline-deny` (chỉ DEPARTMENT_HEAD).
- WHEN admin mở `Position = Nhân viên kho (EMPLOYEE), Department = Production/Warehouse` chưa có Rule THEN UI SHALL hiển thị `APPROVE/REJECT = baseline-deny` (EMPLOYEE không được duyệt), `DELETE = baseline-deny`.
- WHEN admin đã tạo Rule `Kỹ sư cơ khí + machineSystems + DELETE = allow` ở scope `Technical/Mechanical` THEN UI SHALL hiển thị ô `DELETE machineSystems` là `allow (override)` highlight khác với `baseline-deny`.

### REQ-POS-005: Đồng bộ với PositionResponsibility (tiêu chí đánh giá)

- Rule theo Position SHOULD tham chiếu được tới `PositionResponsibility` khi cần (ví dụ: chỉ người có trách nhiệm "Audit nội bộ" mới được `APPROVE qualityChecks`).
- Đây là ràng buộc mềm — không bắt buộc cho MVP, nhưng schema SHALL dự phòng field `responsibilityId` nullable trên Rule.

**Scenarios:**
- WHEN Rule có `responsibilityId` trỏ tới "Audit nội bộ" THEN chỉ user có Position chứa Responsibility đó (qua `PositionResponsibility` relation) mới thoả Rule, ngoài việc thoả Position check.

### REQ-POS-006: Bao phủ toàn bộ Position hiện có

- Hệ thống SHALL đảm bảo mọi `Position` đang có trong DB (hiện 30+ mã `POS_001..`) đều có baseline REQ-RBAC-006..009 áp dụng ngay — không cần tạo Rule thủ công cho từng Position để "kích hoạt" quyền cơ bản.
- Trang quản trị SHALL hiển thị danh sách Position chưa có Rule riêng với trạng thái `baseline` để admin biết đang chạy mặc định.

**Scenarios:**
- WHEN hệ thống vừa migration xong chưa có Rule nào được tạo thủ công THEN mọi user với Position bất kỳ SHALL vẫn thao tác được endpoint thuộc phòng ban của mình theo baseline (`CREATE/READ/UPDATE/EXPORT/IMPORT` allow; `APPROVE/REJECT` chỉ TEAM_LEAD+; `DELETE` chỉ DEPARTMENT_HEAD; owner vẫn UPDATE/DELETE bản ghi của mình; delegation nếu có vẫn hiệu lực), không bị deny-all.

### REQ-POS-007: Ủy quyền theo Position

- Delegation (REQ-RBAC-009) SHALL được tạo/thu hồi ở cấp Position: `fromUser` ủy quyền cho `toUser` theo `(resource, action, scope)`; `toUser` không cần cùng Position với `fromUser`, nhưng scope SHALL thuộc phòng ban của `fromUser` (không ủy quyền cross-department ngoài phạm vi của mình).
- UI quản trị SHALL cho phép Trưởng phòng/ADMIN tạo delegation với picker `toUser`, `resource`, `action`, `from/to` date; danh sách delegation active SHALL hiển thị ở trang quản trị Rule.

**Scenarios:**
- WHEN `Trưởng phòng Accounting (DEPARTMENT_HEAD)` ủy quyền `APPROVE invoices` cho `Nhân viên Accounting (EMPLOYEE)` từ `2026-09-01` đến `2026-09-07` THEN trong khoảng đó `EMPLOYEE` SHALL được `APPROVE` dù baseline deny cho EMPLOYEE; sau hạn SHALL lại deny.
- WHEN `EMPLOYEE` cố ủy quyền cho người khác THEN hệ thống SHALL deny `403` (chỉ DEPARTMENT_HEAD/ADMIN được ủy quyền).
