# 🤖 Agent Team Prompt — ERP An Bình Foods (Tasks 9–14)

> **Model**: Claude Sonnet (all agents)
> **Branch**: `feature/weekly-optimization`
> **Root**: `/Users/vunam/Downloads/koola/ERP_V6`

---

## 📐 Project Architecture — READ FIRST

```
Tech Stack:
  Backend  : Express 5 + TypeScript + Prisma ORM → PostgreSQL 16 (multi-schema: auth | business | common)
  Frontend : React 18 + Vite + TypeScript + TailwindCSS
  Auth     : JWT (access 7d + refresh 30d), stored in localStorage via AuthService
  Realtime : WebSocket (`ws` package) — same port as Express, path /ws?token=JWT
  Deploy   : Docker Compose (local: docker-compose.local.yml, port 5001)

Backend layer pattern (STRICT):
  Route → Controller (thin) → Service (fat) → Prisma → PostgreSQL
  - Controller: extract params, call service, format ApiResponse<T> — ZERO business logic
  - Service: ALL business logic, DB calls, throw typed errors

Error classes (import from @utils/errors):
  ValidationError | NotFoundError | AuthenticationError | AuthorizationError | ConflictError | InternalServerError

API response format (MANDATORY):
  Success: { success: true, message: '...', data: result, pagination?: {...} }
  Error:   { success: false, message: '...', error: 'ERROR_CODE' }

Prisma schema location: backend/prisma/schema.prisma
  - New models → schema "common" (or "business" if commerce-related)
  - id: String @id @default(cuid())
  - createdAt/updatedAt always present
  - @@map("snake_case_table_name")

Notification pattern (MANDATORY for all state-changing workflows):
  import notificationService from '@services/notificationService';
  import { pushNotification, broadcast } from '@services/websocket';
  // After DB write → createNotification({ userId, type, title, message })
  // notificationService.createNotification automatically pushes via WS to that employee

Realtime list refresh pattern (MANDATORY):
  // After any CRUD that changes a list → broadcast to all clients:
  broadcast({ type: 'ENTITY_NAME_CHANGED' });
  // Frontend: listen via useEffect → window.addEventListener('ENTITY_NAME_CHANGED', refetch)
  // AuthContext already handles: BROADCAST msg → dispatches CustomEvent(broadcastPayload.type)

NotificationType enum (backend/src/types/index.ts):
  EVALUATION | EVALUATION_SUPERVISOR1 | EVALUATION_SUPERVISOR2 | TASK
  LEAVE_REQUEST | LEAVE_REQUEST_RESPONSE | PAYROLL | ACCEPTANCE_HANDOVER
  OVERTIME_PLAN | OVERTIME_PLAN_APPROVAL
  → ADD NEW TYPES HERE for each new workflow

UserRole enum values (UPPERCASE): ADMIN | EMPLOYEE | DEPARTMENT_HEAD | TEAM_LEAD | ACCOUNTANT | QC | WAREHOUSE | PURCHASING

Docker local commands:
  docker restart erp_backend_local      # after backend code change
  docker exec erp_backend_local npx prisma migrate dev --name <name>
  docker exec erp_backend_local npx jest

Frontend WebSocket CustomEvent flow:
  backend broadcast({ type: 'FOO_CHANGED' })
  → AuthContext ws.onmessage → window.dispatchEvent(new CustomEvent('FOO_CHANGED'))
  → component useEffect: window.addEventListener('FOO_CHANGED', () => refetch())
```

---

## 🏗️ Agent Team Structure

### ORCHESTRATOR AGENT
```
Role: Plan, coordinate, verify. Do NOT write code.
Model: claude-sonnet-4-5
Responsibilities:
  1. Break each task into sub-tasks for specialist agents
  2. Verify each agent's output compiles (npx tsc --noEmit)
  3. Verify migration runs successfully
  4. Verify API endpoints return correct responses
  5. Verify frontend renders without console errors
  6. Block merging if any check fails
```

