# repair-planning-and-assignment — Delta Spec

## ADDED Requirements

### Requirement: RepairRequest planning fields for SUA_CHUA

`RepairRequest` (`@@schema("common")`) SHALL gain columns `ngayHoanThienDuKien TIMESTAMPTZ?`, `ngayBatDauKeHoach TIMESTAMPTZ?`, `keHoachChiTiet TEXT?`, `phuongAn TEXT?`, `bienPhapAnToan TEXT?`, `chiPhiDuKien DECIMAL(15,2)?`, `chiPhiThucTe DECIMAL(15,2)?`, `noiDungThucHien TEXT?`, `gioCongThucTe DECIMAL(8,2)?`, `ketQuaNghiemThu NghiemThuKetQua?`, `canNgungMay BOOLEAN DEFAULT false`, `phongBanId VARCHAR(30)?`, `ngayHoanThanhThucTe TIMESTAMPTZ?`. `RepairRequestItem` SHALL gain `phuongAnSua TEXT?`. All columns SHALL be additive (no backfill required beyond defaults); reads SHALL return `null` when unset.

#### Scenario: Create SUA_CHUA with planning fields

- **WHEN** `POST /api/repair-requests` with `requestType=SUA_CHUA` and `keHoachChiTiet`, `phuongAn`, `ngayHoanThienDuKien`, `chiPhiDuKien`
- **THEN** persisted row has those values and `GET /:id` returns them

#### Scenario: KIEM_TRA ignores planning fields

- **WHEN** `POST /api/repair-requests` with `requestType=KIEM_TRA` and `keHoachChiTiet` supplied
- **THEN** service ignores planning fields (stores `null`) and does not throw

### Requirement: RepairRequestAssignee multi-assignee with single lead

`RepairRequestAssignee` SHALL exist in `@@schema("common")`, `@@map("repair_request_assignees")`, `id String @id @default(cuid())`, `repairRequestId Int FK Cascade`, `userId String?`, `userName String?`, `vaiTro AssigneeRole @default(PHU)`, `isLead Boolean @default(false)`, `assignedAt DateTime @default(now())`, `assignedById String?`, `@@unique([repairRequestId, userId])`, `@@index([repairRequestId])`, partial unique index `one_lead_per_request` on `repairRequestId WHERE is_lead = true`. Service SHALL enforce at most one `isLead=true` per `repairRequestId` inside `prisma.$transaction` (demote prior lead when promoting new one); `KIEM_TRA` rows SHALL reject assignee CRUD with `ValidationError`.

#### Scenario: Assign two users, one lead

- **WHEN** `POST /:id/assignees { userId: 'u1', isLead: true }` then `POST /:id/assignees { userId: 'u2', vaiTro: 'PHU' }`
- **THEN** `GET /:id/assignees` returns 2 rows, exactly one with `isLead=true`, ordered with lead first

#### Scenario: Promoting second lead demotes first

- **WHEN** `POST /:id/assignees { userId: 'u3', isLead: true }` on a request that already has lead `u1`
- **THEN** transaction demotes `u1.isLead` to `false`, `u3.isLead` is `true`, still exactly one lead

#### Scenario: KIEM_TRA rejects assignee

- **WHEN** `POST /:id/assignees` on a `KIEM_TRA` row
- **THEN** response is `400` with Vietnamese message and no row is created

### Requirement: Planning transitions enforce SUA_CHUA guard

`PATCH /:id/plan` (`DA_TIEP_NHAN -> LEN_KE_HOACH`) and `PATCH /:id/start` (`LEN_KE_HOACH -> DANG_SUA_CHUA`) SHALL be available only when `requestType = SUA_CHUA`. Zod SHALL validate `ngayHoanThienDuKien` > `ngayBatDauKeHoach` when both present and `chiPhiDuKien >= 0`.

#### Scenario: Plan transition records status log

- **WHEN** `PATCH /:id/plan` with `{ keHoachChiTiet: '...', ngayHoanThienDuKien: '2026-10-10' }` on `DA_TIEP_NHAN`
- **THEN** response has `trangThai = LEN_KE_HOACH` and `GET /:id/status-history` has log `DA_TIEP_NHAN -> LEN_KE_HOACH` with `reason='plan'`
