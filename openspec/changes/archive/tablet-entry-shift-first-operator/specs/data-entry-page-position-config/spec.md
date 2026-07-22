## ADDED Requirements

### Requirement: Page-to-position mapping model

The system SHALL persist a mapping between a data-entry page key and a set of positions. Each mapping row SHALL link one `pageKey` to one `positionId` (referencing an existing Position), with a CUID primary key and a uniqueness constraint on the `(pageKey, positionId)` pair so the same position cannot be mapped to the same page twice. The model SHALL NOT modify the Attendance schema.

#### Scenario: Map a position to a page

- **WHEN** an admin maps a position to a page key
- **THEN** a mapping row linking that page key and position id is persisted

#### Scenario: Duplicate mapping rejected

- **WHEN** an admin maps a position that is already mapped to the same page
- **THEN** the system rejects the duplicate and reports a conflict

### Requirement: Admin config endpoints

The system SHALL expose admin endpoints (JWT-authenticated, ADMIN-authorized) to list, add, and remove page-to-position mappings, registered in the route map. Responses SHALL follow the standard `{ success, message?, data? }` shape and use typed errors.

#### Scenario: Admin lists mappings

- **WHEN** an admin requests the mappings for a page
- **THEN** the system returns the positions currently mapped to that page

#### Scenario: Non-admin blocked

- **WHEN** a non-admin authenticated user calls a config endpoint
- **THEN** the system returns a 403 authorization error

### Requirement: Desktop config page

The system SHALL provide a desktop admin page where an admin assigns positions to each data-entry page. Changes SHALL be saved to the backend and reflected in the kiosk attended-operator filtering. The page SHALL fetch data through a TanStack Query hook and invalidate the relevant query keys after mutations.

#### Scenario: Assign positions on desktop

- **WHEN** an admin selects positions for a page and saves
- **THEN** the mappings are persisted and the kiosk operator list for that page uses the updated mappings

### Requirement: Kiosk endpoint reads config for filtering

The kiosk attended-operator endpoint SHALL read the page-to-position mapping to determine which positions are eligible for a given page. When no positions are mapped to a page, the endpoint SHALL return an empty operator list rather than returning all employees.

#### Scenario: Unmapped page returns empty

- **WHEN** the kiosk endpoint is called for a page with no mapped positions
- **THEN** it returns an empty operator list, not the full employee set
