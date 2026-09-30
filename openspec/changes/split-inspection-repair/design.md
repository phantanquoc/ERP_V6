# Design — split-inspection-repair

## 1. Context

`RepairRequest` hiện là single-table cho mọi yêu cầu thiết bị — 4 trạng thái, không phân biệt kiểm tra/sửa chữa, không có lập kế hoạch, phân công, vật tư, liên kết kho. PDF đặc tả vận hành yêu cầu tách rõ hai giai đoạn: **kiểm tra** (ghi nhận, đề xuất) và **sửa chữa** (kế hoạch, giao việc, vật tư, kho, nghiệm thu). Change này là Phase 1 theo hướng **discriminator** — mở rộng cùng bảng bằng `requestType`, không tách bảng vật lý, để giảm rủi ro migration và giữ tương thích dữ liệu cũ. Phase 2 có thể tách view/materialized split khi có đủ tín hiệu thống kê.

Constraints:
- `RepairRequest.id` là `Int autoincrement` legacy (TODO cuid-migration) — mọi FK tới nó là `Int`; `SupplyRequest.id` là `String cuid` — cầu nối `RepairSupplyLink` phải xử lý cross-type.
- Postgres enum `RepairRequestStatus` thêm giá trị là non-transactional — cần test trên staging.
- Không thêm LLM provider, không đổi `ROUTE_MAP` contract ngoài việc đăng ký thêm routes.
- `ADMIN` bypass mọi ABAC như hiện tại.

## 2. Data Model

### 2.1 ERD (text)

```
RepairRequest (common.repair_requests, PK Int)
  | 1—N RepairRequestItem (common.repair_request_items, PK String cuid)
  |       | N—1 MachineSystem / MachineSystemDetail / FaultRecord
  |       | 1—N RepairMaterialNeed (NEW)
  |       | 1—N RepairSupplyLink (via repairRequestItemId, nullable)
  |       +-- sourceInspectionItemId -> InspectionRequestItem (soft FK)
  | 1—N RepairRequestAssignee (NEW)
  | 1—N RepairSupplyLink (NEW, via repairRequestId)
  | 1—N RepairMaterialNeed (via denormalized repairRequestId)
  | 1—N AcceptanceHandover (common.acceptance_handovers, PK String cuid)
  |       | 1—N AcceptanceHandoverItem
  |       +-- warehouseIssueId -> WarehouseIssue (soft FK)
  | 1—N RepairRequestStatusLog (business.repair_request_status_logs)
  +-- sourceInspectionRequestId -> InspectionRequest (soft FK, when SUA_CHUA from KIEM_TRA)
      requestType: KIEM_TRA | SUA_CHUA (discriminator)
      trangThai: 9 values (see state machine)
```

### 2.2 Prisma Diff (common.prisma)

