# repair-request-lifecycle — Delta Spec (MODIFIED)

## MODIFIED Requirements

### Requirement: RepairRequest status is a typed forward-only enum with 9 values

`RepairRequest.trangThai` SHALL be a Prisma enum `RepairRequestStatus` in `@@schema("common")` with 9 values: `CHO_XU_LY`, `DA_TIEP_NHAN`, `LEN_KE_HOACH`, `DANG_SUA_CHUA`, `CHO_NGHIEM_THU`, `DA_NGHIEM_THU`, `HOAN_THANH`, `DA_HUY`, `TU_CHOI`. Default SHALL remain `CHO_XU_LY`. Migration SHALL add the 5 new enum values via `ALTER TYPE "RepairRequestStatus" ADD VALUE IF NOT EXISTS` (non-transactional on Postgres; tested on staging) before extending transitions. Existing rows SHALL remain valid as sub-path `CHO_XU_LY -> DANG_SUA_CHUA -> HOAN_THANH` of the new 7-step linear order.

#### Scenario: Add enum values is idempotent

- **WHEN** migration runs a second time on a DB that already has the 9 values
- **THEN** no error is thrown and existing rows are untouched

#### Scenario: Old 4-state row stays valid

- **WHEN** an existing row at `CHO_XU_LY` is loaded after migration
- **THEN** `advanceRepairRequestStatus(row.trangThai, 'DANG_SUA_CHUA')` succeeds (direct jump kept for backward compat) and status log is written

### Requirement: Client cannot write trangThai through generic endpoints (unchanged)

See base spec `repair-request-lifecycle`. This requirement SHALL remain as-is; generic `POST/PUT` SHALL still ignore `trangThai`.

### Requirement: Extended business-event endpoints replace simple start-repair

The backend SHALL keep `POST /api/repair-requests/:id/start-repair` (now `LEN_KE_HOACH -> DANG_SUA_CHUA`) and add `PATCH /:id/accept` (`CHO_XU_LY -> DA_TIEP_NHAN`), `PATCH /:id/plan` (`DA_TIEP_NHAN -> LEN_KE_HOACH`), `PATCH /:id/submit-acceptance` (`DANG_SUA_CHUA -> CHO_NGHIEM_THU`), `PATCH /:id/confirm-acceptance` (`CHO_NGHIEM_THU -> DA_NGHIEM_THU` with body `{ ketQua: DAT|KHONG_DAT, chiPhiThucTe? }`), `PATCH /:id/complete` (`DA_NGHIEM_THU -> HOAN_THANH` or `KHONG_DAT` loop `DA_NGHIEM_THU -> DANG_SUA_CHUA`), `PATCH /:id/reject` (-> `TU_CHOI` from `CHO_XU_LY|DA_TIEP_NHAN|LEN_KE_HOACH`). Each SHALL use `prisma.$transaction`, `advanceRepairRequestStatus` with `bypass: actorRole==='ADMIN'`, write `RepairRequestStatusLog`, and emit registry notification. New RBAC: `ADMIN/DEPARTMENT_HEAD/TEAM_LEAD` for `accept/plan/start/submit`, `ADMIN/DEPARTMENT_HEAD` for `confirm/complete/reject/cancel`. `KIEM_TRA` rows SHALL reject `plan/start/submit/confirm` with `ValidationError`.

#### Scenario: New endpoint accept from CHO_XU_LY

- **WHEN** `PATCH /:id/accept` on `CHO_XU_LY`
- **THEN** `trangThai = DA_TIEP_NHAN`, log `CHO_XU_LY -> DA_TIEP_NHAN reason='accept'`

#### Scenario: Reject from CHO_XU_LY branches to TU_CHOI

- **WHEN** `PATCH /:id/reject { reason: 'Không đủ điều kiện' }` on `CHO_XU_LY`
- **THEN** `trangThai = TU_CHOI`, log with `reason='Không đủ điều kiện'`, and subsequent transitions from `TU_CHOI` are rejected as terminal

#### Scenario: Cancel after DANG_SUA_CHUA requires ADMIN

- **WHEN** `PATCH /:id/cancel` from `DANG_SUA_CHUA` with non-ADMIN role
- **THEN** `403` or `ValidationError('Không thể hủy yêu cầu đang sửa chữa')`

#### Scenario: KHONG_DAT loop via confirm-acceptance

- **WHEN** `PATCH /:id/confirm-acceptance { ketQua: 'KHONG_DAT' }` on `DA_NGHIEM_THU`
- **THEN** `trangThai = DANG_SUA_CHUA`, log `reason='acceptance_khong_dat'`, prior handover kept

### Requirement: getAllRepairRequests gains requestType and sourceInspectionRequestId filters

`getAllRepairRequests(page,limit,filters)` SHALL accept `requestType?: RequestType` and `sourceInspectionRequestId?: string` in addition to existing `search, trangThai`. When `requestType` is supplied, `where.requestType = requestType`; when `sourceInspectionRequestId` is supplied, `where.sourceInspectionRequestId = value`. `exportToExcel` SHALL accept same filters. Invalid enum values SHALL be dropped with `logger.warn` as for `trangThai`.

#### Scenario: Filter by requestType SUA_CHUA

- **WHEN** `GET /api/repair-requests?requestType=SUA_CHUA&page=1&limit=20`
- **THEN** only `SUA_CHUA` rows are returned

### Requirement: Frontend exposes expanded enum and requestType

`frontend/src/services/repairRequestService.ts` SHALL export `export type RequestType = 'KIEM_TRA' | 'SUA_CHUA'` and expand `RepairRequestStatus` to 9 values with `STATUS_LABELS` tones mapping the 5 new statuses. `RepairRequestDto` SHALL include `requestType`, `sourceInspectionRequestId`, planning fields, `assignees`, `supplyLinks` when expanded via `GET /:id`. Hooks SHALL include `useRepairRequests({ requestType, trangThai, search, sourceInspectionRequestId, page, limit })`.

#### Scenario: Frontend query key includes requestType

- **WHEN** two components mount `useRepairRequests({ requestType: 'KIEM_TRA' })` and `useRepairRequests({ requestType: 'SUA_CHUA' })`
- **THEN** two separate cache entries exist keyed by different `requestType`
