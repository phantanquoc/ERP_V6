# status-transitions Specification

## Purpose

Defines the shared forward-only status transition helpers and status-order constants used across all workflow entities (QuotationRequest, RepairRequest, FaultRecord) in the backend status-transition utility module.
## Requirements
### Requirement: Shared forward-only status transition helpers

The backend SHALL expose a single helper module `backend/src/utils/statusTransitions.ts` providing `advanceQuotationStatus(current, next, opts?)` and `advanceOrderProductionStatus(current, next, opts?)`. Each helper SHALL accept an optional `{ bypass?: boolean }` parameter; when `bypass` is true the helper returns the requested status unchanged. When `bypass` is absent or false, the helper SHALL allow only one of: a no-op (current equals next), a transition to a permitted terminal cancel status, or a single-step advance along the configured order. All other transitions SHALL throw `ValidationError` with a Vietnamese message describing the illegal move.

#### Scenario: Single-step advance is accepted

- **WHEN** `advanceQuotationStatus('DRAFT', 'DANG_CHO_PHAN_HOI')` is called without bypass
- **THEN** it returns `'DANG_CHO_PHAN_HOI'`

#### Scenario: No-op same status is accepted

- **WHEN** `advanceQuotationStatus('DANG_CHO_PHAN_HOI', 'DANG_CHO_PHAN_HOI')` is called
- **THEN** it returns `'DANG_CHO_PHAN_HOI'`

#### Scenario: Cancel target from non-terminal is accepted

- **WHEN** `advanceQuotationStatus('DANG_CHO_PHAN_HOI', 'KHONG_DAT_HANG')` is called
- **THEN** it returns `'KHONG_DAT_HANG'`

#### Scenario: Terminal status is locked

- **WHEN** `advanceQuotationStatus('DA_DAT_HANG', 'DRAFT')` is called without bypass
- **THEN** it throws `ValidationError`

#### Scenario: Skipping a step is rejected

- **WHEN** `advanceQuotationStatus('DRAFT', 'DA_DAT_HANG')` is called without bypass
- **THEN** it throws `ValidationError`

#### Scenario: Bypass accepts any in-enum value

- **WHEN** `advanceQuotationStatus('DA_DAT_HANG', 'DRAFT', { bypass: true })` is called
- **THEN** it returns `'DRAFT'`

#### Scenario: Order production helper behaves equivalently

- **WHEN** `advanceOrderProductionStatus('CHO_SAN_XUAT', 'DA_GIAO')` is called without bypass
- **THEN** it throws `ValidationError` because the move skips multiple steps

### Requirement: QuotationRequest forward-only status order

`backend/src/utils/statusTransitions.ts` SHALL export the constant `QUOTATION_REQUEST_STATUS_ORDER = ['CHO_XU_LY', 'DANG_BAO_GIA', 'DA_BAO_GIA']`, the set `QUOTATION_REQUEST_TERMINAL_STATUSES = { DA_BAO_GIA, HUY }`, and the set `QUOTATION_REQUEST_CANCEL_TARGETS = { HUY }`. These constants SHALL be used as the canonical reference for any QuotationRequest status decision elsewhere in the codebase.

#### Scenario: Constants exposed

- **WHEN** any backend module imports from `@utils/statusTransitions`
- **THEN** `QUOTATION_REQUEST_STATUS_ORDER`, `QUOTATION_REQUEST_TERMINAL_STATUSES`, and `QUOTATION_REQUEST_CANCEL_TARGETS` are available with the values above

### Requirement: advanceQuotationRequestStatus enforces forward-only progression

`backend/src/utils/statusTransitions.ts` SHALL export `advanceQuotationRequestStatus(current: QuotationRequestStatus, next: QuotationRequestStatus, opts?: { bypass?: boolean }): QuotationRequestStatus`. The helper SHALL accept a no-op (current === next), a single-step forward along `QUOTATION_REQUEST_STATUS_ORDER`, or a cancel to `HUY` from any non-terminal state. Any other transition SHALL throw `ValidationError('Không thể chuyển trạng thái YCBG từ X sang Y')`. When `opts.bypass === true` (ADMIN), the helper SHALL return `next` unchanged.