```prisma
// --- New enums (@@schema("common")) ---
enum RequestType {
  KIEM_TRA
  SUA_CHUA
}

enum AssigneeRole {
  CHINH // lead
  PHU   // member
}

enum NghiemThuKetQua {
  DAT
  KHONG_DAT
}

// --- Extended enum ---
enum RepairRequestStatus {
  CHO_XU_LY
  DA_TIEP_NHAN      // NEW
  LEN_KE_HOACH      // NEW
  DANG_SUA_CHUA
  CHO_NGHIEM_THU    // NEW
  DA_NGHIEM_THU     // NEW
  HOAN_THANH
  DA_HUY
  TU_CHOI           // NEW
}

// --- RepairRequest: add after trangThai ---
model RepairRequest {
  // ... existing fields ...
  requestType               RequestType       @default(SUA_CHUA) @map("request_type")
  sourceInspectionRequestId String?           @db.VarChar(30) @map("source_inspection_request_id")
  ngayHoanThienDuKien       DateTime?         @map("ngay_hoan_thien_du_kien") @db.Timestamptz
  ngayBatDauKeHoach         DateTime?         @map("ngay_bat_dau_ke_hoach") @db.Timestamptz
  keHoachChiTiet            String?           @db.Text @map("ke_hoach_chi_tiet")
  phuongAn                  String?           @db.Text @map("phuong_an")
  bienPhapAnToan            String?           @db.Text @map("bien_phap_an_toan")
  chiPhiDuKien              Decimal?          @db.Decimal(15,2) @map("chi_phi_du_kien")
  chiPhiThucTe              Decimal?          @db.Decimal(15,2) @map("chi_phi_thuc_te")
  noiDungThucHien           String?           @db.Text @map("noi_dung_thuc_hien")
  gioCongThucTe             Decimal?          @db.Decimal(8,2) @map("gio_cong_thuc_te")
  ketQuaNghiemThu           NghiemThuKetQua?  @map("ket_qua_nghiem_thu")
  canNgungMay               Boolean           @default(false) @map("can_ngung_may")
  phongBanId                String?           @db.VarChar(30) @map("phong_ban_id")
  ngayHoanThanhThucTe       DateTime?         @map("ngay_hoan_thanh_thuc_te") @db.Timestamptz

  assignees   RepairRequestAssignee[]
  supplyLinks RepairSupplyLink[]

  @@index([requestType, trangThai])
  @@index([sourceInspectionRequestId])
  @@index([phongBanId])
  @@index([ngayHoanThienDuKien])
}

// --- RepairRequestItem: add fields ---
model RepairRequestItem {
  // ... existing ...
  sourceInspectionItemId String? @db.VarChar(30) @map("source_inspection_item_id")
  phuongAnSua            String? @db.Text @map("phuong_an_sua")

  materialNeeds RepairMaterialNeed[]
  supplyLinks   RepairSupplyLink[]

  @@index([sourceInspectionItemId])
}

// --- AcceptanceHandover: add fields ---
model AcceptanceHandover {
  // ... existing ...
  warehouseIssueId String?          @db.VarChar(30) @map("warehouse_issue_id")
  chiPhiThucTe     Decimal?         @db.Decimal(15,2) @map("chi_phi_thuc_te")
  ketQua           NghiemThuKetQua? @map("ket_qua")

  @@index([warehouseIssueId])
}

// --- NEW tables (all @@schema("common"), cuid PK) ---
model RepairRequestAssignee {
  id              String       @id @default(cuid())
  repairRequestId Int          @map("repair_request_id")
  repairRequest   RepairRequest @relation(fields: [repairRequestId], references: [id], onDelete: Cascade)
  userId          String?      @db.VarChar(30) @map("user_id")
  userName        String?      @map("user_name")
  vaiTro          AssigneeRole @default(PHU) @map("vai_tro")
  isLead          Boolean      @default(false) @map("is_lead")
  assignedAt      DateTime     @default(now()) @map("assigned_at") @db.Timestamptz
  assignedById    String?      @db.VarChar(30) @map("assigned_by_id")
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  @@schema("common")
  @@map("repair_request_assignees")
  @@unique([repairRequestId, userId])
  @@index([repairRequestId])
  @@index([userId])
  @@index([vaiTro])
}

model RepairMaterialNeed {
  id                  String            @id @default(cuid())
  repairRequestId     Int               @map("repair_request_id")
  repairRequest       RepairRequest     @relation(fields: [repairRequestId], references: [id], onDelete: Cascade)
  repairRequestItemId String            @map("repair_request_item_id")
  repairRequestItem   RepairRequestItem @relation(fields: [repairRequestItemId], references: [id], onDelete: Cascade)
  tenVatTu            String            @map("ten_vat_tu")
  maVatTu             String?           @map("ma_vat_tu")
  donVi               String?           @map("don_vi")
  soLuongDuKien       Decimal           @db.Decimal(12,3) @map("so_luong_du_kien")
  soLuongThucTe       Decimal?          @db.Decimal(12,3) @map("so_luong_thuc_te")
  ghiChu              String?           @db.Text @map("ghi_chu")
  createdAt           DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  @@schema("common")
  @@map("repair_material_needs")
  @@index([repairRequestId])
  @@index([repairRequestItemId])
  @@unique([repairRequestItemId, tenVatTu])
}

model RepairSupplyLink {
  id                  String             @id @default(cuid())
  repairRequestId     Int                @map("repair_request_id")
  repairRequest       RepairRequest      @relation(fields: [repairRequestId], references: [id], onDelete: Cascade)
  repairRequestItemId String?            @map("repair_request_item_id")
  repairRequestItem   RepairRequestItem? @relation(fields: [repairRequestItemId], references: [id], onDelete: SetNull)
  supplyRequestId     String             @db.VarChar(30) @map("supply_request_id")
  supplyRequestItemId String?            @db.VarChar(30) @map("supply_request_item_id")
  soLuong             Decimal?           @db.Decimal(12,3)
  ghiChu              String?            @db.Text @map("ghi_chu")
  createdById         String?            @db.VarChar(30) @map("created_by_id")
  createdAt           DateTime           @default(now()) @map("created_at") @db.Timestamptz

  @@schema("common")
  @@map("repair_supply_links")
  @@index([repairRequestId])
  @@index([repairRequestItemId])
  @@index([supplyRequestId])
  @@unique([repairRequestItemId, supplyRequestId])
}
```

### 2.3 Migration SQL Sketch (xxx_split_inspection_repair_phase1)

