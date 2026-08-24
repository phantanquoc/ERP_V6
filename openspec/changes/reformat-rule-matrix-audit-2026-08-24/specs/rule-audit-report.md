# Capability: rule-audit-report — Báo cáo Audit Rule Matrix (2026-08-24)

## Purpose

Ghi cố định kết quả scan toàn diện hệ thống Rule Matrix trước khi format lại. Report là source of truth để đối chiếu sau khi thực thi plan — mọi finding P0 phải có task tương ứng trong `tasks.md` và phải được verify bằng grep/test.

Scan thực hiện bởi workflow `wf_f935722f-cf2` với 5 agent song song: `schema`, `middleware-service`, `routes-matrix`, `seeds-and-lookup`, `frontend-and-tests`. Tổng 349,576 tokens, 95 tool calls.

## Requirements

### REQ-AUD-001: Findings mức P0 — phải sửa trước khi seed lại

| # | Finding | File:line | Impact |
|---|---------|-----------|--------|
| P0-01 | 19 route groups chỉ `authenticate`, không `requireRule` cho mọi endpoint (ghi mở) | `attendanceRoutes.ts:36ff`, `customerFeedbackRoutes.ts`, `generalCostRoutes.ts`, `taskRoutes.ts`, `taxReportRoutes.ts`, `finishedProductRoutes.ts` (11 ep), `workShiftRoutes.ts`, `privateFeedbackRoutes.ts`, `qualityEvaluationRoutes.ts`, `quotationCalculatorRoutes.ts`, `lotRoutes.ts`, `lotProductRoutes.ts`, `machineStatusLogRoutes.ts`, `inventoryRoutes.ts`, `docsRoutes.ts:PUT`, `notificationRoutes.ts`, `loginHistoryRoutes.ts:GET /`, `leaveRequestRoutes.ts` approve/reject | Bất kỳ user đăng nhập cũng ghi/xóa |
| P0-02 | `Rule` table trống sau seed — mọi request rơi về baseline permissive (`CREATE/READ/UPDATE` allow) | `seed-resources.ts` chỉ seed `Resource` + `Position.defaultRole`, không seed Rule | Che giấu thiếu guard; thêm Rule deny sau này gây 403 bất ngờ |
| P0-03 | Delegation không check scope | `requireRule.ts:35-44` | `DEPARTMENT_HEAD` delegate ở dept A cho quyền global |
| P0-04 | Owner-scope là no-op (`baselineDenied` flag không service nào đọc) | `requireRule.ts:118-130` | Baseline-deny bypass lặng lẽ cho UPDATE/DELETE |
| P0-05 | Dead routes không mount | `agentRoutes.ts`, `chatRoutes.ts` thiếu key trong `ROUTE_MAP` (`index.ts:7-87`) | AI proxy unreachable |
| P0-06 | `kiosk/verify-dev` public ở cả production | `faceAttendanceRoutes.ts:63` | Bypass xác thực khuôn mặt |

**Scenarios:**
- WHEN `EMPLOYEE` gọi `POST /api/tasks` trước khi fix THEN SHALL bị 403; sau fix trước khi seed Rule, baseline cho phép nếu thuộc phòng ban — phải có Rule explicit để siết (không dựa vào thiếu guard).
- WHEN admin xem `GET /api/rules` sau seed lại THEN phải thấy ≥ 1 Rule cho mỗi Position×Resource×Action theo bảng format (sparse, không phải full cross product).

### REQ-AUD-002: Findings mức P1 — sai action / read mở / test stale

| # | Finding | File:line |
|---|---------|-----------|
| P1-01 | `requireRule(..., 'READ')` bảo vệ `POST/PUT/DELETE` (any reader can write) | `attendanceCodeRoutes:9-11`, `holidayRoutes:9-11`, `systemSettingsRoutes:9 PUT as READ`, `timesheet cell`, `warehouse receipt/issue`, `reorderRule: POST as READ`, `faceAttendance` enroll/toggle/logs confusion |
| P1-02 | `READ` collection mở cho mọi user có token (không `requireRule READ` để suy ABAC) | `invoiceRoutes GET /`, `orderRoutes GET /`, `supplierRoutes`, `quotation*`, `warehouse*`, `acceptanceHandover GET /` v.v. ~30 groups |
| P1-03 | Approval không qua `requireRule` | `leaveRequest PATCH approve/reject`, `task PATCH accept/evaluate`, `overtimePlan PATCH approve` |
| P1-04 | Cache chết | `ruleService.ts:6-11` `RULE_CACHE_KEY` voided, `requireRule` không đọc cache (5 DB queries/request) |
| P1-05 | `routeAuth.test.ts` assert `authorize` counts, stale sau migration 27e0c6e | `src/__tests__/routeAuth.test.ts:211-267` |
| P1-06 | `baselineAllow` duplicate | `requireRule.ts:5-9` vs `ruleService.ts:154-158` |
| P1-07 | `getMatrix` bỏ qua `subDepartmentId` filter | `ruleService.ts:160-166` |

**Scenarios:**
- WHEN `EMPLOYEE` gọi `PUT /api/system-settings` với guard `READ` THEN trước fix allow (P1-01); sau fix phải 403.
- WHEN `EMPLOYEE/Production` gọi `GET /api/invoices` với 15 invoices Accounting THEN sau khi thêm `requireRule('invoices','READ')`, response là 403 (không thuộc phạm vi), không phải 200 rỗng lẫn.

### REQ-AUD-003: Findings mức P2 — schema & frontend drift

| # | Finding | Chi tiết |
|---|---------|----------|
| P2-01 | `@@unique` 7 cột với nullable columns không chặn duplicate GLOBAL | `auth.prisma:210` — Pg `NULL != NULL` |
| P2-02 | Thiếu FK cross-schema (departmentId/positionId loose string) | `Rule`, `User`, `UserSecondaryDepartment`, `Delegation`, `RuleAuditLog.actorId` |
| P2-03 | Thiếu check `scope ↔ departmentId/subDepartmentId` | `scope=GLOBAL` vẫn có thể kèm deptId |
| P2-04 | Thiếu index `Rule.role`, `Rule.isActive`, `RuleAuditLog.actorId`, `User.departmentId` | |
| P2-05 | `Resource.group` loose string, `RuleAuditLog.action` loose string, `ResourceType` enum chết | `common.prisma:740` |
| P2-06 | Frontend gating theo `DEPARTMENTS` hard-code, không theo `can(resource,action)` | `permissions.ts:63ff`, `ProtectedModuleRoute`, `Sidebar`; `can()` chỉ dùng ở Quotation |
| P2-07 | `AdminRoute` check `department==='admin'` vs backend `role==='ADMIN'` | Lệch |
| P2-08 | Permissions cache chỉ on-login, không refresh sau Rule change | `AuthContext:182` |

## Traceability

Mỗi REQ-AUD-xxx phải map tới ≥1 task trong `tasks.md` (label `P0-n` etc) và có verify bằng `grep` hoặc test.

## Out of Scope for this report

Report chỉ ghi nhận, không tự sửa code. Mọi sửa code nằm ở modified capabilities `rbac-unified-matrix` / `department-rule-crud` / `position-rule-crud` / `rule-enforcement-sync` trong change gốc `format-rbac-position-rules` và được mở rộng ở `tasks.md` của change này.
