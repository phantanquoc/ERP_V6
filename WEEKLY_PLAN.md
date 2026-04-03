# 📋 Weekly Plan — feature/weekly-optimization

> **Branch**: `feature/weekly-optimization`
> **Start**: 2026-03-31
> **Goal**: Complete all items before next Monday

---

## ✅ Tech Stack Upgrades

### 1. [ ] Fix Express 5 Compatibility
- [ ] Audit all middleware packages for Express 5 support
- [ ] Fix breaking changes in `req.query`, `req.params` typing
- [ ] Verify `app.use()` order and behavior changes
- [ ] Test all routes after upgrade

### 2. [ ] Rate Limiting
- [ ] Install `express-rate-limit` + `@types/express-rate-limit`
- [ ] Add global rate limit (e.g. 100 req/min per IP)
- [ ] Add stricter limit for `/api/auth/login` (5 attempts/min per IP)
- [ ] Add Login Attempt tracking table in DB (`login_attempts`)
- [ ] Block IP for **5 minutes** after **3 wrong passwords**
- [ ] Add `/api/auth/unblock` endpoint for admin to manually unblock IP
- [ ] Add blocked IPs table in Prisma schema

### 3. [x] WebSocket Notifications (Real-time)
- [x] Install `ws` or `socket.io` on backend
- [x] Integrate WebSocket server on same port as Express
- [x] Create `Notification` model in Prisma (if not exists) — include: `userId`, `type`, `title`, `message`, `isRead`, `data` (JSON)
- [x] Create WebSocket service to broadcast to specific user
- [x] Frontend: connect WebSocket on app load (via `AuthContext`)
- [x] Emit notification on: status change, task assignment, approval, attendance reminder
- [x] Store notifications in DB (persist across sessions)

### 4. [ ] CI/CD Pipeline
- [ ] Add `.github/workflows/` directory with:
  - `ci.yml` — lint, type-check, test on every PR
  - `cd.yml` — build & push Docker images on merge to `main`
