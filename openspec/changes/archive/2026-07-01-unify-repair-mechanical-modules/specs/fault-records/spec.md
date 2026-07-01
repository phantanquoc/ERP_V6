## MODIFIED Requirements

### Requirement: System SHALL capture resolution timestamp on status transition to Đã xử lý

The system SHALL store `ngayXuLy: DateTime?` on `business.FaultRecord`. Status transitions SHALL flow exclusively through the dedicated endpoints `POST /api/fault-records/:id/mark-resolved` and `POST /api/fault-records/:id/mark-recurred` (see the `fault-record-lifecycle` capability) — the generic `PUT /api/fault-records/:id` endpoint SHALL ignore any `trangThai` field in the request body. When `faultRecordService.markResolved` (or the cascade `markResolvedFromRepair` triggered by RepairRequest completion) advances `trangThai` to `DA_XU_LY`, the service SHALL set `ngayXuLy = now()`. When `faultRecordService.markRecurred` advances `trangThai` to `TAI_PHAT`, the service SHALL clear `ngayXuLy = null`. The system SHALL NOT expose a generic `PATCH /status` endpoint.

#### Scenario: mark-resolved sets ngayXuLy

- **WHEN** an authorized user calls `POST /api/fault-records/:id/mark-resolved` on a record whose current `trangThai` is `DANG_THEO_DOI` or `TAI_PHAT`
- **THEN** the service writes `ngayXuLy = now()` together with `trangThai = DA_XU_LY`

#### Scenario: mark-recurred clears ngayXuLy

- **WHEN** an authorized user calls `POST /api/fault-records/:id/mark-recurred` on a record whose current `trangThai` is `DA_XU_LY`
- **THEN** the service writes `ngayXuLy = null` together with `trangThai = TAI_PHAT`

#### Scenario: PUT ignores trangThai and leaves ngayXuLy untouched

- **WHEN** an authorized user calls `PUT /api/fault-records/:id` with a body containing `trangThai` (any value) but valid other fields
- **THEN** the service updates the other fields, ignores `trangThai` with a warning log, and does not write to `ngayXuLy`

#### Scenario: Auto cascade from RepairRequest completion sets ngayXuLy

- **WHEN** the RepairRequest cascade calls `faultRecordService.markResolvedFromRepair(id, repairRequestId, actorId)` on a linked FaultRecord currently at `DANG_THEO_DOI` or `TAI_PHAT`
- **THEN** the service writes `ngayXuLy = now()` together with `trangThai = DA_XU_LY` and inserts a status log row with `source = 'auto_from_repair'`
