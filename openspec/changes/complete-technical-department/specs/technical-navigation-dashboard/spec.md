## ADDED Requirements

### Requirement: Technical landing page provides operational entry points
The Technical landing page SHALL stop showing only an under-development notice and SHALL provide useful entry points and status summaries for QLHTM, Co Dien, and Projects.

#### Scenario: Open technical landing page
- **WHEN** an authorized technical user opens the Technical landing page
- **THEN** the page shows entry points for QLHTM, Co Dien, and Projects
- **THEN** the page shows useful status summaries such as machine system/detail counts, active faults or templates, repair/handover context, and project phase/task status where data is available

#### Scenario: Technical landing data is unavailable
- **WHEN** one technical summary query has no matching data
- **THEN** the page shows concise Vietnamese empty-state copy for that summary
- **THEN** the rest of the landing page remains usable

### Requirement: Technical sidebar includes Projects
The system SHALL include a Projects sub-module in the technical sidebar beside QLHTM and Co Dien for users who have technical Projects access.

#### Scenario: User has technical Projects access
- **WHEN** a user with technical Projects access views the sidebar
- **THEN** the Technical section includes the Projects subitem
- **THEN** selecting it navigates to the technical Projects route

#### Scenario: User lacks technical Projects access
- **WHEN** a user without technical Projects access views the sidebar
- **THEN** the Technical section does not expose the Projects subitem

### Requirement: Technical permissions include Projects sub-module
The permissions model SHALL define a technical Projects sub-department and SHALL use it consistently for route access, sidebar visibility, and technical landing entry visibility.

#### Scenario: Projects permission controls route access
- **WHEN** a user without Projects permission navigates directly to the technical Projects route
- **THEN** the system denies access using the existing permission flow

#### Scenario: Admin bypass applies to Projects
- **WHEN** an ADMIN user accesses the technical Projects route
- **THEN** the system allows access regardless of sub-department assignment

### Requirement: Technical UI follows ERP UI DNA
Technical department screens SHALL use dense ERP table patterns, compact controls, clear filter/sort/pagination controls near tables, Vietnamese user-facing copy, moderate radii, and no decorative noise.

#### Scenario: View a technical data table
- **WHEN** a user opens a technical machine detail, fault, repair context, handover context, or project phase table
- **THEN** the table uses compact typography, meaningful headers, explicit borders or subtle backgrounds, and nearby filters/sort/pagination controls
- **THEN** the UI avoids decorative placeholder sections that compete with business data
