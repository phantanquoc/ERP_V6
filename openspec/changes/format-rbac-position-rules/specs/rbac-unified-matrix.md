# Capability: rbac-unified-matrix — Ma trận Rule hợp nhất

## Purpose

Hợp nhất 3 nguồn sự thật đang rời rạc (bảng Permission/ResourceType trong DB, hard-code `authorize()` trong routes, hard-code `DEPARTMENTS` trong frontend) thành một Rule Matrix duy nhất lấy Position làm trục chính, Department/SubDepartment làm trục phạm vi.

## Requirements

### REQ-RBAC-001: Rule Matrix là nguồn sự thật duy nhất

- Hệ thống SHALL lưu toàn bộ quyền dưới dạng bản ghi `Rule` trong DB thay vì hard-code.
- Mỗi `Rule` xác định: **ai** (Position hoặc UserRole, scoped tới Department/SubDepartment), **được làm gì** (Resource + Action), và **hiệu lực** (allow/deny, isActive).
- Hệ thống SHALL hỗ trợ **deny override allow** khi có xung đột ở cùng (resource, action, scope) — explicit deny thắng. Giữa các scope khác nhau, scope hẹp hơn thắng scope rộng hơn (chi tiết ở REQ-RBAC-005).
- Unique key của Rule là `(resourceCode, action, scope, scopeId, positionId, role)` — mỗi ô chỉ một Rule; xung đột deny/allow xảy ra giữa các scope/position khác nhau, không phải giữa hai Rule cùng ô.

**Scenarios:**
- WHEN admin tạo một Rule mới (`Position = Kế toán trưởng, Resource = invoices, Action = APPROVE, allow = true`) THEN hệ thống SHALL lưu Rule vào DB, ghi audit log, và cache SHALL được invalidate để request tiếp theo thấy quyền mới.
- WHEN tồn tại `allow=true` ở scope `DEPARTMENT(Production)` và `allow=false` ở scope `SUB_DEPARTMENT(Warehouse)` cho cùng (position, resource, action) THEN hệ thống SHALL áp dụng **deny** của Warehouse (scope hẹp thắng).
- WHEN tồn tại `allow=true` và `allow=false` ở **cùng scope và cùng ô** THEN hệ thống SHALL từ chối tạo Rule thứ hai (`409 Conflict`) — mỗi ô chỉ một Rule; muốn đổi phải UPDATE `allow`.

### REQ-RBAC-002: Resource phủ đủ API surface

- Hệ thống SHALL duy trì bảng `Resource` (code, label, group) phủ đủ tập resource suy từ `ROUTE_MAP` (hiện ~82 keys; seed ≥60 business resources, loại trừ `auditLog/docs/myHistory`).
- Thêm resource mới SHALL chỉ cần thêm row trong `Resource`, không đụng code.
- Hệ thống SHALL cung cấp endpoint `GET /api/resources` liệt kê toàn bộ resource + action khả dụng.

**Scenarios:**
- WHEN hệ thống khởi động lần đầu sau migration THEN `GET /api/resources` SHALL trả về danh sách ≥60 resource, mỗi resource kèm danh sách action (`CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, EXPORT, IMPORT`).

### REQ-RBAC-003: Action chuẩn hoá với PermissionAction hiện có

- Hệ thống SHALL giữ nguyên 8 `PermissionAction` hiện tại (`CREATE, READ, UPDATE, DELETE, APPROVE, REJECT, EXPORT, IMPORT`) và cho phép mở rộng bằng seed, không hard-code enum trong middleware.
- Seed legacy: mỗi `authorize('ADMIN', 'DEPARTMENT_HEAD')` trên một route/method SHALL được chuyển thành Rule cho **`action` suy từ HTTP method của route đó** trên **`resource` suy từ ROUTE_MAP key** — ví dụ `DELETE /api/invoices/:id` với `authorize('ADMIN')` → `Rule(ADMIN, invoices, DELETE, allow=true)`, **không** phải `*/*`. Chỉ seed `*/*` khi route thực sự không giới hạn resource.

**Scenarios:**
- WHEN seed script chạy trên `POST /api/invoices` với `authorize(ADMIN, DEPARTMENT_HEAD)` THEN hệ thống SHALL tạo 2 Rules cho `CREATE` trên `Resource=invoices` (scope GLOBAL), không tạo `*/*`.

### REQ-RBAC-004: Phân cấp kế thừa Position ← UserRole

- Mỗi `Position` SHALL kế thừa tập rule mặc định của `UserRole` tương ứng (EMPLOYEE/TEAM_LEAD/DEPARTMENT_HEAD) theo mapping cấu hình (ví dụ: `Trưởng phòng → DEPARTMENT_HEAD`, `Nhân viên → EMPLOYEE`).
- Rule cấp Position SHALL override rule cấp Role khi cùng (resource, action, scope).

**Scenarios:**
- WHEN user có `Position = Trưởng phòng Kinh doanh` (map tới `DEPARTMENT_HEAD`) và tồn tại Rule ở cấp `DEPARTMENT_HEAD` cho `READ orders = allow` nhưng Rule ở cấp `Position` cho `READ orders = deny` trong cùng department THEN request `GET /api/orders` của user SHALL bị deny.

