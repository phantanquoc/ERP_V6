## MODIFIED Requirements

### Requirement: Repair request items link to machine records while preserving text fields
The system SHALL allow each repair request item to store optional links to a physical machine (`machineSystemId`) and a machine system detail (`machineSystemDetailId`) while preserving existing text fields such as `tenHeThong` and `tinhTrangThietBi`. Repair request items SHALL no longer carry a `machineId` column. When relational links are supplied, the system SHALL also store readable text snapshots for backward compatibility.

#### Scenario: Create linked repair request item
- **WHEN** a user creates a repair request item and selects a physical machine and a machine system detail
- **THEN** the system stores the selected `machineSystemId` and `machineSystemDetailId` on the item
- **THEN** the system stores readable text snapshots in the existing item text fields
- **THEN** the system rejects payloads that still send the legacy `machineId` field with a Vietnamese validation message

#### Scenario: Create legacy text-only repair request item
- **WHEN** a user creates a repair request item without selecting a physical machine or detail
- **THEN** the system accepts the existing text fields
- **THEN** the item remains visible in repair request lists and details without requiring relational machine links

#### Scenario: Update repair request items
- **WHEN** a repair request is updated with a new set of items
- **THEN** the system replaces the child item rows using the established delete-then-recreate pattern
- **THEN** each new item preserves its text snapshots and optional `machineSystemId` and `machineSystemDetailId` links

### Requirement: Repair request item APIs expose linked and snapshot context
The system SHALL return both relational physical-machine context and text snapshot fields for repair request items so old clients can continue to render text while new clients can navigate to physical machine and detail records. The legacy `machineId` field SHALL no longer appear in API responses.

#### Scenario: Read mixed linked and legacy items
- **WHEN** a repair request contains one linked item and one legacy text-only item
- **THEN** the response includes physical machine and detail objects or IDs for the linked item
- **THEN** the response includes text snapshot fields for both items
- **THEN** no item carries a `machineId` field in the response

### Requirement: Acceptance handovers include item-level context for multi-item requests
The system SHALL keep acceptance handovers connected to repair requests and SHALL support child handover item rows that reference repair request items. Each handover item SHALL capture the relevant physical machine (`machineSystemId`) and detail (`machineSystemDetailId`) context plus before/after condition for accurate multi-item handover summaries. Handover items SHALL no longer carry a `machineId` column.

#### Scenario: Create handover for multi-item repair request
- **WHEN** a user creates an acceptance handover for a repair request with multiple repair items
- **THEN** the system stores one handover linked to the repair request
- **THEN** the system stores child handover item rows for the selected repair request items, each with optional `machineSystemId` and `machineSystemDetailId`
- **THEN** each handover item displays the correct item-level physical machine context and before/after condition

#### Scenario: Reject handover item from another repair request
- **WHEN** a user submits a handover item that references a repair request item from a different repair request
- **THEN** the system rejects the handover with a Vietnamese validation message
- **THEN** no partial handover or handover item rows are created

#### Scenario: Reject handover payload carrying legacy machineId
- **WHEN** any client submits a handover or handover item payload containing the legacy `machineId` field
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no handover or handover item rows are created

## ADDED Requirements

### Requirement: AI agent registry uses physical machine references for repair requests
The system SHALL update `create_repair_request` in `ai-service/agent/registry.py` to require a `machineSystemId` argument instead of a free-text `tenHeThong` argument, and SHALL remove the deprecated `list_machines`, `get_machine`, `create_machine`, `update_machine`, and `delete_machine` tools. The AI agent SHALL also expose `list_machine_systems` with optional filters `trangThai`, `khuVuc`, and `loaiHeThong`, and the registry test count SHALL be updated to reflect the net delta.

#### Scenario: Agent creates a repair request for a physical machine
- **WHEN** the AI agent invokes `create_repair_request` with a `machineSystemId` belonging to an active physical machine
- **THEN** the request is gated as a write action requiring user confirmation before execution
- **THEN** on confirmation, the backend creates a repair request whose items reference that `machineSystemId`

#### Scenario: Agent rejects free-text machine name
- **WHEN** the AI agent attempts to call `create_repair_request` with a free-text `tenHeThong` and no `machineSystemId`
- **THEN** the registry rejects the call with a Vietnamese validation message before any backend request is sent

#### Scenario: Registry test count stays in sync
- **WHEN** the registry is loaded by `ai-service/tests/test_registry.py`
- **THEN** the registered tool count matches the value asserted in the test file after the net delta is applied
