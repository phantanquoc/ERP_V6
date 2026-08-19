## ADDED Requirements

### Requirement: QuotationRequest approve and reject from pricing room

The system SHALL expose `POST /api/quotation-requests/:id/approve` and `POST /api/quotation-requests/:id/reject` for quotation requests. Both endpoints SHALL be accessible to ADMIN and to any pricing approver (GENERAL/pricing member via `hasSubModuleAccess("general","pricing")` including EMPLOYEE). Authenticated users who are not pricing approvers SHALL receive 403.

Approve SHALL transition `CHO_XU_LY → DANG_BAO_GIA` via `advanceQuotationRequestStatus`; reject SHALL transition `CHO_XU_LY → HUY`. Both SHALL validate that the current status is `CHO_XU_LY` and SHALL fail with a validation error if not. Each successful transition SHALL write an audit record (`recordAudit`) and SHALL notify the request creator.

#### Scenario: Pricing employee approves
- **WHEN** a GENERAL/pricing EMPLOYEE calls `POST /:id/approve` on a CHO_XU_LY request
- **THEN** status becomes `DANG_BAO_GIA`, an audit entry is created, and a notification is sent to the creator

#### Scenario: Non-approver forbidden
- **WHEN** a user without pricing approver membership calls `POST /:id/approve`
- **THEN** the system responds 403 and the request is unchanged

#### Scenario: Wrong status rejected
- **WHEN** a request is already `DANG_BAO_GIA` and approve is called
- **THEN** the system responds 400 and the status stays `DANG_BAO_GIA`