### REQ-RBAC-005: Scope theo Department/SubDepartment

- Mỗi Rule SHALL có scope: `GLOBAL` (toàn hệ thống), `DEPARTMENT` (theo `departmentId`), hoặc `SUB_DEPARTMENT` (theo `subDepartmentId`). Khi `scope=DEPARTMENT` thì `departmentId` NOT NULL và `subDepartmentId` NULL; khi `scope=SUB_DEPARTMENT` thì `subDepartmentId` NOT NULL; khi `scope=GLOBAL` thì cả hai NULL.
- Rule scoped hẹp hơn SHALL override rule scoped rộng hơn.
- User có `UserSecondaryDepartment` SHALL được đánh giá quyền trên **tất cả** department mà họ thuộc về (primary + secondary), cho phép nếu bất kỳ scope nào cho phép và không có deny ở scope hẹp tương ứng.

**Scenarios:**
- WHEN SubDepartment `Warehouse` (thuộc `Production`) không có Rule cho `READ warehouseReceipts`, nhưng Department `Production` có `allow=true` THEN user thuộc `Warehouse` SHALL được `GET /api/warehouse-receipts` (kế thừa).
- WHEN user thuộc `Production` (primary) và `Technical/QLHTM` (secondary với Position = Kỹ sư QLHTM) THEN `GET /api/machine-systems` trong scope `Technical` SHALL được allow nếu Rule cho Position đó allow, dù primary department không có quyền.

### REQ-RBAC-006: Quy tắc mặc định theo phòng ban — baseline phân tầng

- **Baseline mặc định** (khi chưa có Rule riêng override), trong phạm vi phòng ban của mình:
  - `CREATE, READ, UPDATE, EXPORT, IMPORT` — **mọi nhân viên** (`EMPLOYEE, TEAM_LEAD, DEPARTMENT_HEAD`) đều được thực thi.
  - `APPROVE, REJECT` — chỉ `TEAM_LEAD` trở lên (`TEAM_LEAD, DEPARTMENT_HEAD, ADMIN`); `EMPLOYEE` mặc định **deny** (tránh lỗ hổng phê duyệt — mọi nhân viên đều duyệt được là sai chuẩn ERP).
  - `DELETE` — chỉ `DEPARTMENT_HEAD` và `ADMIN`; `EMPLOYEE` và `TEAM_LEAD` mặc định **deny**.
- Ngoài phạm vi phòng ban của mình: mặc định **deny** trừ khi có Rule `GLOBAL` hoặc `UserSecondaryDepartment` cho phép.
- Thứ tự đánh giá: `Delegation (REQ-RBAC-009) → Rule explicit → Owner-scope (REQ-RBAC-007) → Baseline (REQ-RBAC-006) → Data-permission filter (REQ-RBAC-008)`. Rule explicit thắng baseline; owner-scope là ngoại lệ cho `UPDATE/DELETE` trên bản ghi do mình tạo.
- `ADMIN` SHALL bypass toàn bộ baseline (toàn quyền trên mọi resource/action, mọi scope) — giữ hành vi hiện tại; có thể cấu hình `adminStrictMode` để ADMIN cũng chịu Rule nếu cần granular scoping.
- Tài nguyên **không thuộc phòng ban nào** (ví dụ: `auditLog`, `resources` meta) SHALL mặc định deny-all trừ `ADMIN` (hoặc role có Rule GLOBAL explicit).

**Scenarios:**
- WHEN user `EMPLOYEE/Accounting` gửi `GET /api/invoices` (thuộc Accounting) và chưa có Rule override THEN hệ thống SHALL allow (`READ` thuộc nhóm mọi nhân viên).
- WHEN cùng user `EMPLOYEE/Accounting` gửi `POST /api/invoices/:id/approve` và chưa có Rule override THEN hệ thống SHALL deny `403` (`APPROVE` chỉ TEAM_LEAD+).
- WHEN user `TEAM_LEAD/Accounting` gửi `POST /api/invoices/:id/approve` và chưa có Rule override THEN hệ thống SHALL allow (`TEAM_LEAD` được APPROVE theo baseline).
- WHEN user `EMPLOYEE/Accounting` gửi `DELETE /api/invoices/:id` và chưa có Rule override, bản ghi **không** do họ tạo THEN hệ thống SHALL deny `403` (DELETE chỉ Trưởng phòng).
- WHEN user `DEPARTMENT_HEAD/Accounting` gửi `DELETE /api/invoices/:id` và chưa có Rule override THEN hệ thống SHALL allow.
- WHEN admin tạo Rule `Position=Kế toán viên, Resource=invoices, Action=APPROVE, allow=true, scope=DEPARTMENT(Accounting)` để nới duyệt cho Kế toán viên THEN user `Kế toán viên` SHALL được `APPROVE invoices` dù baseline deny — Rule override thắng baseline.
- WHEN admin tạo Rule `Position=Kế toán viên, Resource=invoices, Action=APPROVE, allow=false, scope=DEPARTMENT(Accounting)` để siết (đã mặc định deny, Rule này là explicit) THEN user `Kế toán viên` vẫn deny — không đổi, nhưng Rule explicit được ghi nhận cho audit.
- WHEN `EMPLOYEE/Production` cố gọi `GET /api/invoices` (thuộc Accounting, không phải phòng ban của mình) và không có Rule GLOBAL/secondary cho phép THEN hệ thống SHALL deny.

