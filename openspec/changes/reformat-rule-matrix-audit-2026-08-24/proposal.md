# Proposal: Audit và Format lại toàn bộ Rule theo Phòng ban × Chức vụ

## Why

Hệ thống Rule Matrix (DB-driven `requireRule`) đã thay thế hard-code `authorize()` ở 279 call sites (commit `27e0c6e`) và có 80 `ROUTE_MAP` entries, 79 `Resource` rows, 53 `Position`, 7 `Department`, 15 `SubDepartment`. Audit đa chiều ngày 2026-08-24 phát hiện hệ thống chạy ở **baseline permissive** do `Rule` table trống sau seed (mọi `CREATE/READ/UPDATE` được allow theo baseline), đồng thời tồn tại nhiều lỗ hổng enforcement và drift frontend-backend:

- **~19 route groups chỉ có `authenticate`, không có `requireRule`** cho mọi endpoint (attendance, customer-feedback, general-costs, task, tax-report, finished-products, work-shifts, v.v.) — bất kỳ user nào đăng nhập cũng có thể ghi.
- **~12 files dùng `requireRule` nhưng sai `action`** (`READ` bảo vệ `POST/PUT/DELETE`): `attendanceCodeRoutes`, `holidayRoutes`, `systemSettingsRoutes: PUT as READ`, `timesheet cell`, `warehouse receipt/issue`, `reorderRule`, `faceAttendance` (enroll/read confusion).
- **~30 route groups cho `READ` mở cho mọi user có token** (invoices, orders, suppliers …) — không enforce `requireRule('resource','READ')` để suy ABAC theo phòng ban.
- **Delegation không check scope** (`requireRule.ts:35-44`); **owner-scope là no-op** (set flag `baselineDenied` nhưng không service nào đọc); **cache invalidation chết** (`RULE_CACHE_KEY` chưa từng được đọc); **positionId hiệu lực qua `defaultRole` nhưng JWT primary dept stale**.
- **Frontend gating theo `DEPARTMENTS` hard-code + `hasModuleAccess`, không theo `can(resource,action)`** — thêm Rule deny ở backend chỉ gây 403 lặng lẽ mà không ẩn menu. `can()` chỉ được dùng ở Quotation. `AdminRoute` check `department==='admin'` trong khi backend check `role==='ADMIN'` — lệch.
- **Schema `Rule` có 7-cột unique với nullable columns** (Postgres `NULL != NULL` nên chặn trùng không hiệu quả), thiếu FK cross-schema, thiếu check `scope ↔ departmentId/subDepartmentId`, thiếu index `role/isActive/actorId`, `ResourceType` enum chết, `Resource.group` là loose string.

Nếu không format lại, mỗi lần thêm/sửa Position hoặc Department đều phải tạo Rule thủ công rời rạc, validation lỏng lẻo cho phép sinh Rule bẩn, và baseline permissive che giấu thiếu sót bảo vệ.

## What Changes

- **Audit report cố định** (file này + `specs/rule-audit-report.md`): ghi lại findings P0/P1/P2 theo scan 2026-08-24 làm source of truth trước khi sửa code.
- **Format lại Rule Matrix theo trục Chức vụ × Phòng ban**: chuẩn hoá mỗi Position có `defaultRole` đúng, sinh ma trận `Position × Resource × Action × Scope` (53 × ~60 × 8 × 3 ≈ nhưng sparse qua seed) với quy tắc:
  - Trong phòng ban của mình: `CREATE/READ/UPDATE/EXPORT/IMPORT` — mọi role; `APPROVE/REJECT` — `TEAM_LEAD+`; `DELETE` — `DEPARTMENT_HEAD` — đúng baseline `REQ-RBAC-006` hiện có (không đổi semantics, chỉ làm rõ và seed thành Rule explicit để audit được).
  - Ngoài phòng ban: deny trừ `GLOBAL` hoặc `UserSecondaryDepartment`.
  - Owner-scope và Delegation giữ nguyên semantics (sửa cho đúng implementation).
- **Lấp enforcement gaps**: thêm `requireRule(resource, correctAction)` cho mọi `POST/PUT/PATCH/DELETE` còn thiếu; sửa action sai; thêm `READ` cho collection endpoints cần ABAC; xoá/đăng ký dead routes (`agentRoutes`, `chatRoutes`); tắt `verify-dev` ở production.
- **Đồng bộ frontend**: `Sidebar`/`ProtectedModuleRoute` đọc `my-permissions` (`can()`), ẩn menu theo Rule; thay `role==='admin'` bằng `can()`; refresh permissions sau login và sau Rule change (invalidate query), không chỉ on-login.
- **Siết schema & service**: thêm check `scope ↔ ids`, partial unique fixes, FK/int index bổ sung (không phá multi-schema), `invalidateRuleCache` thật hoặc bỏ cache; `getMatrix` fix filter `subDepartmentId`; thống nhất `baselineAllow` single source; delegation scope check; owner check chuyển vào middleware (load `createdById`).

## Capabilities

### New Capabilities
- `rule-audit-report`: Báo cáo audit cố định cho trạng thái Rule Matrix trước khi format lại (P0/P1/P2, route map, schema issues, frontend drift).

### Modified Capabilities
- `rbac-unified-matrix`: Thêm seed baseline explicit theo Position×Scope, sửa scope check, fix unique/index, fix delegation & owner-scope, cache.
- `department-rule-crud`: Seed + migration sinh Rule từ baseline per department/subDepartment, validation scope.
- `position-rule-crud`: Mapping `Position.defaultRole` chuẩn, matrix `Position × Resource × Action` với filter scope, seed theo bảng phân tầng chức vụ.
- `rule-enforcement-sync`: Lấp guard gaps, sửa wrong actions, đồng bộ frontend gating, dead-route handling.

## Impact

- **Database**: schema `auth.prisma` — thêm check constraints, indexes, partial unique (hoặc app-level guard nếu giữ Pg null-semantics), FK cross-schema (nếu chấp nhận) hoặc doc rõ ràng; seed lại `Rule` theo bảng format; `Resource.group` giữ string nhưng doc enum.
- **Backend**: ~30 route files thêm/sửa `requireRule`; `requireRule.ts` + `ruleService.ts` sửa delegation/owner/cache/baseline; `getMatrix`; `index.ts` ROUTE_MAP cho agent/chat.
- **Frontend**: `permissions.ts`, `AuthContext`, `Sidebar`, `ProtectedModuleRoute/SubRoute`, `AdminRoute`, `RuleManagement`, button gating toàn app.
- **Tests**: `routeAuth.test.ts` phải chuyển từ assert `authorize` → `requireRule`; thêm tests cho delegation scope, owner, baseline, matrix, frontend `can()`.
- **Verification**: `backend npx tsc --noEmit`, `npm run lint`, `npm test`; `frontend npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`; manual matrix spot-check cho 3 role × 2 dept.