#### Scenario: Single-step forward allowed

- **WHEN** `advanceQuotationRequestStatus('CHO_XU_LY', 'DANG_BAO_GIA')` is called
- **THEN** the helper returns `'DANG_BAO_GIA'`

#### Scenario: No-op allowed

- **WHEN** `advanceQuotationRequestStatus('DANG_BAO_GIA', 'DANG_BAO_GIA')` is called
- **THEN** the helper returns `'DANG_BAO_GIA'`

#### Scenario: Cancel allowed from non-terminal

- **WHEN** `advanceQuotationRequestStatus('DANG_BAO_GIA', 'HUY')` is called
- **THEN** the helper returns `'HUY'`

#### Scenario: Jump rejected

- **WHEN** `advanceQuotationRequestStatus('CHO_XU_LY', 'DA_BAO_GIA')` is called without `bypass`
- **THEN** the helper throws `ValidationError('Không thể chuyển trạng thái YCBG từ CHO_XU_LY sang DA_BAO_GIA')`

#### Scenario: Backward rejected

- **WHEN** `advanceQuotationRequestStatus('DA_BAO_GIA', 'DANG_BAO_GIA')` is called without `bypass`
- **THEN** the helper throws the YCBG ValidationError

#### Scenario: Transition from terminal HUY rejected

- **WHEN** `advanceQuotationRequestStatus('HUY', 'CHO_XU_LY')` is called without `bypass`
- **THEN** the helper throws the YCBG ValidationError

#### Scenario: ADMIN bypass

- **WHEN** `advanceQuotationRequestStatus('CHO_XU_LY', 'DA_BAO_GIA', { bypass: true })` is called
- **THEN** the helper returns `'DA_BAO_GIA'` without enforcement

### Requirement: RepairRequest forward-only status order

`backend/src/utils/statusTransitions.ts` SHALL export the constant `REPAIR_REQUEST_STATUS_ORDER = ['CHO_XU_LY', 'DANG_SUA_CHUA', 'HOAN_THANH']`, the set `REPAIR_REQUEST_TERMINAL_STATUSES = new Set(['HOAN_THANH', 'DA_HUY'])`, and the set `REPAIR_REQUEST_CANCEL_TARGETS = new Set(['DA_HUY'])`. These constants SHALL be the single source of truth for any RepairRequest status decision elsewhere in the backend.

#### Scenario: Constants exposed

- **WHEN** any backend module imports from `@utils/statusTransitions`
- **THEN** `REPAIR_REQUEST_STATUS_ORDER`, `REPAIR_REQUEST_TERMINAL_STATUSES`, and `REPAIR_REQUEST_CANCEL_TARGETS` are available with the values above

### Requirement: advanceRepairRequestStatus enforces forward-only progression

`backend/src/utils/statusTransitions.ts` SHALL export `advanceRepairRequestStatus(current: RepairRequestStatus, next: RepairRequestStatus, opts?: { bypass?: boolean }): RepairRequestStatus`. The helper SHALL accept a no-op (`current === next`), a single-step forward along `REPAIR_REQUEST_STATUS_ORDER`, or a cancel to `DA_HUY` from any non-terminal state. Any other transition SHALL throw `ValidationError('Không thể chuyển trạng thái yêu cầu sửa chữa từ <current> sang <next>')`. When `opts.bypass === true` (ADMIN), the helper SHALL return `next` unchanged regardless of the order.

#### Scenario: Single-step forward allowed

- **WHEN** `advanceRepairRequestStatus('CHO_XU_LY', 'DANG_SUA_CHUA')` is called
- **THEN** the helper returns `'DANG_SUA_CHUA'`

#### Scenario: Auto-complete single-step allowed

- **WHEN** `advanceRepairRequestStatus('DANG_SUA_CHUA', 'HOAN_THANH')` is called
- **THEN** the helper returns `'HOAN_THANH'`

#### Scenario: No-op allowed

- **WHEN** `advanceRepairRequestStatus('DANG_SUA_CHUA', 'DANG_SUA_CHUA')` is called
- **THEN** the helper returns `'DANG_SUA_CHUA'`

#### Scenario: Cancel allowed from any non-terminal