### AGENT 1 — BACKEND SPECIALIST
```
Role: Schema, migration, service, controller, routes
Model: claude-sonnet-4-5
Rules:
  - ALWAYS run migration after schema change
  - ALWAYS add NotificationType for new workflows
  - ALWAYS call broadcast() after any list-changing operation
  - ALWAYS use typed errors, never throw strings
  - ALWAYS follow Controller (thin) → Service (fat) pattern
  - Import paths: @config/* | @services/* | @controllers/* | @utils/* | @types
```

### AGENT 2 — FRONTEND SPECIALIST
```
Role: Pages, components, hooks, services
Model: claude-sonnet-4-5
Rules:
  - ALWAYS listen to WS CustomEvent for realtime list refresh
  - ALWAYS call refetch() inside window.addEventListener('ENTITY_CHANGED', ...)
  - ALWAYS show loading skeleton while fetching
  - ALWAYS show empty state when list is empty
  - ALWAYS format dates as DD/MM/YYYY HH:mm (vi-VN locale)
  - ALWAYS format numbers with toLocaleString('vi-VN')
  - Use TailwindCSS only, no inline styles except transforms
  - API service pattern: frontend/src/services/myService.ts → wrap fetch with type safety
  - Use existing components: Button, Modal, Input, DatePicker from frontend/src/components/
```

### AGENT 3 — REALTIME & NOTIFICATION SPECIALIST
```
Role: Ensure every workflow has correct WS notification + list refresh
Model: claude-sonnet-4-5
Rules:
  - Audit every new service method that changes state
  - Add pushNotification() to notify the correct employee(s)
  - Add broadcast() for any list that needs realtime refresh
  - Add corresponding CustomEvent listener in affected frontend components
  - Test: after saving via API, verify frontend updates without page reload
```

### AGENT 4 — QA & INTEGRATION
```
Role: Write tests, verify end-to-end flow
Model: claude-sonnet-4-5
Rules:
  - Write Jest unit tests for every new service (min 3 tests per method)
  - Write Supertest smoke test for every new endpoint
  - Run: docker exec erp_backend_local npx jest --testPathPattern=<new-test>
  - Verify no TypeScript errors: npx tsc --noEmit
```

---

## 📋 TASKS 9–14 — Detailed Specifications

---

### TASK 9: Overtime Plan → Auto Add to Attendance
**Status**: Schema DONE (Attendance.overtimePlanId exists), Service logic DONE in overtimePlanService.createOvertimeAttendances()

**Agent 1 — Backend**:
```
VERIFY existing implementation in backend/src/services/overtimePlanService.ts:
  - Method createOvertimeAttendances() exists and is called from approvePlan()
  - Attendance model has: isOvertime Boolean, overtimePlanId String?

MISSING — implement these:
1. GET /api/attendance/overtime — list all OVERTIME status attendances
   Filter params: employeeId?, date?, overtimePlanId?
   Response: { attendances[], total, page, totalPages }

2. GET /api/overtime-plans/:id/attendances — list attendances created by this plan
   Response: attendances with employee info

3. In attendanceService.ts — add method: getOvertimeAttendances(query)
   Filter: status = OVERTIME or isOvertime = true
   Include: employee { user { firstName, lastName }, employeeCode, subDepartment { name } }

4. Notification (ALREADY in overtimePlanService.approvePlan):
   VERIFY: after DA_DUYET → notificationService.createNotification sent to creator + all participants
   VERIFY: broadcast({ type: 'OVERTIME_PLAN_CHANGED' }) is called
   ADD: broadcast({ type: 'ATTENDANCE_CHANGED' }) after createOvertimeAttendances completes

5. Unit test: backend/src/__tests__/overtimePlanAttendance.test.ts
   - Test createOvertimeAttendances: creates new attendance record
   - Test createOvertimeAttendances: extends existing checkOutTime
   - Test approvePlan: notification sent to creator
   - Test approvePlan: attendance auto-created for all participants
```

