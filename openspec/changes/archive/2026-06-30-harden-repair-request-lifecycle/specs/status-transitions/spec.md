## ADDED Requirements

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
