## ADDED Requirements

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