**Agent 2 — Frontend**:
```
FILE: frontend/src/pages/EmployeeDashboard.tsx (or OvertimePlanPage if exists)
  
1. In the overtime plan list/modal — show linked attendance count badge
   When plan.trangThai === 'DA_DUYET': show "✅ Đã tạo chấm công tự động" badge

2. In attendance page — add tab/filter "Tăng ca" that filters isOvertime=true
   Show columns: Nhân viên | Ngày | Giờ vào | Giờ ra | Kế hoạch tăng ca | Trạng thái

3. Realtime: listen window.addEventListener('ATTENDANCE_CHANGED', () => refetch())
   listen window.addEventListener('OVERTIME_PLAN_CHANGED', () => refetch())
```

---

### TASK 10: Meeting List with Plans
**Status**: NOT STARTED — full implementation needed

**Agent 1 — Backend**:
```
STEP 1 — Prisma Schema (add to common schema):

model Meeting {
  id            String              @id @default(cuid())
  title         String
  agenda        String?             @db.Text
  meetingDate   DateTime
  startTime     String              // "HH:mm"
  endTime       String              // "HH:mm"
  room          String?
  notes         String?             @db.Text
  status        MeetingStatus       @default(SCHEDULED)
  departmentId  String?
  createdBy     String              // userId
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  participants  MeetingParticipant[]

  @@map("meetings")
  @@schema("common")
}

model MeetingParticipant {
  id          String   @id @default(cuid())
  meetingId   String
  employeeId  String   // Employee.id
  isConfirmed Boolean  @default(false)
  createdAt   DateTime @default(now())
  meeting     Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([meetingId, employeeId])
  @@map("meeting_participants")
  @@schema("common")
}

enum MeetingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED

  @@schema("common")
}

// Add to Employee model:
  meetings MeetingParticipant[]

STEP 2 — Migration:
  docker exec erp_backend_local npx prisma migrate dev --name add_meeting_model_to_common_schema

STEP 3 — NotificationType: add MEETING_CREATED | MEETING_UPDATED | MEETING_CANCELLED | MEETING_REMINDER

STEP 4 — MeetingService (backend/src/services/meetingService.ts):
  
  create(data, createdBy):
    - Validate: endTime > startTime, meetingDate >= today
    - Create Meeting + MeetingParticipant records
    - Notify each participant: notificationService.createNotification({ userId: participant.user.userId, type: MEETING_CREATED, title: 'Bạn có cuộc họp mới', message: `${title} lúc ${startTime} ngày ${dd/mm/yyyy}` })
    - broadcast({ type: 'MEETING_CHANGED' })
    - Return populated meeting with participants

  getAll(query: { page, limit, search, status, departmentId, dateFrom, dateTo, createdBy }):
    - Include participants with employee+user info
    - Return paginated

  getById(id): full detail with participants

  update(id, data, userId):
    - Only creator or ADMIN can update
    - If status → CANCELLED: notify all participants
    - broadcast({ type: 'MEETING_CHANGED' })

  delete(id, userId): only SCHEDULED meetings, only creator or ADMIN

  getMyMeetings(employeeId, query):
    - Meetings where I'm a participant
    
  confirmAttendance(meetingId, employeeId, isConfirmed):
    - Update MeetingParticipant.isConfirmed

  // Auto-reminder: called by a setInterval every minute in index.ts
  checkUpcomingReminders():
    - Find meetings starting in next 15 minutes where reminder not sent
    - Send WS notification to all participants
    - Mark reminder as sent (add reminderSentAt DateTime? to Meeting model)

STEP 5 — Controller + Routes:
  GET    /api/meetings              (authenticated, filter params)
  GET    /api/meetings/my           (authenticated — my meetings as participant)
  GET    /api/meetings/:id          (authenticated)
  POST   /api/meetings              (authenticated)
  PUT    /api/meetings/:id          (authenticated)
  DELETE /api/meetings/:id          (authenticated)
  PUT    /api/meetings/:id/confirm  (authenticated — confirm attendance)

STEP 6 — Register in routes/index.ts:
  meeting: '/api/meetings'
```

