# Tasks: Audit và Format lại Rule Matrix theo Phòng ban × Chức vụ

## 1. Siết chặt bảo vệ route (P0/P1) — Backend

- [x] 1.1 Thêm `requireRule(resource, correctAction)` cho toàn bộ `POST/PUT/PATCH/DELETE` còn thiếu (P0-01): `attendanceRoutes`, `customerFeedbackRoutes`, `generalCostRoutes`, `taskRoutes`, `taxReportRoutes`, `finishedProductRoutes`, `workShiftRoutes`, `privateFeedbackRoutes`, `qualityEvaluationRoutes`, `quotationCalculatorRoutes`, `lotRoutes`, `lotProductRoutes`, `machineStatusLogRoutes`, `inventoryRoutes:overview`, `docsRoutes:PUT`, `leaveRequest approve/reject`, `notificationRoutes` (giữ owner check trong service nếu có). Mỗi route dùng đúng `resourceCode` theo `seed-resources.ts` và `action` theo HTTP semantics.
- [x] 1.2 Sửa wrong-action (P1-01): `attendanceCodeRoutes`/`holidayRoutes`/`systemSettingsRoutes:PUT`/`timesheet cell`/`warehouseReceipt+Issue`/`reorderRule`/`faceAttendance` enroll/toggle/logs/device — đổi `READ` → `CREATE/UPDATE/DELETE` đúng. Verify bằng `grep -rn "requireRule" src/routes --include="*.ts" | grep -E "READ.*(POST|PUT|PATCH|DELETE)"` == 0.
- [x] 1.3 Thêm `requireRule(resource,'READ')` cho collection `GET /` và `GET /:id` cần ABAC (P1-02/P1-03): `invoices`, `orders`, `suppliers`, `quotation*`, `warehouse*`, `acceptanceHandover`, `dailyWorkReport` (những chỗ còn thiếu) — để `requireRule` suy `userDepartmentIds` và service filter. Quyết định per-resource: nếu resource không thuộc phòng ban (auditLog, resources meta) giữ deny-all trừ ADMIN.
- [x] 1.4 Dead routes & kiosk: đăng ký `agentRoutes`/`chatRoutes` vào `ROUTE_MAP` hoặc xóa file; vô hiệu `kiosk/verify-dev` ở `NODE_ENV=production` hoặc xóa endpoint (P0-05/P0-06). Thêm rate-limit cho `kiosk/verify`.

## 2. Sửa enforcement `requireRule` + `ruleService` (P0/P1)

- [x] 2.1 Delegation scope check (P0-03): `requireRule` thêm `departmentId/subDepartmentId` vào `delegation.findFirst` where, match với `userDepartmentIds/subDepartmentId`. `ruleService.getMyPermissions` giữ đồng bộ.
- [x] 2.2 Owner-scope thực thi (P0-04): chuyển từ flag `baselineDenied` sang load `createdById` trong middleware cho `UPDATE/DELETE :id` (lookup bảng theo `resourceCode` → model → `findUnique select createdById`), allow nếu owner trong phòng ban; hoặc doc rõ và enforce ở service layer cho mọi resource liên quan (đồng bộ toàn bộ service, không để no-op).
- [x] 2.3 Cache: hoặc xóa `RULE_CACHE_KEY`/`invalidateRuleCache` chết và giữ DB-per-request, hoặc nối `requireRule` đọc cache (TTL 60s, invalidate sau CRUD). Thống nhất một hướng, xóa code chết. Gộp `baselineAllow` thành một import duy nhất.
- [x] 2.4 `getMatrix` fix `subDepartmentId` filter (P1-07), `listResources` filter `isActive:true` đồng bộ, `createRule`/`updateRule` thêm `validateScopeFields` cho cả `GLOBAL` (từ chối stray ids).

## 3. Chuẩn hoá schema Prisma (P2)

