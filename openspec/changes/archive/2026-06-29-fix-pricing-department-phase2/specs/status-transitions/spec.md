## ADDED Requirements

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