```sql
-- 1. Create new enum types (common schema)
CREATE TYPE "common"."RequestType" AS ENUM ('KIEM_TRA', 'SUA_CHUA');
CREATE TYPE "common"."AssigneeRole" AS ENUM ('CHINH', 'PHU');
CREATE TYPE "common"."NghiemThuKetQua" AS ENUM ('DAT', 'KHONG_DAT');

-- 2. Extend RepairRequestStatus (non-transactional on Postgres < 12)
-- Prisma migrate handles this, but manual alternative:
ALTER TYPE "common"."RepairRequestStatus" ADD VALUE IF NOT EXISTS 'DA_TIEP_NHAN';
ALTER TYPE "common"."RepairRequestStatus" ADD VALUE IF NOT EXISTS 'LEN_KE_HOACH';
ALTER TYPE "common"."RepairRequestStatus" ADD VALUE IF NOT EXISTS 'CHO_NGHIEM_THU';
ALTER TYPE "common"."RepairRequestStatus" ADD VALUE IF NOT EXISTS 'DA_NGHIEM_THU';
ALTER TYPE "common"."RepairRequestStatus" ADD VALUE IF NOT EXISTS 'TU_CHOI';

-- 3. RepairRequest: add columns
ALTER TABLE "common"."repair_requests"
  ADD COLUMN "request_type" "common"."RequestType" DEFAULT 'SUA_CHUA',
  ADD COLUMN "source_inspection_request_id" VARCHAR(30),
  ADD COLUMN "ngay_hoan_thien_du_kien" TIMESTAMPTZ,
  ADD COLUMN "ngay_bat_dau_ke_hoach" TIMESTAMPTZ,
  ADD COLUMN "ke_hoach_chi_tiet" TEXT,
  ADD COLUMN "phuong_an" TEXT,
  ADD COLUMN "bien_phap_an_toan" TEXT,
  ADD COLUMN "chi_phi_du_kien" DECIMAL(15,2),
  ADD COLUMN "chi_phi_thuc_te" DECIMAL(15,2),
  ADD COLUMN "noi_dung_thuc_hien" TEXT,
  ADD COLUMN "gio_cong_thuc_te" DECIMAL(8,2),
  ADD COLUMN "ket_qua_nghiem_thu" "common"."NghiemThuKetQua",
  ADD COLUMN "can_ngung_may" BOOLEAN DEFAULT false,
  ADD COLUMN "phong_ban_id" VARCHAR(30),
  ADD COLUMN "ngay_hoan_thanh_thuc_te" TIMESTAMPTZ;

-- Backfill existing rows, then enforce NOT NULL
UPDATE "common"."repair_requests" SET "request_type" = 'SUA_CHUA' WHERE "request_type" IS NULL;
ALTER TABLE "common"."repair_requests" ALTER COLUMN "request_type" SET NOT NULL;
ALTER TABLE "common"."repair_requests" ALTER COLUMN "request_type" SET DEFAULT 'SUA_CHUA';

CREATE INDEX "repair_requests_request_type_trang_thai_idx" ON "common"."repair_requests"("request_type", "trang_thai");
CREATE INDEX "repair_requests_source_inspection_request_id_idx" ON "common"."repair_requests"("source_inspection_request_id");
CREATE INDEX "repair_requests_phong_ban_id_idx" ON "common"."repair_requests"("phong_ban_id");
CREATE INDEX "repair_requests_ngay_hoan_thien_du_kien_idx" ON "common"."repair_requests"("ngay_hoan_thien_du_kien");

-- 4. RepairRequestItem: add columns
ALTER TABLE "common"."repair_request_items"
  ADD COLUMN "source_inspection_item_id" VARCHAR(30),
  ADD COLUMN "phuong_an_sua" TEXT;
CREATE INDEX "repair_request_items_source_inspection_item_id_idx" ON "common"."repair_request_items"("source_inspection_item_id");

-- 5. AcceptanceHandover: add columns
ALTER TABLE "common"."acceptance_handovers"
  ADD COLUMN "warehouse_issue_id" VARCHAR(30),
  ADD COLUMN "chi_phi_thuc_te" DECIMAL(15,2),
  ADD COLUMN "ket_qua" "common"."NghiemThuKetQua";
CREATE INDEX "acceptance_handovers_warehouse_issue_id_idx" ON "common"."acceptance_handovers"("warehouse_issue_id");

-- 6. New tables
CREATE TABLE "common"."repair_request_assignees" (...);
CREATE TABLE "common"."repair_material_needs" (...);
CREATE TABLE "common"."repair_supply_links" (...);
-- (see Prisma @@map for exact column names; cuid PK = VARCHAR(30))

-- 7. Optional: partial unique index for single lead per request (enforced also in service)
CREATE UNIQUE INDEX "one_lead_per_request" ON "common"."repair_request_assignees"("repair_request_id") WHERE "is_lead" = true;
```

> Note: If Postgres version < 12, `ADD VALUE IF NOT EXISTS` inside a transaction may fail — generate migration with `--create-only` and run enum alters outside transaction on staging.

## 3. State Machines

### 3.1 Repair lifecycle (SUA_CHUA) — forward-only + branches

```
CHO_XU_LY ──accept──> DA_TIEP_NHAN ──plan──> LEN_KE_HOACH ──start──> DANG_SUA_CHUA ──submit──> CHO_NGHIEM_THU ──confirm(DAT)──> DA_NGHIEM_THU ──complete──> HOAN_THANH
    │                     │                    │                        │                       │
    │                     │                    │                        │                       └──confirm(KHONG_DAT)──> DANG_SUA_CHUA (loop, keep handover record)
    │                     │                    │                        │
    └──── TU_CHOI ◄───────┘                    └──── TU_CHOI ◄──────────┘
    └──── DA_HUY  (only before DANG_SUA_CHUA; after that only ADMIN bypass)
```

