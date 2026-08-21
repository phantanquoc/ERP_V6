# Capability: rule-enforcement-sync — Enforcement DB-driven + đồng bộ Frontend

## Purpose

Thay thế hard-code `authorize('ADMIN', ...)` trong ~82 route file bằng middleware DB-driven duy nhất (có cache), và đồng bộ frontend gating (sidebar/menu/button) về cùng nguồn Rule Matrix. Quy tắc mặc định: mọi nhân viên trong phòng ban đều được thao tác, DELETE chỉ Trưởng phòng/ADMIN — middleware enforce baseline này ngay cả khi chưa có Rule.

## Requirements

### REQ-ENF-001: Middleware authorize mới (DB-driven)

- Hệ thống SHALL thay thế `authorize(...roles)` hard-code bằng middleware mới `requireRule(resource, action)` (hoặc `authorize` phiên bản mới) đọc Rule Matrix từ DB. Thứ tự middleware trên route SHALL là `authenticate → requireRule(resource, action)` — `authenticate` giữ nguyên.
- Middleware SHALL resolve quyền theo thứ tự ưu tiên: `Position → UserRole` (trục ai), và trong mỗi cấp: `SUB_DEPARTMENT → DEPARTMENT → GLOBAL` (trục phạm vi); `PositionLevel` để phase 2. Deny override allow ở cùng scope; scope hẹp thắng scope rộng.
- Baseline REQ-RBAC-006 SHALL được enforce trong middleware ngay cả khi không có Rule nào: trong phạm vi phòng ban, mọi `EMPLOYEE/TEAM_LEAD/DEPARTMENT_HEAD` được allow mọi action trừ `DELETE`; `DELETE` chỉ `DEPARTMENT_HEAD/ADMIN`.
- ADMIN SHALL vẫn bypass toàn bộ (giữ hành vi hiện tại) nhưng có thể cấu hình `adminStrictMode` để ADMIN cũng chịu Rule nếu cần granular scoping.

**Scenarios:**
- WHEN request `DELETE /api/invoices/:id` đi qua `requireRule('invoices', 'DELETE')` và user là `EMPLOYEE/Accounting` chưa có Rule override THEN middleware SHALL trả về `403` do baseline DELETE guard.
- WHEN cùng request nhưng user là `DEPARTMENT_HEAD/Accounting` THEN middleware SHALL gọi `next()` theo baseline (cho phép DELETE).
- WHEN admin đã tạo Rule `EMPLOYEE/TEAM_LEAD + invoices + DELETE = allow` ở scope `Accounting` THEN `EMPLOYEE/Accounting` SHALL được `DELETE` — Rule explicit override baseline deny.
- WHEN không có Rule nào và `EMPLOYEE/Accounting` gọi `GET /api/invoices` THEN middleware SHALL gọi `next()` theo baseline allow.

### REQ-ENF-002: Cache và invalidation

- Rule Matrix SHALL được cache in-memory per-instance (Map + TTL 60s) keyed by `(resource, action)` → danh sách Rule rows; phase 2 nâng lên Redis nếu scale >1 replica (không đổi interface).
- Mọi thêm/sửa/xóa Rule SHALL invalidate cache ngay lập tức.

**Scenarios:**
- WHEN admin vừa đổi Rule và user gửi request ngay sau đó (trong cùng giây) THEN request SHALL thấy Rule mới (do invalidation), không phải chờ TTL.

### REQ-ENF-003: Tương thích ngược và migration hard-code → DB

- Hệ thống SHALL cung cấp script/migration quét toàn bộ `authorize()` hard-code hiện tại và seed thành Rule rows tương ứng trước khi bật enforcement mới. `action` suy từ HTTP method, `resource` suy từ ROUTE_MAP key — ví dụ `DELETE /api/invoices/:id` với `authorize('ADMIN')` → `Rule(ADMIN, invoices, DELETE, allow=true)`, không phải `*/*`.
- Script SHALL idempotent (upsert theo unique key `(resourceCode, action, scope, scopeId, positionId, role)`), có dry-run mode in ra số Rule sẽ tạo, chạy trong transaction, và có báo cáo "uncovered routes".
- Trong giai đoạn chuyển đổi, hệ thống SHALL hỗ trợ chế độ **dual-enforcement** (DB rule + hard-code fallback) để không làm gián đoạn; divergence SHALL được log vào `AuditLog` hoặc `logger.warn` với `{ ruleId, route, legacyAllow, dbAllow }`. Tắt fallback khi 7 ngày không còn divergence.