- [ ] Configure GitHub Secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_DEPLOY_HOST`, etc.
- [ ] Add `Dockerfile` multistage build for backend and frontend
- [ ] Add pre-commit hook: `npm run lint && npm run test` (via Husky + lint-staged)

### 5. [ ] Config Upload — Format, Size Limit, Storage Path
- [ ] Centralize upload config in `backend/src/config/upload.ts`:
  - `MAX_FILE_SIZE` (default: 10MB)
  - `ALLOWED_MIME_TYPES` (images, PDFs, Excel, Word)
  - `UPLOAD_DEST` (default: `./uploads`)
  - `SUBDIR_STRATEGY` (by date / by type / flat)
- [ ] Apply limits in Multer for all upload routes
- [ ] Validate MIME type server-side (not just client)
- [ ] Add per-route file size overrides (e.g. Excel import: 50MB)
- [ ] Frontend: show upload progress + error messages

### 6. [x] Auto Test API Tools
- [x] Add **Jest** test examples for each service (at minimum 3 per service)
  - `notificationService.test.ts` — 11 tests (createNotification, getEmployeeNotifications, getUnreadNotifications, markAsRead, markAllAsRead)
  - `authService.test.ts` — 9 tests (register, login — success + error cases)
  - `attendanceService.test.ts` — 8 tests (getAttendanceByDateRange grouping/priority, getEmployeeAttendance)
- [x] Add **Supertest** for HTTP-level API tests — `api.test.ts` (8 tests: health, login, debug, 404, auth guard)
- [x] Add **Postman / Insomnia** collection export in `docs/api/erp-api-collection.json`
- [x] Add **Playwright** for E2E smoke tests:
  - `e2e/login.spec.ts` — Login flow (form render, validation, wrong creds, success, block after 3 fails, reload persistence)
  - `e2e/dashboard.spec.ts` — Dashboard load (nav, user info, no JS errors)
  - `e2e/notification.spec.ts` — Notification bell click (icon, dropdown, badge, mark read)
  - `e2e/attendance.spec.ts` — Attendance page (navigate, table, controls, no errors)
- [x] Document how to run: xem `docs/TESTING.md`

---

## ✅ Functionality

### 7. [ ] Theme System with Special Event Themes
- [ ] Add `theme` table in Prisma: `name`, `primaryColor`, `secondaryColor`, `accentColor`, `logo`, `isActive`, `startDate`, `endDate`
- [ ] Seed default themes:
  - `default` — normal theme
  - `30/4` — (Apr 30 – May 1) red/yellow, Liberation Day vibe
  - `1/5` — May Day, international labor theme
- [ ] Add Settings button in Navbar/Sidebar
- [ ] Settings modal: theme picker (radio cards with preview), save to localStorage + DB (per-user)
- [ ] Frontend: apply CSS variables based on active theme
- [ ] Auto-switch to event theme if current date falls in `startDate`–`endDate`

### 8. [ ] Change Slogan
- [ ] **Old**: (find and replace in source)
- [ ] **New**: `"Đừng tìm lý do, hãy tìm giải pháp — Stop making excuses, start finding solutions"`
- [ ] Update wherever slogan appears (Login page, Dashboard header, etc.)
- [ ] Move to `src/config/app.ts` as constant: `APP_SLOGAN`

### 9. [ ] Overtime Plan → Auto Add to Attendance
- [ ] After overtime plan is **approved**, automatically create attendance record
- [ ] Attendance record fields: `employeeId`, `date` (same as overtime date), `checkInTime`, `checkOutTime` (estimated), `overtimePlanId` (link)
- [ ] If employee already has attendance for that date, extend `checkOutTime`
- [ ] Trigger WebSocket notification to employee: "Kế hoạch tăng ca đã được duyệt"
- [ ] Unit test for attendance auto-creation logic

### 10. [ ] Meeting List with Plans
- [ ] Add `Meeting` model in Prisma: `title`, `agenda`, `date`, `startTime`, `endTime`, `participants[]`, `room`, `notes`, `status`, `departmentId`, `createdBy`
- [ ] Add `meetingParticipant` table
- [ ] Create Meeting CRUD (controller + service + route)
- [ ] Frontend: Meeting list page with filters (date, department, status)
- [ ] Frontend: Meeting detail view + add/edit agenda items
- [ ] Frontend: Meeting calendar view (weekly)
- [ ] WebSocket: notify participants when meeting is created/updated/cancelled
- [ ] Auto-reminder notification 15 min before meeting start

### 11. [ ] Supply Adjustment Request (Đề nghị điều chỉnh bổ sung)
- [ ] Add `SupplyAdjustment` model: `materialId`, `currentQty`, `requestedQty`, `reason`, `status`, `approvedBy`, `qualityDepartmentNotes`
- [ ] Create SupplyAdjustment CRUD
- [ ] Frontend: form to request adjustment
- [ ] Frontend: Quality department approval workflow (fetch from `SupplyAdjustment` where `status = PENDING`)
- [ ] If approved: update `WarehouseMaterial.quantity`
- [ ] WebSocket notification to requester + warehouse manager

### 12. [ ] Global Table Filter Formatting
- [ ] Standardize all table filter inputs:
  - Remove index column from filter — filter by actual data column
  - Add debounce (300ms) to text filters
  - Add date range picker for date columns
  - Add multi-select for enum columns (status, department)
- [ ] Format numbers: `1,000` with locale string
- [ ] Format dates: consistent `DD/MM/YYYY HH:mm` across all tables
- [ ] Empty state: show illustration + "Không có dữ liệu"
- [ ] Loading state: skeleton rows
- [ ] Create reusable `DataTable` component with built-in filter support

### 13. [ ] Fix All Notification Workflows
- [ ] Audit every workflow that changes entity state and ensure it emits a notification
- [ ] List all workflows and check notification coverage:

| Workflow | Notification To | Status |
|---|---|---|
| Tạo request (nghỉ phép, tăng ca...) | Approver(s) | [ ] |
| Duyệt / Từ chối request | Người tạo | [ ] |
| Giao việc (task assignment) | Người được giao | [ ] |
| Thay đổi trạng thái đơn hàng | Khách hàng / Sales | [ ] |
| Duyệt bảng lương | Nhân viên liên quan | [ ] |
| Check-in/check-out reminder | Nhân viên chưa điểm danh | [ ] |
| Phân công QC | QC personnel | [ ] |
| Thay đổi trạng thái phiếu nhập/kho | Warehouse staff | [ ] |
| Phê duyệt điều chỉnh vật tư | Người yêu cầu | [ ] |
| Tạo cuộc họp mới | Tất cả người tham dự | [ ] |

- [ ] Fix any missing notifications
- [ ] Notification item: include link/action button to navigate to related entity

### 14. [ ] Fix Attendance CardView API + Reminder
- [ ] Backend: create endpoint `/api/attendance/daily-summary`:
  - Returns employees grouped by: `present` (checked in), `present_out` (checked both), `absent` (not checked in)
  - Include `lastCheckTime` per employee
- [ ] Frontend: Attendance CardView using this endpoint
- [ ] **Daily reminder logic** (cron job or scheduled check):
  - At 08:00 — notify employees who haven't checked in
  - At 17:00 — notify employees who checked in but not checked out
  - At 22:00 — auto-mark absent for employees with no check-in, notify supervisor
- [ ] WebSocket: push reminder in real-time, not just polling
- [ ] Notification if employee manually marks attendance late

---

## 📊 Progress Tracker

> Cập nhật lần cuối: **2026-04-03** — Branch: `feature/weekly-optimization`

| # | Task | Status | Bằng chứng | Còn thiếu |
|---|---|---|---|---|
| 1 | Express 5 Compatibility | ✅ | `express@^5.1.0`, `@types/express@^5.0.3` trong `package.json` | — |
| 2 | Rate Limiting + IP Block | ✅ | `express-rate-limit@^7.5.1`, middleware `rateLimiter.ts` + `ipBlock.ts`, migration `20260331081234_add_security_tables` (bảng `login_attempts`, `blocked_ips`) | — |
| 3 | WebSocket Notifications | ✅ | `ws@^8.20.0`, `websocket.ts` service, `notificationRoutes.ts`, tích hợp `AuthContext` frontend | — |
| 4 | CI/CD Pipeline | 🔄 | `.github/workflows/ci.yml` (lint + security + test + build) | `cd.yml` chưa có — chưa có deploy pipeline, chưa có Husky pre-commit hook |
| 5 | Upload Config | 🔄 | `upload.ts` middleware có `MAX_FILE_SIZE=100MB`, multer diskStorage | Chưa có `config/upload.ts` centralized, chưa validate MIME type per-route, chưa có frontend progress bar |
| 6 | Auto Test API Tools | ✅ | `authService.test.ts`, `attendanceService.test.ts`, `notificationService.test.ts`, `api.test.ts` (Supertest), Playwright E2E, Postman collection `docs/api/erp-api-collection.json`, `docs/TESTING.md` | — |
| 7 | Theme System (30/4, 1/5) | ✅ | Migration `20260401071316_add_theme_model_to_common_schema`, `themeService.ts`, `themeRoutes.ts`, `ThemeContext.tsx`, `ThemePickerModal.tsx`, `HolidayBanner.tsx` (4 variants), seed themes | — |
| 8 | Change Slogan | ⬜ | — | Chưa có `APP_SLOGAN` constant, chưa tìm/thay thế slogan cũ trong Login page + Dashboard |
| 9 | Overtime → Attendance Auto-add | ✅ | Migration `20260402063218_add_overtime_plan_id_to_attendance` (field `overtimePlanId` + relation), `approvePlan` auto-tạo attendance khi DA_DUYET, 13 unit tests trong `overtimePlanService.test.ts` | — |
| 10 | Meeting List | ✅ | Migration `20260402091112_add_meeting_model`, `meetingService.ts` (CRUD + WS notify + reminder scheduler), `meetingController.ts`, `meetingRoutes.ts`, `MeetingPage.tsx`, `MeetingModal.tsx` (create/edit/view + participant picker), tích hợp vào Common module | — |
| 11 | Supply Adjustment Request | ✅ | Migration `20260403083837_add_supply_adjustment_model`, `supplyAdjustmentService.ts` (CRUD + role-based + WS notify), `supplyAdjustmentController.ts`, `supplyAdjustmentRoutes.ts`, `SupplyAdjustmentModal.tsx` (list/create/approve), wired vào `CommonManagement` → `de_nghi_dieu_chinh` | — |
| 12 | Global Table Filters | ✅ | `DataTable.tsx` component (debounce 300ms text filters, date-range picker, multi-select, loading skeleton, empty state, paginator với ellipsis), `formatters.ts` (`formatDate`, `formatDateTime`, `formatNumber`, `formatCurrency`). Applied to: `EmployeeManagement` (filter: mã NV, họ tên, email, bộ phận, trạng thái), `UserManagement` (filter: họ tên, email, vai trò, bộ phận, trạng thái) | — |
| 13 | Fix All Notification Workflows | ⬜ | — | Chưa audit, chưa có notification cho phần lớn workflow trong bảng |
| 14 | Attendance CardView + Reminder | ⬜ | — | Chưa có endpoint `/api/attendance/daily-summary`, chưa có cron job reminder |

**Legend**: ⬜ Not started | 🔄 In progress | ✅ Done | ❌ Blocked