Rules:
- `advanceStatus(current, next, bypass=ADMIN)` — `ADMIN` bypasses forward-only check.
- `TU_CHOI` allowed only from `CHO_XU_LY | DA_TIEP_NHAN | LEN_KE_HOACH`. Terminal, no outgoing.
- `DA_HUY` allowed from `CHO_XU_LY | DA_TIEP_NHAN | LEN_KE_HOACH` for normal roles; `ADMIN` may cancel up to `CHO_NGHIEM_THU` (not after `DA_NGHIEM_THU`).
- `DA_NGHIEM_THU --KHONG_DAT--> DANG_SUA_CHUA` — only valid loop; creates new `AcceptanceHandover` attempt, prior record kept.
- `CHO_XU_LY -> DANG_SUA_CHUA` direct jump kept for backward compat (old 4-state path) but new UI uses stepwise transitions.
- Every transition writes `RepairRequestStatusLog { oldStatus, newStatus, actorId, actorRole, reason }`.

```typescript
// REPAIR_STATUS_ORDER — forward-only index
const REPAIR_STATUS_ORDER: RepairRequestStatus[] = [
  'CHO_XU_LY', 'DA_TIEP_NHAN', 'LEN_KE_HOACH',
  'DANG_SUA_CHUA', 'CHO_NGHIEM_THU', 'DA_NGHIEM_THU', 'HOAN_THANH',
];
// TU_CHOI and DA_HUY are terminal branches, not in linear order.
// advanceRepairRequestStatus(current, next, isAdmin) enforces:
// - if isAdmin: allow any forward jump; still block backward except KHONG_DAT loop
// - KHONG_DAT loop: DA_NGHIEM_THU -> DANG_SUA_CHUA allowed regardless of order
// - TU_CHOI: only from CHO_XU_LY, DA_TIEP_NHAN, LEN_KE_HOACH
// - DA_HUY: only before DANG_SUA_CHUA (or ADMIN up to CHO_NGHIEM_THU)
```

### 3.2 Inspection lifecycle (KIEM_TRA) — short path

```
CHO_XU_LY ──accept──> DA_TIEP_NHAN ──complete──> HOAN_THANH
    │                     │
    └──── TU_CHOI ◄───────┘
    └──── DA_HUY
```

- No `LEN_KE_HOACH / DANG_SUA_CHUA / CHO_NGHIEM_THU / DA_NGHIEM_THU` — service guards `requestType=KIEM_TRA` against those transitions.
- No material-need / supply-link / warehouseIssue — service rejects those sub-resources for KIEM_TRA.
- On `HOAN_THANH`, inspection items become source for `SUA_CHUA` creation (see 2.2).

## 4. API Design

### 4.1 Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /repair-requests?requestType=&trangThai=&sourceInspectionRequestId=&search=&page=&limit= | List (filter by discriminator) | authenticate |
| POST | /repair-requests | Create (requestType, sourceInspectionRequestId, items with phuongAnSua) | authenticate |
| GET | /repair-requests/:id | Detail (include assignees, materialNeeds, supplyLinks, handovers, logs) | authenticate |
| PUT | /repair-requests/:id | Update header + items (delete-then-recreate items, immutable requestType) | authenticate |
| PATCH | /repair-requests/:id/accept | CHO_XU_LY → DA_TIEP_NHAN | authenticate, checkAccess |
| PATCH | /repair-requests/:id/plan | DA_TIEP_NHAN → LEN_KE_HOACH (body: keHoachChiTiet, phuongAn, ...) | authenticate, checkAccess |
| PATCH | /repair-requests/:id/start | LEN_KE_HOACH → DANG_SUA_CHUA (existing) | authenticate, checkAccess |
| PATCH | /repair-requests/:id/submit-acceptance | DANG_SUA_CHUA → CHO_NGHIEM_THU | authenticate, checkAccess |
| PATCH | /repair-requests/:id/confirm-acceptance | CHO_NGHIEM_THU → DA_NGHIEM_THU (body: ketQua DAT|KHONG_DAT, chiPhiThucTe) | authenticate, checkAccess |
| PATCH | /repair-requests/:id/reject | → TU_CHOI (body: reason) | authenticate, checkAccess |
| PATCH | /repair-requests/:id/cancel | → DA_HUY (body: reason) | authenticate, checkAccess |
| PATCH | /repair-requests/:id/complete | DA_NGHIEM_THU → HOAN_THANH | authenticate, checkAccess |
| GET | /repair-requests/:id/status-history | Logs with actorName hydration | authenticate |
| POST | /repair-requests/:id/assignees | Add assignee { userId, vaiTro, isLead } | authenticate |
| DELETE | /repair-requests/:id/assignees/:assigneeId | Remove assignee | authenticate |
| GET | /repair-requests/:id/assignees | List assignees | authenticate |
| POST | /repair-requests/:id/material-needs | Add material need { repairRequestItemId, tenVatTu, soLuongDuKien, ... } | authenticate |
| PUT | /repair-requests/:id/material-needs/:needId | Update material need | authenticate |
| DELETE | /repair-requests/:id/material-needs/:needId | Remove | authenticate |
| GET | /repair-requests/:id/material-needs | List | authenticate |
| POST | /repair-requests/:id/supply-links | Link supply { supplyRequestId, repairRequestItemId?, soLuong } | authenticate |
| DELETE | /repair-requests/:id/supply-links/:linkId | Unlink | authenticate |
| GET | /repair-requests/:id/supply-links | List with supplyRequest summary | authenticate |

