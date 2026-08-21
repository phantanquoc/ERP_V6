# Design: Format lại toàn bộ Rule theo Phòng ban & Chức vụ

## Context

- Hệ thống hiện có 3 nguồn sự thật rời rạc cho phân quyền (bảng Permission/ResourceType chết, hard-code `authorize()` trong ~82 route files với ~286 call sites, hard-code `DEPARTMENTS` trong `frontend/src/utils/permissions.ts`). Position (30+ chức vụ) chỉ map tới trang nhập liệu, không map tới quyền API. ABAC chỉ dùng ở 1 route group.
- Mục tiêu: một Rule Matrix duy nhất, trục chính là Position, trục phạm vi là Department/SubDepartment, enforcement DB-driven có cache, frontend gating đồng bộ, có audit trail và migration không mất quyền hiện hữu.
- **Quy tắc mặc định (baseline):** Trong phạm vi phòng ban của mình, mọi nhân viên (EMPLOYEE/TEAM_LEAD/DEPARTMENT_HEAD) đều được thao tác endpoint thuộc tài nguyên của phòng ban — bao gồm `CREATE, READ, UPDATE, APPROVE, REJECT, EXPORT, IMPORT`. Riêng `DELETE` chỉ `DEPARTMENT_HEAD` và `ADMIN` được thực thi. Rule Matrix cho phép override baseline này khi cần siết/nới cho Position/Resource cụ thể.

## Decisions

### D1. Mô hình bảng: mở rộng Permission hay bảng Rule mới?

- **Chọn:** Bảng mới `Rule` (+ `RuleScope` enum hoặc field) thay vì mở rộng `Permission/RolePermission` hiện có.
- **Why:** `Permission` hiện tại gắn `Role.name` (string) và `ResourceType` chỉ 9 giá trị — sửa nó sẽ đụng toàn bộ seed/relation cũ và vẫn mang legacy shape. Bảng `Rule` mới cho phép shape đúng ngay từ đầu: `(positionId?, role?, departmentId?, subDepartmentId?, resource, action, allow, scope, isActive)` với index `(resource, action, scope, scopeId, positionId)` và migration quét hard-code thành rows mới không đụng bảng cũ.
- **Tradeoff:** Phải giữ `Role/Permission` cũ trong thời gian dual-enforcement rồi mới deprecate; bù lại không risk phá dữ liệu cũ.
- **Schema location:** `Rule` và `Resource` đặt ở `@@schema("auth")` (auth concern, gần `User/Role/Permission`), `RuleAuditLog` cùng schema.

### D2. Resource catalog: enum vs bảng Resource

- **Chọn:** Bảng `Resource` (id, code, label, group) seed từ scan ~80 API resources, thay vì mở rộng `enum ResourceType`.
- **Why:** Enum đòi migration mỗi khi thêm resource; bảng cho phép admin thêm resource qua seed/API mà không đụng schema. Middleware nhận `resourceCode` string và lookup trong cache.

### D3. Thứ tự ưu tiên khi resolve quyền

- **Chọn:** `Position > UserRole` (trục ai), trong mỗi cấp `SUB_DEPARTMENT > DEPARTMENT > GLOBAL` (trục phạm vi), deny override allow ở cùng scope, scope hẹp thắng scope rộng, `PositionLevel` để phase 2. Baseline REQ-RBAC-006 (mọi nhân viên allow trừ DELETE) được áp dụng khi không có Rule nào khớp — đây là fallback cuối cùng trước khi trả về deny.
- **Why:** Khớp với thực tế: Position là cụ thể nhất về "ai", SubDepartment là hẹp nhất về phạm vi. Baseline cho phép hệ thống chạy ngay sau migration mà không cần seed Rule cho từng Position. Deny-wins là an toàn mặc định.
- **Chi tiết đánh giá secondary department:** Primary + từng secondary được đánh giá độc lập theo cùng thứ tự ưu tiên; allow nếu bất kỳ scope nào allow và không có deny ở scope hẹp hơn.

### D4. Cache

- **Chọn:** In-memory cache (Map + TTL 60s) cho Rule Matrix, keyed by `(resource, action)` → danh sách Rule rows; invalidate toàn bộ cache sau mỗi Rule CRUD. Không dùng Redis ở phase 1.
- **Why:** Đủ cho single-instance / 2-instance hiện tại; tránh thêm infra. Có thể nâng lên Redis khi cần multi-instance scale mà không đổi interface.