**Agent 2 — Frontend**:
```
FILES:
  frontend/src/pages/MeetingPage.tsx         — main page
  frontend/src/components/MeetingModal.tsx   — create/edit modal
  frontend/src/services/meetingService.ts    — API wrapper

MeetingPage.tsx layout:
  Header: "📅 Danh sách cuộc họp" + "Tạo cuộc họp" button (ADMIN/DEPARTMENT_HEAD only)
  
  Tabs: [Tất cả | Của tôi | Hôm nay | Tuần này]
  
  Filters:
    - Search (title) — debounce 300ms
    - Status multi-select: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
    - Date range picker
    - Department select
  
  Table columns:
    STT | Tiêu đề | Ngày | Giờ | Phòng | Người tổ chức | Số người tham dự | Trạng thái | Hành động
  
  Status badges:
    SCHEDULED → blue "Đã lên lịch"
    IN_PROGRESS → yellow "Đang diễn ra"  
    COMPLETED → green "Hoàn thành"
    CANCELLED → red "Đã hủy"
  
  Row actions: [Xem chi tiết] [Sửa - if creator] [Hủy - if creator/ADMIN] [Xác nhận tham dự]
  
  Empty state: "📅 Chưa có cuộc họp nào"
  Loading: skeleton rows (5 rows)

MeetingModal.tsx (create/edit):
  Fields:
    - Tiêu đề* (text input)
    - Chương trình nghị sự (textarea)
    - Ngày họp* (DatePicker)
    - Giờ bắt đầu* (time input "HH:mm")
    - Giờ kết thúc* (time input "HH:mm")
    - Phòng họp (text input)
    - Phòng ban (department select)
    - Người tham dự* (multi-select employee picker, search by name)
    - Ghi chú (textarea)
  
  Validation: endTime > startTime, meetingDate >= today, title required, min 1 participant

Realtime:
  useEffect: window.addEventListener('MEETING_CHANGED', () => refetch())
  Cleanup: return () => window.removeEventListener(...)
  
  Also listen: window.addEventListener('wsReconnected', () => refetch())

Add route in App.tsx: /meetings → MeetingPage
Add Sidebar link: "Cuộc họp" with calendar icon (show for all roles)
```

**Agent 3 — Realtime**:
```
15-minute reminder scheduler (backend/src/index.ts):
  // After server starts:
  setInterval(async () => {
    try { await meetingService.checkUpcomingReminders(); }
    catch(e) { logger.error('Meeting reminder check failed:', e); }
  }, 60_000); // every 60 seconds

Notification content:
  "⏰ Nhắc nhở: Cuộc họp '[title]' sẽ bắt đầu lúc [startTime] ([X] phút nữa)"
  
Broadcast after any meeting change:
  broadcast({ type: 'MEETING_CHANGED' })
  → AuthContext dispatches CustomEvent('MEETING_CHANGED')
  → MeetingPage refetches
```

---

### TASK 11: Supply Adjustment Request
**Status**: NOT STARTED — full implementation needed

