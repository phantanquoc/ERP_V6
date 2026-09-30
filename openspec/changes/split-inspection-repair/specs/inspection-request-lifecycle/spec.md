# inspection-request-lifecycle — Delta Spec

## ADDED Requirements

### Requirement: RepairRequest discriminator separates inspection from repair

`RepairRequest` SHALL have field `requestType: RequestType` (`KIEM_TRA | SUA_CHUA`, `@@schema("common")`, `@default(SUA_CHUA)`, `@map("request_type")`). Every `RepairRequest` row SHALL have exactly one `requestType`. `GET /api/repair-requests` SHALL accept optional query `requestType` and filter by it. `POST /api/repair-requests` SHALL accept `requestType` in body (default `SUA_CHUA` when omitted). Existing rows SHALL be backfilled to `SUA_CHUA` in the same migration before `SET NOT NULL`. `repair-request-lifecycle` MODIFIED spec defines the extended status enum that applies to both types.

#### Scenario: Backfill preserves existing rows as SUA_CHUA

- **WHEN** migration `xxx_split_inspection_repair_phase1` runs on a DB with N existing RepairRequests where `request_type` is NULL
- **THEN** after migration every row has `request_type = 'SUA_CHUA'` and `SELECT count(*) WHERE request_type IS NULL` is 0

#### Scenario: Create inspection request

- **WHEN** `POST /api/repair-requests` with `{ requestType: 'KIEM_TRA', mucDoUuTien: 'CAO', items: [{ tenHeThong, tinhTrangThietBi, loaiLoi, noiDungLoi }] }`
- **THEN** row is persisted with `requestType = KIEM_TRA`, `trangThai = CHO_XU_LY`, `maYeuCau` generated via existing `YC-SC` prefix (no new prefix in Phase 1)

#### Scenario: Filter by requestType

- **WHEN** `GET /api/repair-requests?requestType=KIEM_TRA&page=1&limit=20`
- **THEN** response contains only rows with `requestType = KIEM_TRA` and pagination reflects that filtered total

### Requirement: Inspection request uses short 3-state lifecycle

When `requestType = KIEM_TRA`, `trangThai` SHALL follow short path `CHO_XU_LY -> DA_TIEP_NHAN -> HOAN_THANH` with branches `TU_CHOI` (from `CHO_XU_LY | DA_TIEP_NHAN`) and `DA_HUY` (same). Transitions to `LEN_KE_HOACH | DANG_SUA_CHUA | CHO_NGHIEM_THU | DA_NGHIEM_THU` SHALL be rejected with `ValidationError('Phiếu kiểm tra không đi qua trạng thái này')` regardless of role. `TU_CHOI` and `DA_HUY` are terminal for inspection.

#### Scenario: Inspection cannot enter LEN_KE_HOACH

- **WHEN** `PATCH /api/repair-requests/:id/plan` on a `KIEM_TRA` row at `DA_TIEP_NHAN`
- **THEN** response is `400` with Vietnamese message and `trangThai` unchanged

#### Scenario: Inspection happy path

- **WHEN** `KIEM_TRA` row at `CHO_XU_LY` is accepted then completed via `PATCH /:id/accept` then `PATCH /:id/complete`
- **THEN** both transitions succeed, each writes a `RepairRequestStatusLog` with correct `oldStatus/newStatus/reason`

### Requirement: Inspection detail exposes source for repair creation

`GET /api/repair-requests/:id` when `requestType = KIEM_TRA` SHALL include `items[]` with `id` for `sourceInspectionItemId` linking. Frontend SHALL allow creating `SUA_CHUA` with `sourceInspectionRequestId` pointing to a `KIEM_TRA` row at `DA_TIEP_NHAN` or `HOAN_THANH`; service SHALL validate source exists and `requestType = KIEM_TRA`, then copy `sourceInspectionItemId` per item.

#### Scenario: Create repair from inspection auto-fills source

- **WHEN** `POST /api/repair-requests` with `{ requestType: 'SUA_CHUA', sourceInspectionRequestId: '<KIEM_TRA id>', items: [{ sourceInspectionItemId: '<item id>', tenHeThong, ... }] }`
- **THEN** created items have `sourceInspectionItemId` set and are queryable via index
