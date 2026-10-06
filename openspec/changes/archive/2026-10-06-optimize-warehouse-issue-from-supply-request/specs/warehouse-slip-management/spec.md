# Spec Delta

## MODIFIED Requirements

### Requirement: Slip edit and delete are available in the warehouse tabs

The warehouse receipt and issue tabs MUST provide an Edit action and a Delete action for each slip row, alongside the existing view-detail action. Both actions MUST be hidden when the slip's `isLocked` is true. Edit MUST reuse the create modal in edit mode (prefilled fields, "Cập nhật" submit label) and call the update endpoint. Delete MUST confirm with the user, call the delete endpoint, then refresh the slip list and warehouse stock and invalidate the warehouses query cache.

The warehouse issue creation flow from a supply request (`CreateWarehouseIssueModal` with `supplyRequest`) MUST include a confirmation step that renders an editable table: each row's `soLuongThucTe` (actual quantity) SHALL be a number input and `lotProductId` (package) SHALL be a `LotProductCombobox`. Edits SHALL validate live: quantity MUST be `> 0` and `≤` the selected package's `soLuong`; when planned quantity (`soLuongYeuCau`) differs from actual (`soLuongThucTe`) in planned mode, `lyDoChenhLech` SHALL be required. The Confirm button SHALL be disabled while any row violates these constraints.

#### Scenario: Confirm step allows inline edits

- **WHEN** the user opens the confirmation after filling the main form
- **THEN** they can edit quantity and package directly in the confirmation table without returning to the main form

#### Scenario: Over-stock in confirm disables confirmation

- **WHEN** a confirm row's edited quantity exceeds the selected package's stock
- **THEN** the row shows an over-stock error and the Confirm button is disabled

#### Scenario: Plan/actual mismatch requires reason in confirm

- **WHEN** `soLuongYeuCau ≠ soLuongThucTe` and `lyDoChenhLech` is empty
- **THEN** the Confirm button is disabled and a validation message is shown

#### Scenario: Locked slip hides edit and delete

- **WHEN** a slip row has `isLocked === true`
- **THEN** the row shows only the view-detail action; Edit and Delete are not rendered

#### Scenario: Deleting a slip refreshes data

- **WHEN** the user confirms deletion of an unlocked slip
- **THEN** the tab calls the delete endpoint, then re-fetches slips and warehouses and invalidates the warehouses query cache
