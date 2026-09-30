# repair-acceptance-with-warehouse — Delta Spec

## ADDED Requirements

### Requirement: AcceptanceHandover gains warehouse linkage and result

`AcceptanceHandover` (`@@schema("common")`, `@@map("acceptance_handovers")`) SHALL gain `warehouseIssueId String? @db.VarChar(30) @map("warehouse_issue_id")`, `chiPhiThucTe Decimal(15,2)? @map("chi_phi_thuc_te")`, `ketQua NghiemThuKetQua? @map("ket_qua")` (`DAT | KHONG_DAT`), `@@index([warehouseIssueId])`. When `warehouseIssueId` is supplied, service SHALL validate the `WarehouseIssue` exists (soft FK, no DB FK). `KIEM_TRA` rows SHALL reject handover creation with `ValidationError`.

#### Scenario: Handover with warehouse issue and DAT

- **WHEN** `POST /api/acceptance-handovers` with `{ repairRequestId: <SUA_CHUA at DANG_SUA_CHUA>, warehouseIssueId: '<WarehouseIssue id>', ketQua: 'DAT', chiPhiThucTe: 1500000, items: [...] }`
- **THEN** handover is persisted with `warehouseIssueId` and `ketQua=DAT`, `GET /repair-requests/:id` includes handover with warehouse link

#### Scenario: KIEM_TRA rejects handover

- **WHEN** `POST /api/acceptance-handovers` with `repairRequestId` of a `KIEM_TRA` row
- **THEN** `400 ValidationError` with Vietnamese message

### Requirement: KHONG_DAT loop returns repair to DANG_SUA_CHUA

When `ketQua = KHONG_DAT` is confirmed on `DA_NGHIEM_THU`, the `confirm-acceptance` handler SHALL advance `DA_NGHIEM_THU -> DANG_SUA_CHUA` (loop) inside the same `prisma.$transaction` that updates the handover, write a `RepairRequestStatusLog` with `reason='acceptance_khong_dat'`, and keep the prior handover record. `DAT` SHALL advance `DA_NGHIEM_THU -> HOAN_THANH` with `reason='acceptance_dat'` and set `RepairRequest.ngayHoanThanhThucTe = now()`.

#### Scenario: KHONG_DAT loops back

- **WHEN** `PATCH /:id/confirm-acceptance` with `{ ketQua: 'KHONG_DAT' }` on `DA_NGHIEM_THU`
- **THEN** parent `trangThai = DANG_SUA_CHUA`, status log exists with `reason='acceptance_khong_dat'`, prior handover kept, and new handover can be created in next cycle

#### Scenario: DAT completes repair

- **WHEN** `PATCH /:id/confirm-acceptance` with `{ ketQua: 'DAT', chiPhiThucTe: 2000000 }` on `DA_NGHIEM_THU`
- **THEN** parent `trangThai = HOAN_THANH`, `ngayHoanThanhThucTe` set, `chiPhiThucTe` snapshot on both `AcceptanceHandover` and `RepairRequest`, and `REPAIR_REQUEST_COMPLETED` notification emitted