- **WHEN** `advanceRepairRequestStatus('DANG_SUA_CHUA', 'DA_HUY')` is called
- **THEN** the helper returns `'DA_HUY'`

#### Scenario: Cancel allowed from CHO_XU_LY

- **WHEN** `advanceRepairRequestStatus('CHO_XU_LY', 'DA_HUY')` is called
- **THEN** the helper returns `'DA_HUY'`

#### Scenario: Jump from CHO_XU_LY to HOAN_THANH rejected

- **WHEN** `advanceRepairRequestStatus('CHO_XU_LY', 'HOAN_THANH')` is called without `bypass`
- **THEN** the helper throws `ValidationError('Không thể chuyển trạng thái yêu cầu sửa chữa từ CHO_XU_LY sang HOAN_THANH')`

#### Scenario: Backward move from HOAN_THANH rejected

- **WHEN** `advanceRepairRequestStatus('HOAN_THANH', 'DANG_SUA_CHUA')` is called without `bypass`
- **THEN** the helper throws the RepairRequest ValidationError

#### Scenario: Transition from terminal DA_HUY rejected

- **WHEN** `advanceRepairRequestStatus('DA_HUY', 'CHO_XU_LY')` is called without `bypass`
- **THEN** the helper throws the RepairRequest ValidationError

#### Scenario: Cancel from terminal rejected

- **WHEN** `advanceRepairRequestStatus('HOAN_THANH', 'DA_HUY')` is called without `bypass`
- **THEN** the helper throws the RepairRequest ValidationError

#### Scenario: ADMIN bypass accepts any in-enum value

- **WHEN** `advanceRepairRequestStatus('HOAN_THANH', 'DANG_SUA_CHUA', { bypass: true })` is called
- **THEN** the helper returns `'DANG_SUA_CHUA'` without enforcement

### Requirement: FaultRecord forward-only status transition helper

The backend `backend/src/utils/statusTransitions.ts` SHALL export `advanceFaultRecordStatus(current: FaultRecordStatus, next: FaultRecordStatus, opts?: { bypass?: boolean })`. The helper SHALL accept an optional `bypass` flag; when `bypass` is true the helper SHALL return the requested `next` unchanged. When `bypass` is absent or false the helper SHALL allow only one of: a no-op (current equals next), a transition from `DANG_THEO_DOI` to `DA_XU_LY`, a transition from `DA_XU_LY` to `TAI_PHAT`, or a transition from `TAI_PHAT` to `DA_XU_LY`. All other transitions SHALL throw `ValidationError` with a Vietnamese message describing the illegal move. The helper SHALL be typed against the Prisma enum `FaultRecordStatus`.

#### Scenario: Single-step advance from DANG_THEO_DOI to DA_XU_LY

- **WHEN** `advanceFaultRecordStatus('DANG_THEO_DOI', 'DA_XU_LY')` is called without bypass
- **THEN** it returns `'DA_XU_LY'`

#### Scenario: DA_XU_LY to TAI_PHAT is allowed (reopen)

- **WHEN** `advanceFaultRecordStatus('DA_XU_LY', 'TAI_PHAT')` is called without bypass
- **THEN** it returns `'TAI_PHAT'`

#### Scenario: TAI_PHAT to DA_XU_LY is allowed (resolve again)

- **WHEN** `advanceFaultRecordStatus('TAI_PHAT', 'DA_XU_LY')` is called without bypass
- **THEN** it returns `'DA_XU_LY'`

#### Scenario: No-op returns unchanged

- **WHEN** `advanceFaultRecordStatus('DANG_THEO_DOI', 'DANG_THEO_DOI')` is called
- **THEN** it returns `'DANG_THEO_DOI'`

#### Scenario: Skip step from DANG_THEO_DOI to TAI_PHAT is rejected

- **WHEN** `advanceFaultRecordStatus('DANG_THEO_DOI', 'TAI_PHAT')` is called without bypass
- **THEN** it throws `ValidationError`

#### Scenario: Bypass accepts any in-enum value

- **WHEN** `advanceFaultRecordStatus('DANG_THEO_DOI', 'TAI_PHAT', { bypass: true })` is called
- **THEN** it returns `'TAI_PHAT'` without throwing

