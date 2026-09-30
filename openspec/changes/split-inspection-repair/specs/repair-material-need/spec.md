# repair-material-need — Delta Spec

## ADDED Requirements

### Requirement: RepairMaterialNeed per repair item

`RepairMaterialNeed` SHALL exist in `@@schema("common")`, `@@map("repair_material_needs")`, `id String @id @default(cuid())`, `repairRequestId Int FK Cascade`, `repairRequestItemId String FK Cascade -> RepairRequestItem`, `tenVatTu String`, `maVatTu String?`, `donVi String?`, `soLuongDuKien Decimal(12,3) >= 0`, `soLuongThucTe Decimal(12,3)?`, `ghiChu TEXT?`, `@@index([repairRequestId])`, `@@index([repairRequestItemId])`, `@@unique([repairRequestItemId, tenVatTu])`. CRUD SHALL be via `POST /:id/material-needs`, `PUT /:id/material-needs/:needId`, `DELETE /:id/material-needs/:needId`, `GET /:id/material-needs` under `RepairRequest` parent. `KIEM_TRA` rows SHALL reject with `ValidationError`.

#### Scenario: Add material need per item

- **WHEN** `POST /:id/material-needs` with `{ repairRequestItemId: '<item>', tenVatTu: 'Vòng bi 6205', soLuongDuKien: 2 }` on `SUA_CHUA` at `LEN_KE_HOACH`
- **THEN** `201` with persisted need and `GET /:id/material-needs` includes it with `repairRequestItemId` populated

#### Scenario: Duplicate tenVatTu on same item rejected

- **WHEN** second `POST` with same `repairRequestItemId` and `tenVatTu`
- **THEN** `409 ConflictError` with Vietnamese message and no row created

#### Scenario: KIEM_TRA rejects material need

- **WHEN** `POST /:id/material-needs` on `KIEM_TRA`
- **THEN** `400` and no row created

### Requirement: Material need detail and validation

`GET /:id/material-needs` SHALL return needs with `repairRequestItem { id, tenHeThong }` for display. `PUT` SHALL allow updating `soLuongDuKien`, `soLuongThucTe`, `donVi`, `ghiChu`; Zod SHALL enforce `soLuongDuKien >= 0`, `soLuongThucTe >= 0` when present.

#### Scenario: Update soLuongThucTe after supply

- **WHEN** `PUT /:id/material-needs/:needId` with `{ soLuongThucTe: 1.5 }`
- **THEN** persisted `soLuongThucTe = 1.5` and `GET` reflects it
