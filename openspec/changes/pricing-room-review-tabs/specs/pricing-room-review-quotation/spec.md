## ADDED Requirements

### Requirement: Pricing room shows a dedicated YCBG review tab

The pricing room SHALL show a separate tab `ycbg-review` (Duyệt YC báo giá) inside `GeneralPricing`, always visible to anyone who can enter the pricing room. The tab SHALL render a compact (rút gọn) table of `QuotationRequest` filtered to `CHO_XU_LY`, with search/filter, pagination, and detail view.

#### Scenario: Tab visible to pricing room
- **WHEN** a user who passes `hasSubModuleAccess("general","pricing")` opens `/general/pricing`
- **THEN** the tab bar includes `ycbg-review` alongside the 4 existing tabs

#### Scenario: List filtered to pending
- **WHEN** the tab loads
- **THEN** the table shows only rows with `status = CHO_XU_LY` (others hidden; empty state shows no pending requests)

### Requirement: Pricing members can approve or reject YCBG from the tab

From the `ycbg-review` tab, a user who is a pricing approver (ADMIN or any GENERAL/pricing member via `hasSubModuleAccess("general","pricing")`, including EMPLOYEE) SHALL be able to approve (`CHO_XU_LY → DANG_BAO_GIA`) and reject (`→ HUY`). Non-approvers SHALL see the tab and data but SHALL NOT see Duyệt/Từ chối buttons. Each transition SHALL go through `advanceQuotationRequestStatus` and SHALL create an audit entry and a notification to the request creator.

#### Scenario: Approve as pricing employee
- **WHEN** an EMPLOYEE with `department=general, subDepartment=pricing` clicks Duyệt on a CHO_XU_LY request
- **THEN** the system transitions to `DANG_BAO_GIA` via `POST /api/quotation-requests/:id/approve`, writes an audit record, and notifies the creator

#### Scenario: Non-approver cannot approve
- **WHEN** a user who does not satisfy the pricing approver check opens the tab
- **THEN** Duyệt/Từ chối buttons are not rendered and direct API calls with their token are rejected with 403

#### Scenario: Reject writes HUY
- **WHEN** a pricing approver clicks Từ chối on a CHO_XU_LY request
- **THEN** the system transitions to `HUY` via `POST /:id/reject` and notifies the creator

### Requirement: YCBG review respects status guard

If the request is no longer `CHO_XU_LY` at approve/reject time, the system SHALL reject with a validation error and SHALL NOT change status, audit, or notification.

#### Scenario: Double approve blocked
- **WHEN** two approvers race to approve the same CHO_XU_LY request
- **THEN** the first succeeds, the second receives a 400/409 and the request stays at its post-first status