### REQ-RBAC-007: Owner-scope — người tạo được sửa/xóa bản ghi của mình

- Người tạo bản ghi (`createdById == userId` hoặc `createdBy == userId` tùy resource) SHALL được `UPDATE` và `DELETE` bản ghi do chính mình tạo trong phạm vi phòng ban, kể cả khi role là `EMPLOYEE` (ngoại lệ cho baseline DELETE/APPROVE ở REQ-RBAC-006).
- Owner-scope SHALL chỉ áp dụng khi bản ghi thuộc resource có trường `createdById/createdBy` và thuộc phòng ban của user; không áp dụng cho cross-department.
- Thứ tự: owner-scope được đánh giá **sau** Rule explicit nhưng **trước** baseline — Rule explicit `deny` vẫn thắng owner-scope.

**Scenarios:**
- WHEN `EMPLOYEE/Accounting` tạo `Invoice #123` (`createdById = userId`) rồi gọi `DELETE /api/invoices/123` THEN hệ thống SHALL allow (owner-scope) dù baseline DELETE deny cho EMPLOYEE.
- WHEN `EMPLOYEE/Accounting` gọi `DELETE /api/invoices/999` do người khác tạo THEN hệ thống SHALL deny `403` (không phải owner, baseline DELETE deny).
- WHEN admin đã tạo Rule `EMPLOYEE + invoices + DELETE = deny` explicit ở scope `Accounting` và `EMPLOYEE` là owner của Invoice #123 THEN `DELETE /api/invoices/123` SHALL vẫn deny — Rule explicit deny thắng owner-scope.

### REQ-RBAC-008: Quyền dữ liệu (Data Permission) — service filter theo phòng ban

- Gate ở middleware (`requireRule`) chỉ quyết định **có được gọi endpoint không**; service/controller SHALL **filter dữ liệu trả về** theo `req.userDepartmentIds` đã resolve (primary + secondary), không chỉ dựa vào HTTP 403.
- Cross-department query SHALL trả về **rỗng** (200 với `data: []`) chứ không chỉ 403 ở middleware, để tránh lộ existence của dữ liệu ngoài phạm vi. Riêng `DELETE/UPDATE` trên bản ghi ngoài phạm vi SHALL trả `404` thay vì `403` để không lộ existence.
- `ADMIN` không bị filter dữ liệu.

**Scenarios:**
- WHEN `EMPLOYEE/Production` gọi `GET /api/invoices` (thuộc Accounting) và middleware đã deny do không thuộc phạm vi THEN response SHALL là `403`.
- WHEN `EMPLOYEE/Accounting` gọi `GET /api/invoices?search=HD001` và có quyền Accounting, service SHALL chỉ trả về invoices thuộc Accounting; invoice thuộc Production SHALL không xuất hiện dù search khớp.
- WHEN `EMPLOYEE/Accounting` gọi `PUT /api/invoices/999` với `999` thuộc Production (ngoài phạm vi) THEN hệ thống SHALL trả `404 Không tìm thấy` thay vì `403`.

### REQ-RBAC-009: Ủy quyền tạm thời (Delegation)

- Hệ thống SHALL cho phép `DEPARTMENT_HEAD` (hoặc `ADMIN`) ủy quyền một hoặc nhiều `(resource, action)` cho một user khác trong cùng phòng ban (hoặc phòng con) trong khoảng thời gian `[from, to]`.
- Delegation được lưu ở bảng `Delegation` (`id, fromUserId, toUserId, resourceCode, action, departmentId?, subDepartmentId?, from, to, isActive, createdBy, createdAt`), có thể scoped tới department/subDepartment.
- Rule engine SHALL check delegation **trước** baseline: nếu tồn tại delegation active (`isActive=true`, `now ∈ [from, to]`, `toUserId == currentUserId`, `resource/action` khớp, scope khớp phòng ban) THEN cho phép action đó dù baseline deny.
- Delegation SHALL có audit và tự hết hạn khi quá `to`; có thể thu hồi sớm bằng `isActive=false`.

**Scenarios:**
- WHEN `DEPARTMENT_HEAD/Accounting` ủy quyền `DELETE invoices` cho `TEAM_LEAD/Accounting` từ `2026-09-01` đến `2026-09-07` THEN trong khoảng đó `TEAM_LEAD` SHALL được `DELETE /api/invoices/:id` dù baseline deny; sau `2026-09-07` SHALL lại deny.
- WHEN delegation đã bị thu hồi (`isActive=false`) trước hạn THEN `TEAM_LEAD` SHALL deny ngay lập tức.
- WHEN delegation cho `DELETE invoices` ở scope `Accounting` nhưng `TEAM_LEAD` cố `DELETE` ở `Production` THEN SHALL deny (scope không khớp).
