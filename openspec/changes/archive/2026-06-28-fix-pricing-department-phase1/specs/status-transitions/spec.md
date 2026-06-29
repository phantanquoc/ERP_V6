## ADDED Requirements

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