All responses use envelope `{ success: boolean; message?: string; data?: T; pagination?: { page, limit, total, totalPages } }`.

### 4.2 Request / Response Shapes

```typescript
// POST /repair-requests — create
// Request body (Zod)
{
  requestType?: 'KIEM_TRA' | 'SUA_CHUA', // default SUA_CHUA
  sourceInspectionRequestId?: string | null, // required if SUA_CHUA from inspection
  mucDoUuTien: string,
  ghiChu?: string,
  // planning fields (SUA_CHUA only, optional at create)
  ngayHoanThienDuKien?: string, // ISO date
  ngayBatDauKeHoach?: string,
  keHoachChiTiet?: string,
  phuongAn?: string,
  bienPhapAnToan?: string,
  canNgungMay?: boolean,
  phongBanId?: string,
  chiPhiDuKien?: number,
  items: Array<{
    machineSystemId?: string,
    machineSystemDetailId?: string,
    faultRecordId?: string, // must be DANG_THEO_DOI | TAI_PHAT
    tenHeThong: string,
    tinhTrangThietBi: string,
    loaiLoi: string,
    noiDungLoi: string,
    sourceInspectionItemId?: string,
    phuongAnSua?: string,
  }>,
  fileDinhKem?: string,
}

// GET /repair-requests — query
// ?requestType=KIEM_TRA|SUA_CHUA&trangThai=CHO_XU_LY&sourceInspectionRequestId=xxx&search=...&page=1&limit=20

// Detail includes (expanded)
{
  ...repairRequest,
  items: [...with machineSystem, machineSystemDetail, faultRecord, materialNeeds],
  assignees: [...],
  supplyLinks: [...with supplyRequest summary],
  acceptanceHandovers: [...with items],
  _count: { items, assignees, supplyLinks }
}
```

### 4.3 RBAC Matrix

| Action | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|--------|-------|-----------------|-----------|----------|
| Create KIEM_TRA/SUA_CHUA | yes | yes | yes | yes |
| Accept / Plan | yes (bypass) | yes | yes | no (checkDepartment) |
| Start repair | yes | yes | yes | no |
| Submit/Confirm acceptance | yes | yes | yes | no |
| Reject / Cancel (before DANG_SUA_CHUA) | yes | yes | yes | no |
| Cancel after DANG_SUA_CHUA | yes (bypass) | no | no | no |
| Assignee / Material / SupplyLink CRUD | yes | yes | yes | no |
| View list/detail/history | yes | yes | yes | yes (own or department) |

Middleware chain: `authenticate` → `authorize(...roles)` or `checkAccess({ allowedRoles, checkDepartment })` → controller. `ADMIN` early-return `next()`.

### 4.4 Validation (Zod)

- `requestType` enum, `sourceInspectionRequestId` nullable — cross-check: if `requestType=KIEM_TRA` then must be null.
- `ngayHoanThienDuKien` > `ngayBatDauKeHoach` when both present.
- `chiPhiDuKien`, `chiPhiThucTe`, `soLuongDuKien` >= 0, decimal precision enforced.
- `faultRecordId` validated against `FaultRecord` existence + status in `[DANG_THEO_DOI, TAI_PHAT]`.
- `supplyRequestId` validated against `SupplyRequest` existence.
- `isLead` uniqueness enforced in service transaction (partial unique index as safety net).

## 5. Frontend Architecture

### 5.1 Tab Chung Layout

```
RepairTab (tab Chung)
├── RepairTabFilter — segmented control [Kiểm tra | Sửa chữa] + status filter + search
│     sync URL: ?type=kiem_tra|sua_chua&status=CHO_XU_LY&q=...&page=1
├── RepairList — table (desktop) / cards (mobile)
│     columns: maYeuCau, requestType badge, trangThai badge, mucDoUuTien, ngayThang, assignee avatars, actions
│     row click -> open RepairDetailPanel (drawer/modal) with deep-link ?id=...
└── RepairDetailPanel (drawer)
      ├── Header: maYeuCau, requestType, status badge, timeline
      ├── PlanningSection (SUA_CHUA only): dates, phuongAn, bienPhapAnToan, canNgungMay, phongBan
      ├── CostSection (SUA_CHUA): chiPhiDuKien/ThucTe, gioCongThucTe, noiDungThucHien
      ├── AssigneeList: avatars, vaiTro, isLead crown, add/remove
      ├── MaterialNeedTable: tenVatTu, donVi, soLuongDuKien/ThucTe, edit/delete
      ├── SupplyLinkPanel: linked SupplyRequests, create/link/unlink, status chips, deep-link to Cung ung
      ├── AcceptanceSection (SUA_CHUA): handovers, warehouseIssue link, ketQua badge, DAT/KHONG_DAT actions
      └── StatusTimeline: RepairRequestStatusLog entries with actor + reason
```

### 5.2 Hooks & Query Keys

