## ADDED Requirements

### Requirement: Pricing room shows a dedicated purchase review tab

The pricing room SHALL show a separate tab `purchase-review` (Duyệt mua hàng) inside `GeneralPricing`, always visible to pricing room members, rendering a compact table of `PurchaseRequest` filtered to the pending approval status (`ChoDuyet` / equivalent), with search/filter, pagination, and detail.

#### Scenario: Tab visible and filtered
- **WHEN** a pricing room member opens the tab
- **THEN** only pending purchase requests are listed (others hidden)

### Requirement: Pricing members can approve or reject purchase requests from the tab

A pricing approver (ADMIN or any GENERAL/pricing member) SHALL be able to approve (`ChoDuyet → DaDuyet`) and reject for all purchase types (no type filter). Non-approvers SHALL NOT see the buttons and SHALL receive 403 on direct calls. Each transition SHALL create an audit entry and notification to the request creator.

#### Scenario: Approve any purchase type as pricing employee
- **WHEN** a GENERAL/pricing EMPLOYEE approves a pending purchase request of any type
- **THEN** the system transitions to approved, writes audit, and notifies the creator

#### Scenario: Non-approver blocked
- **WHEN** a non-pricing user calls approve
- **THEN** the system responds 403

### Requirement: Purchase review respects status guard

If the request is no longer pending, approve/reject SHALL be rejected with no side effect.

#### Scenario: Double approve blocked
- **WHEN** a purchase request is already approved
- **THEN** a second approve is rejected and the status stays approved
