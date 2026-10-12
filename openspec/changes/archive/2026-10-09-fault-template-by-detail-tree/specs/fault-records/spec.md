# Spec Delta — fault-records

## MODIFIED Requirements

### Requirement: Fault template management SHALL remain technical-only

The system SHALL keep all fault template CRUD endpoints gated behind `requireTechnicalAccess(MECHANICAL)`. In addition, tree-aware template operations (subtree queries, orphan/inactive filters, clone-with-templates, bulk deactivate via detail deactivation) SHALL inherit the same gate. Production users SHALL NOT be able to create, edit, or delete fault templates via any of these new paths.

#### Scenario: Production user cannot use subtree or orphan filters to mutate
- **WHEN** a non-technical user calls `POST /fault-templates` or `POST /machine-systems/:id/clone` with `includeFaultTemplates: true`
- **THEN** the system rejects with 403 via `requireTechnicalAccess`

#### Scenario: Production user can still read filtered template lists
- **WHEN** a production user calls `GET /fault-templates` with `includeSubtree` or orphan/inactive filters
- **THEN** the read succeeds (same read policy as before) and returns the filtered view

### Requirement: Fault template list and search support tree-aware filters

The existing `GET /fault-templates` search and filter contract is extended with two optional query parameters: `includeSubtree` (boolean, only meaningful with `machineSystemDetailId`) and `hoatDongDetail` / `orphan` semantics for inactive-detail and unlinked states. All existing filter combinations SHALL continue to work.

#### Scenario: Existing flat list without new params is unchanged
- **WHEN** client calls `GET /fault-templates` without `includeSubtree` or orphan/inactive filters
- **THEN** behavior, pagination, and ordering are identical to before this change

#### Scenario: Combined filters compose
- **WHEN** client calls `GET /fault-templates?machineSystemId=S&machineSystemDetailId=D&includeSubtree=true&mucDo=Nghiêm trọng`
- **THEN** the result is the intersection of subtree expansion and the severity filter