**Agent 1 — Backend**:
```
STEP 1 — Prisma Schema (add to common schema):

model SupplyAdjustment {
  id                   String                @id @default(cuid())
  requestCode          String                @unique @default(cuid())
  materialId           String                // WarehouseItem or material reference
  materialName         String                // Denormalized for display
  unit                 String                // Đơn vị
  currentQty           Float                 // Số lượng hiện tại
  requestedQty         Float                 // Số lượng yêu cầu bổ sung
  reason               String                @db.Text
  qualityNotes         String?               @db.Text
  status               SupplyAdjustmentStatus @default(PENDING)
  requestedBy          String                // Employee.id
  approvedBy           String?               // Employee.id
  approvedAt           DateTime?
  rejectionReason      String?
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  requester            Employee              @relation("SupplyAdjustmentRequester", fields: [requestedBy], references: [id])
  approver             Employee?             @relation("SupplyAdjustmentApprover", fields: [approvedBy], references: [id])

  @@map("supply_adjustments")
  @@schema("common")
}

enum SupplyAdjustmentStatus {
  PENDING    // Chờ phê duyệt
  APPROVED   // Đã phê duyệt
  REJECTED   // Từ chối
  COMPLETED  // Đã thực hiện

  @@schema("common")
}

// Add to Employee model:
  supplyAdjustmentsRequested SupplyAdjustment[] @relation("SupplyAdjustmentRequester")
  supplyAdjustmentsApproved  SupplyAdjustment[] @relation("SupplyAdjustmentApprover")

STEP 2 — Migration:
  docker exec erp_backend_local npx prisma migrate dev --name add_supply_adjustment_model

STEP 3 — NotificationType: add SUPPLY_ADJUSTMENT_CREATED | SUPPLY_ADJUSTMENT_APPROVED | SUPPLY_ADJUSTMENT_REJECTED

STEP 4 — SupplyAdjustmentService:

  create(data, requestedByEmployeeId):
    - Generate requestCode: "DCVT-" + yyyyMMdd + "-" + random(4)
    - Validate: requestedQty > 0, materialName required
    - Create record
    - Notify approvers (QC role + ADMIN + WAREHOUSE role):
        notificationService.createNotification({
          userId: approver.userId,
          type: SUPPLY_ADJUSTMENT_CREATED,
          title: 'Yêu cầu điều chỉnh vật tư mới',
          message: `[requester name] yêu cầu bổ sung ${requestedQty} ${unit} ${materialName}`
        })
    - broadcast({ type: 'SUPPLY_ADJUSTMENT_CHANGED' })

  getAll(query: { page, limit, search, status, requestedBy, dateFrom, dateTo }):
    - Include requester and approver employee+user info
    - ADMIN/QC/WAREHOUSE see all; EMPLOYEE sees only own

  getById(id): full detail

  approve(id, approverEmployeeId, isApproved, rejectionReason?):
    - Only ADMIN | QC | WAREHOUSE role can approve
    - Update status → APPROVED or REJECTED
    - Set approvedBy, approvedAt
    - Notify requester:
        type: isApproved ? SUPPLY_ADJUSTMENT_APPROVED : SUPPLY_ADJUSTMENT_REJECTED
        title: isApproved ? 'Yêu cầu điều chỉnh đã được duyệt' : 'Yêu cầu điều chỉnh bị từ chối'
    - broadcast({ type: 'SUPPLY_ADJUSTMENT_CHANGED' })

STEP 5 — Controller + Routes:
  GET  /api/supply-adjustments           (authenticated)
  GET  /api/supply-adjustments/:id       (authenticated)
  POST /api/supply-adjustments           (authenticated)
  PUT  /api/supply-adjustments/:id/approve (ADMIN | QC | WAREHOUSE)
  PUT  /api/supply-adjustments/:id/reject  (ADMIN | QC | WAREHOUSE)

STEP 6 — Register: supplyAdjustment: '/api/supply-adjustments'
```

**Agent 2 — Frontend**:
```
FILES:
  frontend/src/pages/SupplyAdjustmentPage.tsx
  frontend/src/components/SupplyAdjustmentModal.tsx
  frontend/src/services/supplyAdjustmentService.ts

SupplyAdjustmentPage.tsx:
  Header: "🔧 Điều chỉnh vật tư" + "Tạo yêu cầu" button

  Tabs: [Tất cả (ADMIN/QC/WAREHOUSE) | Của tôi]
  
  Filters: search | status | date range

  Table:
    STT | Mã | Tên vật tư | ĐVT | SL hiện tại | SL yêu cầu | Người yêu cầu | Trạng thái | Ngày tạo | Hành động
  
  Status badges: PENDING=yellow | APPROVED=green | REJECTED=red | COMPLETED=blue
  
  Actions:
    - Xem chi tiết (all)
    - Duyệt / Từ chối (ADMIN | QC | WAREHOUSE, status=PENDING only)
  
  Approval inline: show Duyệt button → confirm dialog → call approve API
  Rejection: show Từ chối button → modal with rejection reason textarea

SupplyAdjustmentModal.tsx (create):
  Fields:
    - Tên vật tư* (text or select from material list)
    - Đơn vị* (text)
    - Số lượng hiện tại* (number)
    - Số lượng yêu cầu bổ sung* (number, > 0)
    - Lý do yêu cầu* (textarea)
    - Ghi chú chất lượng (textarea)

Realtime:
  window.addEventListener('SUPPLY_ADJUSTMENT_CHANGED', () => refetch())
  window.addEventListener('wsReconnected', () => refetch())

Add to App.tsx: /supply-adjustments → SupplyAdjustmentPage
Add Sidebar link for QC/WAREHOUSE/ADMIN roles
```

