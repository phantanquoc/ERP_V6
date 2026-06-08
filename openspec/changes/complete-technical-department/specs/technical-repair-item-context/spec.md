## ADDED Requirements

### Requirement: Repair request items link to machine records while preserving text fields
The system SHALL allow each repair request item to store optional links to a machine system and machine system detail while preserving existing text fields such as `tenHeThong` and `tinhTrangThietBi`. When links are supplied, the system SHALL also store readable text snapshots for backward compatibility.

#### Scenario: Create linked repair request item
- **WHEN** a user creates a repair request item and selects a machine system detail
- **THEN** the system stores the selected machine system and detail IDs on the item
- **THEN** the system stores readable text snapshots in the existing item text fields

#### Scenario: Create legacy text-only repair request item
- **WHEN** a user creates a repair request item without selecting a machine system or detail
- **THEN** the system accepts the existing text fields
- **THEN** the item remains visible in repair request lists and details without requiring relational machine links

#### Scenario: Update repair request items
- **WHEN** a repair request is updated with a new set of items
- **THEN** the system replaces the child item rows using the established delete-then-recreate pattern
- **THEN** each new item preserves its text snapshots and optional machine links

### Requirement: Repair request item APIs expose linked and snapshot context
The system SHALL return both relational machine context and text snapshot fields for repair request items so old clients can continue to render text while new clients can navigate to machine system and detail records.

#### Scenario: Read mixed linked and legacy items
- **WHEN** a repair request contains one linked item and one legacy text-only item
- **THEN** the response includes machine system and detail objects or IDs for the linked item
- **THEN** the response includes text snapshot fields for both items

### Requirement: Acceptance handovers include item-level context for multi-item requests
The system SHALL keep acceptance handovers connected to repair requests and SHALL support child handover item rows that reference repair request items. Each handover item SHALL capture the relevant system/detail context and before/after condition for accurate multi-item handover summaries.

#### Scenario: Create handover for multi-item repair request
- **WHEN** a user creates an acceptance handover for a repair request with multiple repair items
- **THEN** the system stores one handover linked to the repair request
- **THEN** the system stores child handover item rows for the selected repair request items
- **THEN** each handover item displays the correct item-level machine context and before/after condition

#### Scenario: Reject handover item from another repair request
- **WHEN** a user submits a handover item that references a repair request item from a different repair request
- **THEN** the system rejects the handover with a Vietnamese validation message
- **THEN** no partial handover or handover item rows are created