- [ ] 3.1 Thêm check `scope ↔ ids` (app-level validate + DB check constraint nếu có thể): `GLOBAL` → cả hai NULL; `DEPARTMENT` → `departmentId NOT NULL && subDepartmentId IS NULL`; `SUB_DEPARTMENT` → `subDepartmentId NOT NULL`. Reject ở `ruleService.validateScopeFields`.
- [ ] 3.2 Fix unique với nullable: thêm app-level duplicate check cho GLOBAL (2 GLOBAL cùng resource/action/role/position phải 409) hoặc partial unique indexes. Thêm test global-duplicate.
- [ ] 3.3 Index bổ sung: `Rule.role`, `Rule.isActive`, `RuleAuditLog.actorId`, `User.departmentId/subDepartmentId`. Giữ `ResourceType` dead-enum doc hoặc xóa; `Resource.group` doc như enum string; `RuleAuditLog.action` đổi thành enum.
- [ ] 3.4 FK cross-schema: quyết định giữ loose string (doc lý do) hoặc thêm FK thực (`@relation` cross-schema — Prisma hỗ trợ). Nếu giữ loose, thêm orphan check ở seed/migration.

## 4. Seed & format lại Rule theo Phòng ban × Chức vụ

- [ ] 4.1 Chuẩn hoá `Position.defaultRole` cho 53 Position: chạy lại `seed-resources.ts` heuristic + review thủ công (đặc biệt `POS_021` Trưởng nhóm, các POS QC), sửa mapping sai, verify mọi Position có `defaultRole`.
- [ ] 4.2 Sinh Rule baseline explicit per Department×Position×Resource: với mỗi (dept, position, resource thuộc dept) tạo Rule cho 8 actions theo bảng phân tầng (C/R/U/E/I allow-all, A/RJ TEAM_LEAD+, DELETE DEPT_HEAD) với `scope=DEPARTMENT` hoặc `SUB_DEPARTMENT` tương ứng. Review với product owner trước khi seed prod. Bao phủ `PositionResponsibility` → `Rule.responsibilityId` để phase 2.
- [ ] 4.3 Migration seed: script idempotent upsert theo unique key, dry-run in số Rule sẽ tạo, report "uncovered routes" so với `grep -rn authorize` cũ (nếu còn). Chạy trong transaction.

## 5. Đồng bộ Frontend

- [ ] 5.1 `AuthContext` refresh `my-permissions` sau `USER_PROFILE_UPDATED` và sau mỗi Rule CRUD (invalidate `myPermissions` query), không chỉ on-login (P2-08).
- [ ] 5.2 `Sidebar` + `ProtectedModuleRoute/SubRoute` đọc `can(resource,action)` / `my-permissions` thay vì `DEPARTMENTS` hard-code; `RuleManagement` matrix tab hiển thị đúng per-position×scope (P2-06). Thay `role==='admin'` literals bằng `can()`.
- [ ] 5.3 `AdminRoute` đồng bộ với backend: check `role==='ADMIN'` (hoặc cả hai), không chỉ `department==='admin'` (P2-07).
- [ ] 5.4 Button gating toàn app: mọi nút DELETE/APPROVE/REJECT dùng `can(resource, correctAction)` thay vì `isAdmin`.

## 6. Tests & Verification

- [ ] 6.1 Cập nhật `routeAuth.test.ts`: chuyển assert `authorize` → `requireRule(resource, action)` per route; thêm case delegation-scope, owner-scope, baseline per role.
- [ ] 6.2 Backend tests: `requireRule` (delegation → rule priority → owner → baseline), `ruleService.getMatrix`/`getMyPermissions`, `Rule` scope validation, global duplicate, audit log.
- [ ] 6.3 Frontend tests: `permissions.can()` baseline vs DB, `canDelete` per-resource, cachedPermissions staleness.
- [ ] 6.4 Chạy `backend npx tsc --noEmit`, `npm run lint`, `npm test`; `frontend npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`; `npx prisma validate`. Manual spot-check 3 role × 2 dept.