---

### TASK 12: Global Table Filter Formatting + DataTable Component
**Status**: NOT STARTED

**Agent 2 — Frontend (primary)**:
```
CREATE: frontend/src/components/DataTable.tsx

Interface:
  interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (value: unknown, row: T) => React.ReactNode;
    filterable?: boolean;
    filterType?: 'text' | 'select' | 'date-range' | 'multi-select';
    filterOptions?: { value: string; label: string }[]; // for select/multi-select
    sortable?: boolean;
    width?: string;
  }

  interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    total?: number;
    page?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
    onFilterChange?: (filters: Record<string, unknown>) => void;
    emptyMessage?: string;
    emptyIcon?: string;
  }

Features:
  1. Filter row below header: text input (debounce 300ms) | select | date-range | multi-select
  2. Loading state: 5 skeleton rows (animate-pulse gray bars)
  3. Empty state: centered emoji + message "Không có dữ liệu"
  4. Pagination: prev/next + page info "Trang X / Y (Z kết quả)"
  5. Date display: always use toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
  6. Number display: value.toLocaleString('vi-VN') for all numeric columns

CREATE: frontend/src/utils/formatters.ts
  export const formatDate = (date: string | Date): string =>
    new Date(date).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' })
  
  export const formatDateTime = (date: string | Date): string =>
    new Date(date).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  
  export const formatNumber = (n: number): string => n.toLocaleString('vi-VN')
  
  export const formatCurrency = (n: number): string =>
    n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

APPLY DataTable to at minimum these pages (as examples):
  - frontend/src/components/AttendanceManagement.tsx
  - frontend/src/components/LeaveRequestManagement.tsx
  - frontend/src/pages/MeetingPage.tsx (new)
  - frontend/src/pages/SupplyAdjustmentPage.tsx (new)

Each migration:
  1. Replace raw <table> with <DataTable columns={...} data={data} isLoading={loading} ... />
  2. Move filter state up to parent, pass onFilterChange
  3. Remove hardcoded date strings, use formatDate/formatDateTime
  4. Remove hardcoded number strings, use formatNumber
```

---

### TASK 13: Fix All Notification Workflows
**Status**: NOT STARTED — audit required

**Agent 3 — Realtime & Notification**:
```
AUDIT each service file and verify notification + broadcast:

| Workflow | Service file | Required notification | Required broadcast |
|---|---|---|---|
| LeaveRequest created | leaveRequestService.ts | Approver(s) → LEAVE_REQUEST | LEAVE_REQUEST_CHANGED |
| LeaveRequest approved/rejected | leaveRequestService.ts | Requester → LEAVE_REQUEST_RESPONSE | LEAVE_REQUEST_CHANGED |
| Task assigned | taskService.ts | Assignee → TASK | TASK_CHANGED |
| Task status changed | taskService.ts | Creator → TASK | TASK_CHANGED |
| Order status changed | orderService.ts | Sales/Customer contact → ORDER_STATUS_CHANGED | ORDER_CHANGED |
| Payroll created/approved | payrollService.ts | Employee → PAYROLL | PAYROLL_CHANGED |
| QC assigned | qualityEvaluationService.ts | QC personnel → QC_ASSIGNED | QC_CHANGED |
| Warehouse receipt created | warehouseReceiptController | Warehouse staff → WAREHOUSE_CHANGED | WAREHOUSE_CHANGED |
| SupplyRequest status changed | supplyRequestService.ts | Requester → SUPPLY_REQUEST_CHANGED | SUPPLY_REQUEST_CHANGED |
| Meeting created (Task 10) | meetingService.ts | All participants → MEETING_CREATED | MEETING_CHANGED |
| SupplyAdjustment (Task 11) | supplyAdjustmentService.ts | Requester/Approvers → respective | SUPPLY_ADJUSTMENT_CHANGED |

FOR EACH missing notification:
  1. Add NotificationType enum value if missing (backend/src/types/index.ts)
  2. Add notificationService.createNotification() call in service method
  3. Add broadcast() call after DB write
  4. Add Notification model field if new data needed (e.g. orderId, payrollId)

NOTIFICATION ITEM — add action link (frontend):
  frontend/src/components/NotificationBell.tsx
  
  Each notification item should have:
  - Navigate to related entity when clicked:
    TASK → /tasks?id={taskId}
    LEAVE_REQUEST → /leave-requests?id={leaveRequestId}
    PAYROLL → /payroll?id={payrollId}
    MEETING → /meetings?id={meetingId}
    OVERTIME_PLAN → /overtime-plans?id={overtimePlanId}
    SUPPLY_ADJUSTMENT → /supply-adjustments?id={id}
  
  Implementation:
    const getNotificationLink = (notification) => {
      if (notification.taskId) return `/tasks?highlight=${notification.taskId}`;
      if (notification.leaveRequestId) return `/leave-requests?highlight=${notification.leaveRequestId}`;
      // ... etc
      return null;
    };
    // Wrap notification item in <Link to={link}> if link exists
    // After click: markAsRead(notification.id) then navigate
```