```typescript
// Query key factory
const repairKeys = {
  all: ['repairRequests'] as const,
  lists: (type?: RequestType, status?: RepairRequestStatus, page?: number, limit?: number) =>
    [...repairKeys.all, 'list', type, status, page, limit] as const,
  detail: (id: number) => [...repairKeys.all, 'detail', id] as const,
  assignees: (id: number) => [...repairKeys.all, 'assignees', id] as const,
  materialNeeds: (id: number) => [...repairKeys.all, 'materialNeeds', id] as const,
  supplyLinks: (id: number) => [...repairKeys.all, 'supplyLinks', id] as const,
};

// Hooks
useRepairRequests({ requestType, trangThai, search, page, limit }) // GET /
useRepairRequest(id)                                              // GET /:id
useCreateRepairRequest()  // invalidates lists
useUpdateRepairRequest()  // invalidates detail + lists
useRepairStatusTransition() // accept/plan/start/submit/confirm/reject/cancel/complete
useRepairAssignees(id)    // GET /:id/assignees
useAssignUser() / useUnassignUser() // invalidates detail + assignees
useRepairMaterialNeeds(id)
useUpsertMaterialNeed() / useRemoveMaterialNeed()
useRepairSupplyLinks(id)
useLinkSupplyRequest() / useUnlinkSupplyRequest()
```

Invalidation: after any mutation on `/:id/*`, invalidate `repairKeys.detail(id)` and `repairKeys.lists()`. Supply-link mutations also invalidate relevant `supplyRequest` queries if linked.

### 5.3 URL & Navigation

- Tab filter syncs to `searchParams`: `?type=kiem_tra|sua_chua&status=CHO_XU_LY&q=&page=1`
- Detail deep-link: `?type=sua_chua&id=123` — on mount, if `id` present, auto-open detail drawer.
- Cross-link: `SupplyLinkPanel` renders `<Link to="/supply-requests?id={supplyRequestId}">` and `SupplyRequestTab` renders reverse chip `<Link to="/repairs?type=sua_chua&id={repairRequestId}">`.

### 5.4 Components File Map

```
frontend/src/
  hooks/
    useRepairRequests.ts        // expanded
    useRepairAssignees.ts       // NEW
    useRepairMaterialNeeds.ts   // NEW
    useRepairSupplyLinks.ts     // NEW
  services/
    repairRequestService.ts     // expanded API client
  components/repair/
    RepairTab.tsx               // updated (filter + 2 views)
    RepairTabFilter.tsx         // NEW
    RepairRequestForm.tsx       // updated (branch by requestType, source picker)
    RepairDetailPanel.tsx       // NEW (main detail drawer)
    RepairAssigneeList.tsx      // NEW
    RepairMaterialNeedTable.tsx // NEW
    RepairSupplyLinkPanel.tsx   // NEW
    RepairAcceptanceSection.tsx // NEW
    RepairStatusTimeline.tsx    // NEW
```

## 6. Warehouse Integration — Full Chain YCCC -> YCBS -> YCMH -> Kho

### 6.1 RepairSupplyLink — Bridge Int ↔ String (single source: YCCC)

- `RepairRequest.id` is `Int` (legacy), `SupplyRequest.id` is `String cuid` — no DB FK cross-type.
- `RepairSupplyLink` stores both `repairRequestId Int` (FK cascade) and `supplyRequestId String` (validated in service via `prisma.supplyRequest.findUnique`). Khong them cot `replenishmentRequestId` / `purchaseRequestId` tren link — giu single source `supplyRequestId`.
- Granularity: `repairRequestItemId` nullable — if set, link is per-item; if null, link is per-request (header-level). Unique `[repairRequestItemId, supplyRequestId]` prevents double-linking same item to same supply request.
- Indexes on both FKs + `supplyRequestId` for reverse lookup ("which repairs does this supply serve?").
- Cac nac sau YCCC duoc truy vet qua FK san co, khong can schema moi:
  - `SupplyRequestItem --1:N--> SupplyRequestDecision { triggeredReplenishmentRequestId String? @db.VarChar(30) FK SetNull -> ReplenishmentRequest, decidedAt, shortageQty, reason }` — decision moi nhat co `triggeredReplenishmentRequestId != null` la cau noi toi YCBS.
  - `ReplenishmentRequest.convertedPurchaseRequestId String? @unique FK SetNull -> PurchaseRequest` (relation `ReplenishmentToPurchase`) — cau noi YCBS -> YCMH, 1 YCBS = 1 YCMH.
  - `PurchaseRequest --1:1--> InboundPlan { purchaseRequestId @unique, maKeHoach KH-NH-YYYY-NNN, trangThai "Cho nhap"|"Da nhap"|"Qua han"|"Da huy" }` va `WarehouseReceipt { purchaseRequestId, inboundPlanId } -> LotProduct`.
  - `SupplyRequest --1:N--> OutboundPlan { supplyRequestId, KH-XH-YYYY-NNN }` va `WarehouseIssue { supplyRequestId, outboundPlanId }` — phieu xuat hoan tra cho YCCC goc.
  - Legacy path `SupplyRequestDecision.triggeredPurchaseRequestId` (YCCC -> YCMH truc tiep, SHORTAGE cu) van duoc ton trong khi resolve chain (fallback neu khong co YCBS).

