## ADDED Requirements

### Requirement: Overtime approve accessible to pricing room

The overtime approve flow SHALL be accessible to pricing approvers in addition to ADMIN. `overtimePlanService.approvePlan` SHALL accept ADMIN or any GENERAL/pricing member (via `hasSubModuleAccess("general","pricing")`, including EMPLOYEE). The route `PATCH /api/overtime-plans/:id/approve` SHALL enforce the same set via `authorize`/`checkAccess` (or equivalent pricing-member check). APPROVE (`CHO_DUYET → DA_DUYET`) SHALL keep the existing transaction that atomically updates status and materializes attendance (`materializeAttendance`); REJECT (`→ TU_CHOI`) SHALL NOT materialize attendance. Notifications to creator and participants SHALL remain outside the transaction.

#### Scenario: Pricing employee approval succeeds with attendance
- **WHEN** a GENERAL/pricing EMPLOYEE calls `PATCH /:id/approve` with `{ trangThai: "DA_DUYET" }` on a `CHO_DUYET` plan
- **THEN** the plan becomes `DA_DUYET` and attendance rows are created atomically; notifications are sent

#### Scenario: Non-approver blocked
- **WHEN** a non-pricing user calls the approve endpoint
- **THEN** the system responds 403 and the plan is unchanged

#### Scenario: Status guard enforced
- **WHEN** the plan is already `DA_DUYET` and approve is called again
- **THEN** the system rejects with a validation error and makes no change