**Scenarios:**
- WHEN migration script chạy trên DB đã có dữ liệu THEN mỗi `authorize('ADMIN', 'DEPARTMENT_HEAD')` trên `POST /api/invoices` SHALL tạo 2 Rule cho `CREATE invoices` (1 cho ADMIN, 1 cho DEPARTMENT_HEAD) với scope GLOBAL, và không tạo duplicate nếu Rule đã tồn tại.

### REQ-ENF-004: Frontend đồng bộ — sidebar/menu/button gating

- Frontend SHALL gọi `GET /api/rules/my-permissions` (hoặc `GET /api/me/permissions`) trả về tập quyền của user hiện tại (theo Position + Department), và dùng để gating sidebar, menu, button thay vì `DEPARTMENTS` hard-code. `DELETE` button SHALL bị ẩn/disable cho `EMPLOYEE/TEAM_LEAD` theo baseline ngay cả khi chưa có Rule.
- `frontend/src/utils/permissions.ts` SHALL được refactor để đọc từ API (có fallback hard-code trong thời gian chuyển đổi) và expose helpers như `can(resource, action)` / `canAccessDepartment(dept)` suy từ Rule Matrix.

**Scenarios:**
- WHEN user đăng nhập với `Position = Nhân viên kho, Department = Production/Warehouse` và là `EMPLOYEE` THEN `GET /api/rules/my-permissions` SHALL chứa quyền warehouse resources với `DELETE=false` (baseline), sidebar SHALL hiển thị menu Production → Kho và nút Xóa SHALL bị ẩn.
- WHEN cùng user nhưng là `DEPARTMENT_HEAD/Warehouse` THEN `my-permissions` SHALL chứa `DELETE=true` và nút Xóa SHALL hiển thị.

### REQ-ENF-005: Đồng bộ ABAC (checkDepartment/checkSubDepartment)

- Middleware mới SHALL hợp nhất `checkAccess({ checkDepartment, checkSubDepartment })` vào cùng pipeline với Rule check — không còn 2 middleware rời. Khi Rule có scope `DEPARTMENT` hoặc `SUB_DEPARTMENT`, ABAC check SHALL được suy tự động từ scope, không cần truyền `checkDepartment: true` thủ công.
- Baseline REQ-RBAC-006 cũng là ABAC: user chỉ được thao tác resource thuộc phòng ban của mình (primary hoặc secondary), trừ khi có Rule GLOBAL cho phép cross-department.

**Scenarios:**
- WHEN Rule có `scope=SUB_DEPARTMENT, scopeId=<Warehouse>` cho `READ warehouseReceipts` THEN request `GET /api/warehouse-receipts` từ user không thuộc Warehouse SHALL bị deny ngay cả khi user có Position cho phép ở cấp GLOBAL — do scope check fail.
- WHEN `EMPLOYEE/Production` gọi `GET /api/invoices` (thuộc Accounting) và không có Rule GLOBAL/secondary cho phép THEN hệ thống SHALL deny do không thuộc phạm vi phòng ban (baseline ABAC).

### REQ-ENF-006: Không phá vỡ ROUTE_MAP và flow hiện tại

- `backend/src/routes/index.ts` (ROUTE_MAP) và thứ tự `Route → Controller → Service → Prisma` SHALL được giữ nguyên.
- Service layer SHALL không cần tự check role/department thủ công sau khi middleware đã enforce; chỉ giữ lại business rule thuần túy. Baseline DELETE guard đã xử lý ở middleware nên service không cần check lại.

**Scenarios:**
- WHEN một service trước đây tự check `if (user.role !== 'ADMIN')` để filter theo department THEN sau change, service SHALL nhận `req.userDepartmentIds` đã được middleware resolve và chỉ filter theo đó, không check role lại.
