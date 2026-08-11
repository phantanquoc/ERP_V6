## ADDED Requirements

### Requirement: Warehouse staff can decide multiple supply-request lines in one action

The system SHALL expose an endpoint that accepts a batch of `SupplyRequestItem` fulfillment decisions and processes them as a group. For each decided line the system MUST record a `SupplyRequestDecision` and update `fulfilledQty`/`fulfillmentStatus`, exactly as the single-line `partialFulfill` path does. All lines with `fulfilledQty > 0` in the batch MUST be issued together as the lines of one warehouse issue slip, sharing one generated code, rather than one slip per line.

Deciding a single supply-request line through the existing single-line path MUST continue to produce a one-line issue slip, unchanged.

#### Scenario: Warehouse keeper fulfills three lines at once
- **WHEN** a warehouse keeper submits fulfillment decisions for three lines of the same supply request in one batch call, each with `fulfilledQty > 0`
- **THEN** the system records three `SupplyRequestDecision` rows
- **AND** one warehouse issue slip is created with three lines, sharing one `PX` code

#### Scenario: A zero-fulfillment line in the batch produces no line
- **WHEN** a batch includes a line decided as "Không cấp" (`fulfilledQty` of 0)
- **THEN** the decision is recorded but no issue line is created for it

#### Scenario: Single-line decision still yields a one-line slip
- **WHEN** a warehouse keeper decides one line through the existing single-decision path
- **THEN** exactly one issue slip with one line is created, as before this change

### Requirement: Batch fulfillment validates stock before issuing any line

Before creating the shared issue slip, the system MUST validate aggregate stock per package across all lines in the batch, per the stock-validation rule of the core multi-item capability. A shortfall on any package MUST abort the entire batch: no `SupplyRequestDecision` for any line in the batch is persisted, and no issue slip is created.

#### Scenario: One insufficient package aborts the whole batch
- **WHEN** a batch of three lines includes one whose requested quantity exceeds its package's balance
- **THEN** the system throws `ValidationError`, persists no decisions from the batch, and creates no issue slip

### Requirement: Batch decisions still advance the parent supply request status

After a batch commits, the system MUST recompute the parent `SupplyRequest`'s aggregate status from all its items' `fulfillmentStatus`, using the same forward-only `advanceStatus` logic the single-line path uses.

#### Scenario: Fulfilling all remaining lines in one batch advances status
- **WHEN** a batch fulfillment completes every remaining unfulfilled line of a supply request
- **THEN** the parent supply request's status advances to "Đã cung cấp"
