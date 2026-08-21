# Proposal: Format lại toàn bộ Rule theo Phòng ban & Chức vụ

## Why

Hệ thống phân quyền hiện tại rời rạc trên 3 lớp không đồng bộ:

- **DB layer** có bảng `Role / Permission / RolePermission / ResourceType` nhưng chỉ 9 `ResourceType` cho ~80 API resource — Permission DB là dead code, route không hề đọc bảng này.
- **Backend route layer** hard-code `authorize('ADMIN', 'DEPARTMENT_HEAD', ...)` trong ~286 chỗ / 82 file route, mỗi resource tự quyết role, không có ma trận trung tâm. Thêm/sửa/xóa quyền phải đụng từng file.
- **Frontend layer** hard-code `DEPARTMENTS / SUB_DEPARTMENTS` và `DEPARTMENT_PERMISSIONS` trong `utils/permissions.ts`, tách rời bảng `Department / SubDepartment` trong DB — nguy cơ drift.
- **Position (30+ chức vụ, POS_001..POS_030+)** chỉ map tới trang nhập liệu (`DataEntryPagePosition`) mà không map tới quyền API. "Kế toán trưởng" và "Kế toán viên" cùng là `DEPARTMENT_HEAD/EMPLOYEE` nên có cùng quyền API dù trách nhiệm khác nhau.
- **ABAC** (`checkDepartment / checkSubDepartment`) chỉ được dùng ở đúng 1 route group (`employeeEvaluations`), toàn bộ route còn lại chỉ check role, bỏ qua ranh giới phòng ban.

Hệ quả: không thể "thêm / sửa / xóa" rule tập trung; không thể trả lời "chức vụ X được làm gì trong phòng ban Y"; không có audit trail cho thay đổi rule; ADMIN bypass tuyệt đối thiếu granular scoping.

Change này hợp nhất 3 nguồn sự thật thành một **Rule Matrix duy nhất** lấy **Position (chức vụ)** làm trục chính, **Department/SubDepartment** làm trục phạm vi, và đưa toàn bộ enforcement về DB-driven thay vì hard-code.

## Quy tắc mặc định (Default Rule)

Trong phạm vi phòng ban của mình:

- **Mọi nhân viên** (`EMPLOYEE / TEAM_LEAD / DEPARTMENT_HEAD`) đều được `CREATE, READ, UPDATE, EXPORT, IMPORT` trên tài nguyên thuộc phòng ban.
- **`APPROVE / REJECT` chỉ `TEAM_LEAD` trở lên** (`TEAM_LEAD, DEPARTMENT_HEAD, ADMIN`) — `EMPLOYEE` mặc định không được duyệt/từ chối (tránh lỗ hổng phê duyệt).
- **`DELETE` chỉ `DEPARTMENT_HEAD` và `ADMIN`**.
- **Owner-scope:** Người tạo bản ghi (`createdById == userId`) được `UPDATE/DELETE` bản ghi của chính mình trong phòng ban, kể cả khi role là `EMPLOYEE` (ngoại lệ cho DELETE baseline).

Ngoài phạm vi phòng ban của mình: mặc định **deny** trừ khi có Rule `GLOBAL` hoặc `UserSecondaryDepartment` cho phép.

Rule Matrix cho phép override toàn bộ baseline trên khi nghiệp vụ yêu cầu siết hoặc nới cho Position/Resource cụ thể, nhưng các mức mặc định trên là baseline khi chưa có Rule riêng. Chi tiết xem `REQ-RBAC-006` và `REQ-RBAC-007`.

Bổ sung P0 cho chuẩn ERP: **owner-scope**, **data-permission filter** (service filter theo `userDepartmentIds`), và **ủy quyền tạm thời (Delegation)** — xem `specs/rbac-unified-matrix.md` REQ-RBAC-007..009 và `specs/rule-enforcement-sync.md` REQ-ENF-005a/007.

## What Changes

- Hợp nhất mô hình quyền: mở rộng `ResourceType` (hoặc thay bằng `Rule`/`Policy` table mới) phủ đủ ~80 API resource, thay thế hard-code `authorize()` bằng middleware đọc Rule Matrix từ DB (có cache). Seed baseline tuân thủ quy tắc mặc định trên.
- Chuẩn hoá quy tắc theo **phòng ban**: CRUD rule scoped theo `Department` và `SubDepartment`, có UI quản trị, có phân cấp kế thừa (SubDepartment kế thừa + override rule của Department cha).
- Chuẩn hoá quy tắc theo **chức vụ**: mỗi `Position` có bộ rule riêng; Position kế thừa rule mặc định của `UserRole` (EMPLOYEE/TEAM_LEAD/DEPARTMENT_HEAD) rồi override theo nhu cầu nghiệp vụ. `PositionLevel` để phase 2. Hỗ trợ `UserSecondaryDepartment` (một người giữ nhiều phòng ban với Position khác nhau).
- Đồng bộ frontend `permissions.ts` về đọc Rule Matrix từ API thay vì hard-code object; sidebar/menu gating, button gating đều suy từ cùng một nguồn.
- Thêm audit trail cho mọi thêm/sửa/xoá rule (ai, khi nào, trước/sau).
- Migration & seed lại rule hiện tại từ hard-code scan thành dữ liệu Rule Matrix để không mất quyền hiện hữu.

## Capabilities

### New Capabilities
- `rbac-unified-matrix`: Mô hình Rule Matrix hợp nhất thay thế 3 nguồn sự thật rời rạc; bao gồm baseline mặc định (APPROVE chỉ TEAM_LEAD+, DELETE chỉ DEPARTMENT_HEAD), owner-scope, data-permission và delegation.
- `department-rule-crud`: Quản trị rule theo phòng ban / phòng con (thêm/sửa/xóa, kế thừa, phạm vi).
- `position-rule-crud`: Quản trị rule theo chức vụ (Position), mapping Position ↔ Department ↔ Resource ↔ Action; kế thừa baseline có owner-scope và delegation.
- `rule-enforcement-sync`: Middleware DB-driven + đồng bộ frontend, thay thế hard-code `authorize()`; enforce data-permission filter và delegation check.

### Modified Capabilities
- `lookup-audit-trail` (mở rộng): tái dùng pattern audit cho rule changes nếu phù hợp.
- `audit-log` (mở rộng): rule change events ghi vào `AuditLog` / `LookupChangeLog` style trail.

## Impact

- Database: Prisma schema — bảng `Rule`/`RuleScope` hoặc mở rộng `Permission/ResourceType` + bảng mapping `PositionRule`/`DepartmentRule`; migration baseline; index cho lookup `(positionId, departmentId, resource, action)`.
- Backend: service/controller/route cho Rule CRUD; middleware `authorize` mới (DB-driven, có fallback + cache); `ROUTE_MAP` giữ nguyên nhưng route handlers bỏ hard-code role list; seed/migration script chuyển hard-code hiện tại thành row trong Rule Matrix.
- Frontend: service types + TanStack Query hooks cho Rule API; `utils/permissions.ts` refactor đọc từ Rule Matrix; sidebar/menu/button gating theo rule thay vì `DEPARTMENTS` hard-code; trang quản trị Rule (Admin).
- Verification: `backend npx tsc --noEmit`, `backend npm run lint`, `backend npm test`, `frontend npx tsc --noEmit -p tsconfig.app.json`, `frontend npm run lint` — tất cả phải pass. Kiểm tra thủ công: user mỗi role/position/department chỉ thấy và chỉ gọi được API thuộc phạm vi của mình.
