# acceptance-handover — Delta Spec (MODIFIED)

## MODIFIED Requirements

### Requirement: Acceptance handover is blocked unless parent is DANG_SUA_CHUA or CHO_NGHIEM_THU and is SUA_CHUA (extended)

`acceptanceHandoverService.createAcceptanceHandover` SHALL require parent `RepairRequest.requestType = SUA_CHUA` and `trangThai IN (DANG_SUA_CHUA, CHO_NGHIEM_THU)` (extended from `DANG_SUA_CHUA` only to allow the `CHO_NGHIEM_THU -> DA_NGHIEM_THU` handover cycle). When parent is `KIEM_TRA`, SHALL throw `ValidationError('Phiếu kiểm tra không cần nghiệm thu')`. `warehouseIssueId` when supplied SHALL be validated to exist. `ketQua` SHALL default to `DAT` when omitted.

#### Scenario: KIEM_TRA blocked from handover

- **WHEN** `POST /api/acceptance-handovers` with `repairRequestId` of a `KIEM_TRA` row
- **THEN** `400 ValidationError` and no row is inserted

#### Scenario: Handover on CHO_NGHIEM_THU allowed

- **WHEN** `POST /api/acceptance-handovers` with `repairRequestId` at `CHO_NGHIEM_THU` (submitted for acceptance)
- **THEN** handover is created and will be used to confirm `CHO_NGHIEM_THU -> DA_NGHIEM_THU`

### Requirement: Coverage check auto-completes via CHO_NGHIEM_THU -> DA_NGHIEM_THU -> HOAN_THANH (extended)

The coverage auto-complete branch SHALL now flow `DANG_SUA_CHUA -> CHO_NGHIEM_THU` (on handover creation when `covered === total`) or `CHO_NGHIEM_THU -> DA_NGHIEM_THU` (on confirm) and finally `DA_NGHIEM_THU -> HOAN_THANH` (when `ketQua=DAT`) or loop `DA_NGHIEM_THU -> DANG_SUA_CHUA` (when `ketQua=KHONG_DAT`). Each step SHALL write `RepairRequestStatusLog` and emit notification as before.

#### Scenario: Partial coverage stays at DANG_SUA_CHUA

- **WHEN** handover covers 2/3 items on `DANG_SUA_CHUA`
- **THEN** parent stays `DANG_SUA_CHUA` and no auto-complete log is written