---

### TASK 14: Attendance CardView API + Reminder
**Status**: NOT STARTED

**Agent 1 — Backend**:
```
STEP 1 — New endpoint: GET /api/attendance/daily-summary

Query params: date? (default: today, format YYYY-MM-DD)

Response:
  {
    success: true,
    data: {
      date: "2026-04-02",
      summary: {
        totalEmployees: 50,
        present: 30,        // checked in, not out yet
        present_out: 15,    // checked in AND out
        absent: 5           // no check-in at all
      },
      employees: {
        present: [
          { employeeId, employeeCode, firstName, lastName, department, position,
            checkInTime: "08:03", lastCheckTime: "08:03" }
        ],
        present_out: [
          { employeeId, employeeCode, firstName, lastName, department, position,
            checkInTime: "08:01", checkOutTime: "17:02", lastCheckTime: "17:02", workHours: 9.0 }
        ],
        absent: [
          { employeeId, employeeCode, firstName, lastName, department, position }
        ]
      }
    }
  }

Implementation in attendanceService.ts:
  async getDailySummary(date: Date):
    1. Get all ACTIVE employees
    2. Get all attendances for that date (gte dayStart, lte dayEnd)
    3. Group:
       - Has checkIn + checkOut → present_out
       - Has checkIn only → present
       - No attendance record → absent
    4. Return grouped with employee info

STEP 2 — Cron/scheduler for reminders (backend/src/index.ts):
  
  const checkAttendanceReminders = async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 08:00 — notify employees who haven't checked in
    if (hour === 8 && minute === 0) {
      const absentEmployees = await attendanceService.getAbsentEmployees(now);
      for (const emp of absentEmployees) {
        await notificationService.createNotification({
          userId: emp.userId,
          type: NotificationType.ATTENDANCE_REMINDER,
          title: '⏰ Nhắc nhở chấm công',
          message: 'Bạn chưa chấm công vào. Vui lòng điểm danh ngay.',
        });
      }
      // Notify supervisors about absent employees (group by department)
      broadcast({ type: 'ATTENDANCE_SUMMARY_CHANGED' });
    }
    
    // 17:00 — notify employees who checked in but not out
    if (hour === 17 && minute === 0) {
      const presentEmployees = await attendanceService.getPresentNotOutEmployees(now);
      for (const emp of presentEmployees) {
        await notificationService.createNotification({
          userId: emp.userId,
          type: NotificationType.ATTENDANCE_REMINDER,
          title: '⏰ Nhắc nhở chấm công ra',
          message: 'Bạn chưa chấm công ra. Vui lòng điểm danh trước khi rời văn phòng.',
        });
      }
    }
    
    // 22:00 — auto-mark absent, notify supervisor
    if (hour === 22 && minute === 0) {
      const absent = await attendanceService.getAbsentEmployees(now);
      for (const emp of absent) {
        // Create ABSENT attendance record
        await prisma.attendance.create({ data: { employeeId: emp.id, attendanceDate: now, status: 'ABSENT' } });
        // Notify employee
        await notificationService.createNotification({
          userId: emp.userId,
          type: NotificationType.ATTENDANCE_REMINDER,
          title: 'Chấm công vắng mặt',
          message: 'Bạn đã được ghi nhận vắng mặt hôm nay.',
        });
      }
      broadcast({ type: 'ATTENDANCE_SUMMARY_CHANGED' });
    }
  };
  
  setInterval(checkAttendanceReminders, 60_000); // every minute

STEP 3 — NotificationType: add ATTENDANCE_REMINDER

STEP 4 — Helper methods in attendanceService.ts:
  getAbsentEmployees(date: Date): Employee[] — active employees with no attendance today
  getPresentNotOutEmployees(date: Date): Employee[] — attendance with checkIn but no checkOut
```