### 6.2 Fulfillment Flow — End-to-End Chain

```
RepairRequest (SUA_CHUA, LEN_KE_HOACH/DANG_SUA_CHUA)
  |  YCCC la OPTIONAL: SC co the khong can vat tu (sua chua khong thay the linh kien) -> khong co RepairSupplyLink van di thang B7. Khi can vat tu moi thuc hien buoc 1-2:
  | 1. User adds RepairMaterialNeed (tenVatTu, soLuongDuKien) per RepairRequestItem
  | 2. Click "Tao YC vat tu" in SupplyLinkPanel (actor = nguoi bam nut, Bao hay Cuong deu duoc — lay tu req.user.id, khong rang buoc phai la assignee)
  |      -> POST /supply-requests { items: materialNeeds }  (YCCC, trangThai "Chua cung cap")
  |      -> POST /repair-requests/:id/supply-links { supplyRequestId, repairRequestItemId? }
  |         RepairSupplyLink chi luu goc YCCC. YCCC van hoat dong doc lap nhu cu (tao tu tab Cung ung, chua link toi SC van hop le, co the link sau).
  |
  v
SupplyRequest (YCCC) + SupplyRequestItem { fulfillmentStatus "Cho xu ly" }
  |
  | 3. Kho xu ly tung item: POST /supply-requests/:id/decide
  |      -> SupplyRequestDecision { decision, fulfilledQty, shortageQty, reason, triggeredReplenishmentRequestId? }
  |      - Neu du ton: decision "Cap du" — khong sinh them gi, sau do WarehouseIssue tru ton
  |      - Neu thieu: decision "Chuyen thu mua" | "Khong cap", shortageQty > 0
  |        -> warehouse tao ReplenishmentRequest (YCBS) gom shortage theo phanLoaiGroup
  |           ReplenishmentRequest { maYeuCau YC-BS-YYYY-NNN, trangThai "Cho bao gia", employeeId = SupplyRequest.employeeId }
  |           decision.triggeredReplenishmentRequestId = YCBS.id
  |
  v
ReplenishmentRequest (YCBS, "Cho bao gia") + ReplenishmentRequestItem { nhaCungCapId=null, giaDuKien=null }
  |
  | 4. Purchasing mo YCBS, dien gia/NCC tung item, convert:
  |      -> POST /replenishment-requests/:id/convert  (atomically)
  |         - Tao PurchaseRequest (YCMH) { maYeuCau YC-MH-..., sourceType=SHORTAGE|REORDER, trangThai "Cho duyet",
  |           items copy giaDuKien tu YCBS }
  |         - Set ReplenishmentRequest.convertedPurchaseRequestId = PurchaseRequest.id (@unique)
  |         - Set ReplenishmentRequest.trangThai = "Da chuyen mua hang"   (1 YCBS -> 1 YCMH)
  |
  v
PurchaseRequest (YCMH, "Cho duyet") + PurchaseRequestItem { giaDuKien, giaThucTe?=giaDuKien }
  |
  | 5. YCMH duyet: PATCH /purchase-requests/:id/approve { nguoiDuyet, ngayDuyet }
  |      -> InboundPlan { purchaseRequestId @unique, maKeHoach KH-NH-YYYY-NNN, trangThai "Cho nhap", warehouseId }
  |
  v
InboundPlan (KH-NH-..., "Cho nhap")
  |
  | 6. Hang ve: POST /purchase-requests/:id/confirm-actual-price { giaThucTe, soLuongThucTe }
  |      -> WarehouseReceipt { purchaseRequestId, inboundPlanId } + WarehouseReceiptItem[] -> LotProduct (+soLuong, giaThanh bq gia quyen)
  |      -> InboundPlan.trangThai = "Da nhap"
  |
  v
OutboundPlan (KH-XH-..., supplyRequestId) + WarehouseIssue { supplyRequestId, outboundPlanId }
  |  cap lai cho YCCC goc, update SupplyRequestItem.fulfilledQty / fulfillmentStatus -> "Da cap mot phan" | "Da cap du"
  v
AcceptanceHandover { repairRequestId, warehouseIssueId, ketQua DAT|KHONG_DAT, chiPhiThucTe }
  -> If KHONG_DAT: DA_NGHIEM_THU -> DANG_SUA_CHUA (loop), prior handover kept
  -> If DAT: DA_NGHIEM_THU -> HOAN_THANH
```

Diagram tom tat (text):

```
RepairRequest --< RepairSupplyLink >-- SupplyRequest (YCCC)
                                      --< SupplyRequestItem >-- SupplyRequestDecision
                                                                  | triggeredReplenishmentRequestId
                                                                  v
                                                            ReplenishmentRequest (YCBS)
                                                                  | convertedPurchaseRequestId (@unique)
                                                                  v
                                                            PurchaseRequest (YCMH) --1:1--> InboundPlan --< WarehouseReceipt
                                                                  |                              |
                                                                  +--< WarehouseIssue <--> OutboundPlan
                                                                                              |
                                                                                              v
                                                                        AcceptanceHandover.warehouseIssueId
```