### D5. Migration hard-code → DB

- **Chọn:** Script quét AST/regex toàn bộ `authorize(...)` trong `backend/src/routes/*.ts`, sinh Rule rows với scope GLOBAL cho từng role được liệt kê; `action` suy từ HTTP method, `resource` suy từ `ROUTE_MAP` key (không phải `*/*`). Route không có `authorize` → không sinh Rule (mặc định theo baseline REQ-RBAC-006). Script idempotent (upsert theo unique key `(resourceCode, action, scope, scopeId, positionId, role)`), có dry-run mode, chạy trong transaction, có báo cáo "uncovered routes".
- **Why:** Đảm bảo không mất quyền hiện hữu khi bật enforcement mới. Dual-enforcement (DB check + hard-code fallback + log divergence vào AuditLog) trong 1 release, tắt fallback khi 7 ngày không còn divergence.

### D6. Frontend đồng bộ

- **Chọn:** Endpoint `GET /api/rules/my-permissions` trả về tập `(resource, action, scope, canDelete)` của user hiện tại (resolve từ Position + Department + SecondaryDepartments, đã áp dụng baseline REQ-RBAC-006); frontend cache trong AuthContext/React Query, expose `can(resource, action)` helper; `permissions.ts` giữ fallback hard-code trong giai đoạn chuyển đổi.
- **Why:** Sidebar/menu/button gating suy từ cùng Rule Matrix với backend, tránh drift. Baseline DELETE guard được phản ánh trong `my-permissions` nên nút Xóa tự ẩn cho EMPLOYEE/TEAM_LEAD.

## Alternatives Considered

- Mở rộng trực tiếp `RolePermission/ResourceType`: bỏ vì shape legacy không đủ (thiếu Position/Department/SubDepartment/scope/allow/deny).
- RBAC thuần với Casbin/oso: bỏ vì overkill cho ~80 resource, team chưa có kinh nghiệm vận hành policy engine ngoài, và yêu cầu là "format lại rule hiện có" chứ không thay engine.
- Redis cache ngay từ đầu: hoãn lại — thêm infra trước khi chứng minh cần thiết là premature complexity.

## Risks & Mitigations

- **Risk:** Migration miss một số `authorize` do cú pháp biến thể → Mitigation: script có report "uncovered routes" và test so sánh số Rule sinh ra với số call sites (theo `grep -rn authorize backend/src/routes --include="*.ts" --exclude-dir=__tests__`).
- **Risk:** Dual-enforcement che giấu bug trong Rule mới → Mitigation: log divergence (hard-code allow nhưng DB deny và ngược lại) vào AuditLog với `{ ruleId, route, legacyAllow, dbAllow }` trong 1 release trước khi tắt fallback; tắt khi 7 ngày không còn divergence.
- **Risk:** Cache stale sau Rule CRUD → Mitigation: invalidate đồng bộ trong cùng transaction/handler, và TTL ngắn làm safety net.
- **Risk:** `UserSecondaryDepartment` thiếu `positionId` → Mitigation: migration thêm cột nullable + backfill từ `Employee.positionId` khi có thể, fallback về `role` nếu null.
- **Risk:** Rule matrix trống sau migration làm tê liệt — Mitigation: seed script chạy trong transaction, có dry-run mode in ra số Rule sẽ tạo trước khi ghi, có rollback script; baseline REQ-RBAC-006 đảm bảo ngay cả khi Rule trống, mọi nhân viên vẫn thao tác được (trừ DELETE) trong phòng ban của mình.

## Open Questions

- Có cần hiệu lực theo thời gian (`effectiveFrom/effectiveUntil`) cho Rule hay chỉ `isActive` là đủ cho phase 1? Đề xuất: chỉ `isActive` ở phase 1, thêm window sau nếu nghiệp vụ yêu cầu.
- ADMIN có nên chịu Rule scoping trong tương lai không? Đề xuất: giữ bypass mặc định, thêm flag `adminStrictMode` để bật khi cần.
- `PositionLevel` scoping có đưa vào phase 1 không? Đề xuất: không — để phase 2 (đã tách khỏi D3 và REQ-POS-002).