**Agent 2 — Frontend**:
```
FILE: frontend/src/components/AttendanceManagement.tsx

ADD tab "📊 Tổng quan ngày" (CardView):

CardView layout:
  Date picker (default: today)
  
  Summary cards row:
    [🟢 Có mặt: 30] [✅ Đã ra về: 15] [🔴 Vắng mặt: 5] [👥 Tổng: 50]
    (each card clickable to scroll to that section)
  
  Three sections below:

  Section "🟢 Đang làm việc" (present):
    Employee cards in grid (3 cols desktop, 2 cols tablet, 1 col mobile):
      [ Avatar/initials | Tên | Phòng ban | Vào: 08:03 ]
  
  Section "✅ Đã ra về" (present_out):
      [ Avatar/initials | Tên | Phòng ban | Vào: 08:01 | Ra: 17:02 | 9.0h ]
  
  Section "🔴 Chưa điểm danh" (absent):
      [ Avatar/initials | Tên | Phòng ban | — ]

Loading: skeleton cards
Empty: "Không có dữ liệu cho ngày này"

Realtime:
  window.addEventListener('ATTENDANCE_SUMMARY_CHANGED', () => refetch())
  window.addEventListener('ATTENDANCE_CHANGED', () => refetch())
  window.addEventListener('wsReconnected', () => refetch())

API service method:
  attendanceService.getDailySummary(date: string): Promise<DailySummaryResponse>
  → GET /api/attendance/daily-summary?date=YYYY-MM-DD
```

---

## ✅ ORCHESTRATOR Verification Checklist

After each task, run:

```bash
# 1. TypeScript check
docker exec erp_backend_local npx tsc --noEmit

# 2. Tests
docker exec erp_backend_local npx jest --testPathPattern=<new-test-file>

# 3. Migration check
docker exec erp_backend_local npx prisma migrate status

# 4. API smoke test
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# Test new endpoint
curl -s http://localhost:5001/api/<new-endpoint> -H "Authorization: Bearer $TOKEN"

# 5. Frontend build check
cd frontend && npx tsc --noEmit

# 6. Verify realtime: open browser console, check no WS errors
```

---

## 🚦 Execution Order

```
Phase 1 (Foundation):
  Task 12 — DataTable component + formatters (no dependencies)
  Task 9  — Overtime attendance (schema already done)

Phase 2 (New features):
  Task 10 — Meeting (depends on notification pattern)
  Task 11 — Supply Adjustment (depends on notification pattern)

Phase 3 (Cross-cutting):
  Task 13 — Fix all notifications (depends on Tasks 10+11 being done)
  Task 14 — Attendance CardView (depends on Task 12 DataTable)

Total estimated: 14 agent sessions (2-3 per task)
```

---

## 🔑 Critical Rules for All Agents

1. **Realtime is non-negotiable**: Every list page MUST listen to WS CustomEvent and refetch
2. **Notification for every state change**: Create notification AND send WS push
3. **No hardcoded URLs**: Use `API_BASE_URL` from `frontend/src/config/api.ts`
4. **Migration before code**: Schema change → migration → then write service code
5. **Vietnamese UI**: All labels, placeholders, messages in Vietnamese
6. **Error handling**: Try/catch in every controller method, use typed errors in service
7. **Auth guard**: Every route must have `authenticate` middleware; admin routes + `authorize('ROLE')`
8. **Commit format**: `feat(meeting): add meeting CRUD with realtime notifications`
