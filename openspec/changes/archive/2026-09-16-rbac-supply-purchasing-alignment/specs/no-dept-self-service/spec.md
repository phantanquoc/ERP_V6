## ADDED Requirements

### Requirement: Chung common read and scoped update remain policy-consistent

The Chung common-access contract in `no-dept-self-service` SHALL continue to hold after in-department gate tightening. Concretely, `isCommonGrant` for resources `lookups`, `notifications`, `auth`, `docs` SHALL pass before `baselineAllow` so that enforcement and the `resolveOne` preview agree.

#### Scenario: In-department user reads lookups without an explicit rule
- **WHEN** an `EMPLOYEE` in any department without an explicit `lookups/READ` rule calls `GET /api/lookups`
- **THEN** the server returns `200` and the permission preview reports `COMMON_ALLOW`