Giai thich quyet dinh thiet ke:

- **Khong doi schema RepairSupplyLink**: them cot YCBS/YCMH tren link se duplicate nguon su that (FK da ton tai tren Decision va ReplenishmentRequest) va tao nguy co lech du lieu khi YCBS convert. Truy vet qua existing FKs dam bao tinh nhat quan va tan dung index san co `[triggeredReplenishmentRequestId]`, `[convertedPurchaseRequestId]`, `[supplyRequestId]`.
- **Batch resolve tranh N+1**: `resolveSupplyChain(supplyRequestIds: string[])` gom tat ca `supplyRequestId` tu links, query `SupplyRequestItem WHERE supplyRequestId IN (...)`, roi `SupplyRequestDecision WHERE supplyRequestItemId IN (...) AND triggeredReplenishmentRequestId IS NOT NULL ORDER BY decidedAt DESC` lay decision moi nhat per item, sau do `ReplenishmentRequest WHERE id IN (...)` va `PurchaseRequest WHERE id IN (convertedPurchaseRequestIds)` + `InboundPlan WHERE purchaseRequestId IN (...)` + `WarehouseIssue WHERE supplyRequestId IN (...)`. Ket qua hydrate vao `GET /:id/supply-chain` va `GET /:id` detail.
- **Unlink semantics**: `DELETE /:id/supply-links/:linkId` chi xoa row link, khong cascade toi YCBS/YCMH/InboundPlan/WarehouseReceipt/WarehouseIssue da sinh ra (chung thuoc vong doi kho/mua hang doc lap).

### 6.3 Reverse Link Display — Ca 3 Cap Deu Co Chip

- `GET /supply-requests/:id` — if any `RepairSupplyLink.supplyRequestId = :id`, include `repairLinks: [{ repairRequestId, maYeuCau, trangThai }]` in response (or via `GET /repair-requests/:id/supply-links` reverse query).
- `GET /replenishment-requests/:id/repair-links` (or enriched `repairLinks` meta on `GET /replenishment-requests/:id`) — resolve `ReplenishmentRequest <- SupplyRequestDecision.triggeredReplenishmentRequestId <- SupplyRequestItem.supplyRequestId -> RepairSupplyLink` to return `repairLinks` for YCBS. Cho phep tab Kho / YCBS hien chip "Phuc vu SC #YC-SC-...".
- `GET /purchase-requests/:id/repair-links` (or enriched `repairLinks` meta on `GET /purchase-requests/:id`) — resolve them hop `ReplenishmentRequest.convertedPurchaseRequestId` (YCBS -> YCMH) roi nguoc ve RepairRequest nhu tren. Cho phep tab Mua hang / YCMH hien chip "Phuc vu SC #YC-SC-...".
- Frontend: `SupplyRequestTab` / `WarehouseIssueTab` / Purchasing tabs deu dung chung component `<RepairChainChips chain={...}>` de nhat quan. Trong `RepairDetailPanel.SupplyLinkPanel`, hien timeline 3 tang: `[YCCC chip trangThai] -> (neu co) [YCBS YC-BS-... badge Cho bao gia/Da chuyen] -> [YCMH YC-MH-... badge Cho duyet/Da duyet]` voi mui ten, tooltip `reason/shortageQty`, deep-link toi `/replenishment-requests?id=...` va `/purchase-requests?id=...`; khi chua co YCBS/YCMH hien placeholder "Chua phat sinh bo sung".

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Enum ADD VALUE non-transactional | Test on staging, use `IF NOT EXISTS`, consider `prisma migrate --create-only` + manual SQL |
| Cross-type FK no DB enforcement | Service validation + indexes + unique constraint; add periodic consistency check |
| Old FE shows wrong badge for new statuses | Map new statuses to colors, fallback label; feature-flag new tab filter |
| Partial unique index for isLead race | Service transaction + `SELECT ... FOR UPDATE` or `ON CONFLICT` handling |
| Long detail drawer on mobile | Collapsible sections, tabs inside drawer for Planning/Material/Supply/Acceptance |

## 8. Migration & Rollback

- Migration is DDL + backfill, no data deletion — rollback is `DROP COLUMN` / `DROP TABLE` for new objects + enum values remain (harmless, Postgres cannot drop enum values without recreate).
- Code rollback: revert service/controller/route/schema/FE files; old 4-state path still valid as sub-path of new machine.
- Deploy: rebuild backend container (`npx prisma generate` + `migrate deploy`), rebuild frontend via Vite.

## 9. Open Questions

- Mã phiếu kiểm tra có nên tách prefix `YC-KT` thay vì chung `YC-SC`? Phase 1 giữ `YC-SC` để không đổi `generateRepairRequestCode`; Phase 2 có thể tách khi có discriminator thống kê.
- Có cần field `InspectionResult` (kết quả kiểm tra: BINH_THUONG / CAN_SUA_CHUA / NGUY_HIEM) trên KIEM_TRA? Defer — hiện dùng `ghiChu` + items.
- `phongBanId` soft ref có cần FK thật khi Department ở `business` schema? Giữ soft để tránh cross-schema FK cycle.
