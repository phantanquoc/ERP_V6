## ADDED Requirements

### Requirement: Pricing room shows a dedicated overtime review tab

The pricing room SHALL show a separate tab `overtime-review` (Duyệt tăng ca) inside `GeneralPricing`, always visible to pricing room members, rendering a compact table of `OvertimePlan` filtered to `CHO_DUYET` with search/filter, pagination, and detail.

#### Scenario: Tab visible and filtered
- **WHEN** a pricing room member opens the tab
- **THEN** only `CHO_DUYET` plans are listed

### Requirement: Pricing members can approve or reject overtime from the tab

A pricing approver (ADMIN or any GENERAL/pricing member via `hasSubModuleAccess("general","pricing")`) SHALL be able to approve (`CHO_DUYET → DA_DUYET`, materializing attendance in the same transaction) and reject (`→ TU_CHOI`). Non-approvers SHALL NOT see the buttons and SHALL receive 403 on direct API calls. Approval SHALL keep the existing notification to creator and participants.

#### Scenario: Approve as pricing employee materializes attendance
- **WHEN** a GENERAL/pricing EMPLOYEE approves a CHO_DUYET plan
- **THEN** `PATCH /api/overtime-plans/:id/approve` succeeds, status becomes `DA_DUYET`, attendance rows are created in the same transaction, and notifications are sent

#### Scenario: Non-approver blocked
- **WHEN** a non-pricing user calls approve
- **THEN** the system responds 403

#### Scenario: Reject without attendance
- **WHEN** a pricing approver rejects
- **THEN** status becomes `TU_CHOI` and no attendance is created

### Requirement: Overtime review respects status guard

If the plan is no longer `CHO_DUYET`, approve/reject SHALL be rejected and no status change or side effect SHALL occur.

#### Scenario: Approve already processed plan blocked
- **WHEN** a plan is already `DA_DUYET`
- **THEN** approve returns a validation error and leaves the plan unchanged
