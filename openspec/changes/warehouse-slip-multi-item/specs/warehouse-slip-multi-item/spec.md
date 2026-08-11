## ADDED Requirements

### Requirement: A slip carries many commodity lines

A warehouse receipt and a warehouse issue MUST each consist of a header and one or more child line rows (`WarehouseReceiptItem`, `WarehouseIssueItem`). Each line MUST carry its own `lotProductId`, `tenSanPham`, `donViTinh`, `warehouseId`, `tenKho`, `lotId`, `tenLo`, and its own stock snapshots. A slip MUST have at least one line; creating a slip with an empty line array MUST be rejected with `ValidationError`.

The header MUST retain the previously flat item-level columns as nullable, marked deprecated, so historical rows keep their values and rollback stays non-destructive. New code MUST NOT read item-level values from the header.

Line-to-header deletion MUST cascade. Line-to-`lotProduct` deletion MUST be restricted, preserving the audit fence that prevents deleting a package still referenced by slip history.

#### Scenario: Create a receipt with three commodities
- **WHEN** an authorized user creates a receipt with three lines
- **THEN** the system stores one header with one code and three child lines
- **AND** each line holds its own package, commodity name, unit, warehouse, and lot

#### Scenario: Reject a slip with no lines
- **WHEN** a create request arrives with an empty line array
- **THEN** the system throws `ValidationError` and stores nothing

#### Scenario: Deleting a slip removes its lines
- **WHEN** an unlocked slip is deleted
- **THEN** its child lines are removed by cascade in the same transaction

#### Scenario: A package referenced by a slip line cannot be deleted
- **WHEN** a delete is attempted on a `lotProduct` referenced by any slip line
- **THEN** the database rejects the delete, preserving slip history

### Requirement: A slip may span multiple warehouses and lots

Because warehouse and lot are line-level, one slip MAY contain lines drawn from different warehouses and different lots. The system MUST NOT reject a slip on the grounds that its lines disagree about warehouse or lot.

#### Scenario: One issue slip draws from two warehouses
- **WHEN** an authorized user creates an issue whose lines reference packages in two different warehouses
- **THEN** the slip is accepted and each line records its own warehouse and lot

### Requirement: Each line separates requested from actual quantity

Every line MUST carry `soLuongYeuCau` (requested) and `soLuongThucTe` (actual). All stock mutation MUST be computed from `soLuongThucTe`. A line where `soLuongThucTe` is less than `soLuongYeuCau` represents a short fulfillment and MUST be accepted without a separate status field. `soLuongThucTe` MUST be greater than zero. `soLuongThucTe` MAY exceed `soLuongYeuCau` for receipts, where an over-delivery is legitimate.

#### Scenario: Short issue is recorded in place
- **WHEN** an issue line requests 100 units and only 60 are actually issued
- **THEN** the line stores `soLuongYeuCau` 100 and `soLuongThucTe` 60
- **AND** stock decreases by 60

#### Scenario: Zero actual quantity is rejected
- **WHEN** a line is submitted with `soLuongThucTe` of zero or a negative value
- **THEN** the system throws `ValidationError` and stores nothing

### Requirement: Issue stock validation aggregates by package before any write

For a warehouse issue, the system MUST group all incoming lines by `lotProductId`, sum `soLuongThucTe` within each group, and compare each group's sum against that package's current balance. Every group MUST pass before the first line or stock update is written. On any shortfall the system MUST throw `ValidationError` naming the insufficient package and its current balance, and the transaction MUST roll back leaving stock and slip unchanged.

Validating each line independently is insufficient and MUST NOT be used: several lines that each fit within the balance can exceed it in total.

#### Scenario: Two lines on one package exceed the balance in total
- **WHEN** an issue is submitted with two lines of 60 units each against the same package holding 100 units
- **THEN** the system throws `ValidationError` because the aggregate of 120 exceeds 100
- **AND** no line is written and the package balance stays at 100

#### Scenario: Aggregate within balance is accepted
- **WHEN** an issue is submitted with two lines of 40 units each against the same package holding 100 units
- **THEN** the slip is created and the package balance ends at 20

#### Scenario: Shortfall on one package rolls back the whole slip
- **WHEN** an issue has three lines and only the third exceeds its package's balance
- **THEN** the system throws `ValidationError` and the first two lines are not written

### Requirement: Per-line stock snapshots are computed sequentially

Each line MUST record `soLuongTruoc` (balance before that line) and `soLuongSau` (balance after). Lines MUST be processed in a deterministic order, and each line's opening balance MUST come from a running in-transaction tally rather than a fresh read of the stored package balance.

When two lines target the same package, the second line's `soLuongTruoc` MUST equal the first line's `soLuongSau`. Snapshots that both report the pre-transaction balance are incorrect even when the final package balance is right.

#### Scenario: Two receipt lines on one package chain their snapshots
- **WHEN** a receipt has two lines of 30 and 20 units against a package holding 100
- **THEN** the first line records `soLuongTruoc` 100 and `soLuongSau` 130
- **AND** the second line records `soLuongTruoc` 130 and `soLuongSau` 150
- **AND** the package balance ends at 150

#### Scenario: Two issue lines on one package chain their snapshots
- **WHEN** an issue has two lines of 30 and 20 units against a package holding 100
- **THEN** the first line records `soLuongTruoc` 100 and `soLuongSau` 70
- **AND** the second line records `soLuongTruoc` 70 and `soLuongSau` 50

#### Scenario: Snapshots are not retroactively recalculated
- **WHEN** a slip is created or edited
- **THEN** snapshots on earlier and later slips remain untouched

### Requirement: One code is generated per slip

The system MUST generate exactly one slip code per slip, regardless of line count, using the existing yearly code helpers (`PN` for receipts, `PX` for issues). Code generation MUST NOT occur per line.

#### Scenario: A five-line receipt gets one code
- **WHEN** an authorized user creates a receipt with five lines
- **THEN** exactly one `PN` code is generated and one slip exists

### Requirement: Header carries derived quantity totals

The header MUST store the summed actual quantity across its lines and the line count. Both MUST be recomputed inside the same transaction as any line create, update, or delete, so they never disagree with the lines.

#### Scenario: Totals reflect lines after creation
- **WHEN** a slip is created with lines of 30, 20, and 50 units
- **THEN** the header records a total of 100 and a line count of 3

#### Scenario: Totals are recomputed after edit
- **WHEN** a line is removed from an existing slip
- **THEN** the header total and line count are recomputed in the same transaction

### Requirement: Slip update resolves a line diff before writing

Updating a slip MUST partition incoming lines against stored lines into removed, added, and modified sets, all inside a single `prisma.$transaction`. Removed lines MUST reverse their stock effect. Added lines MUST apply theirs. Modified lines MUST reverse the stored effect then apply the new one, against a different package when `lotProductId` changed.

Every negative-stock and insufficient-stock guard MUST run across the fully-resolved diff before any write. Snapshots MUST then recompute sequentially for the surviving lines. On any guard failure the transaction MUST roll back with no partial stock movement.

#### Scenario: Remove one line from a three-line receipt
- **WHEN** an authorized user edits a three-line receipt down to two lines
- **THEN** the removed line's stock addition is reversed on its package
- **AND** the remaining two lines keep correct sequential snapshots and the header totals are recomputed

#### Scenario: Add a line to an existing slip
- **WHEN** an authorized user adds a fourth line to a three-line slip
- **THEN** the new line applies its stock effect and the other three are left unchanged

#### Scenario: Repoint a line to a different package
- **WHEN** an authorized user changes a line's `lotProductId`
- **THEN** the stored effect is reversed on the original package and the new effect applied to the target package in one transaction

#### Scenario: Guard failure anywhere rolls back the whole edit
- **WHEN** an edit's resolved diff would drive any package balance below zero
- **THEN** the system throws `ValidationError` and no stock or line change persists

### Requirement: Slip history for a package reads from lines

The package receipt-history endpoint MUST return rows sourced from slip lines joined to their headers, exposing the header's code, date, and staff fields alongside the line's purpose, quantity, unit, snapshots, and note. Results MUST stay ordered by slip date ascending.

#### Scenario: History shows one entry per line, not per slip
- **WHEN** a package was received by two lines belonging to the same multi-line slip
- **THEN** the history returns two rows, both showing that slip's code and date

### Requirement: The slip list renders one row per commodity line

The receipt and issue list tables MUST render one table row for every commodity line of every slip. Each row MUST show the warehouse, lot, commodity name, quantity, and unit of measure belonging to that line. Slip-level columns (code, date, staff, actions) MUST be merged vertically across a slip's rows so a multi-line slip still reads as one slip.

Quantities MUST NOT be summed across lines whose units of measure differ, and a summed figure MUST NOT be labelled with the unit of an arbitrary line. Where a total across mixed units is displayed, it MUST be broken out per unit. This applies to every surface that totals a slip's lines — the list table, the printable view, and the detail modal alike. Collapsing a multi-line slip into a single row that shows only the deprecated header mirror is forbidden, because the mirror holds only the first line.

The header's derived total-quantity column MUST NOT be used to render a displayed total, because it is itself a cross-unit sum. Displayed totals MUST be computed from the slip's lines and grouped by unit of measure; an unlabelled bare number is forbidden even where it happens to be arithmetically consistent, because the reader cannot tell what it counts.

Pagination MUST count slips rather than table rows, so a slip's lines are never split across two pages; a page containing multi-line slips consequently shows more table rows than the page size.

#### Scenario: A two-line slip occupies two table rows
- **GIVEN** an issue slip whose first line is 1 Cái from the tools warehouse and whose second line is 1 Cuộn from the supplies warehouse
- **WHEN** the user views the issue list
- **THEN** the table shows two rows for that slip, one per line
- **AND** each row shows its own warehouse, lot, commodity, quantity, and unit
- **AND** the slip code, date, staff, and action buttons are rendered once, spanning both rows

#### Scenario: Mixed units are never summed into one figure
- **GIVEN** a slip with one line of 1 Cái and one line of 1 Cuộn
- **WHEN** the list or the printable view displays that slip
- **THEN** no cell shows "2 Cái" or any other cross-unit sum
- **AND** any total is reported separately per unit of measure

#### Scenario: The detail modal breaks its total out by unit
- **GIVEN** a slip whose first line is 1 Cái and whose second line is 1 Cuộn
- **WHEN** the user opens that slip's detail modal
- **THEN** the totals row shows "1 Cái, 1 Cuộn" rather than a bare "2"
- **AND** the modal does not read the header's derived total-quantity column to produce this text

#### Scenario: A multi-line slip is not split across pages
- **GIVEN** a page size of 10 slips where one slip on the page has two lines
- **WHEN** the user views that page
- **THEN** all 10 slips appear in full, and the table shows 11 rows

### Requirement: Search and filter match on any line of a slip

Search and per-column filters over commodity name, warehouse name, and lot name MUST match a slip when ANY of its lines matches. Matching only against the deprecated flat header fields is forbidden, because those mirror only the first line and make every later line unfindable. For legacy slips stored with no lines, the header fields MAY serve as the single fallback line.

#### Scenario: Searching for a second-line commodity finds the slip
- **GIVEN** a slip whose first line is "Dao thái lan" and whose second line is "Dây nilong cuộn 500g"
- **WHEN** the user searches for "Dây nilong"
- **THEN** that slip appears in the results

#### Scenario: Filtering by a second-line warehouse finds the slip
- **GIVEN** a slip whose first line is in the tools warehouse and whose second line is in the supplies warehouse
- **WHEN** the user filters the warehouse column by the supplies warehouse
- **THEN** that slip appears in the results

### Requirement: Update payloads carry the stored id of every retained line

A client editing a slip MUST send the full set of lines the slip should end up with, and MUST include the stored line `id` on every line that already exists. A newly added line MUST be sent without an `id`. The edit UI MUST therefore present all lines of the slip, allowing each to be modified, removed, or added to — editing only the first line is forbidden.

This is a data-loss guard, not a convenience: the server diffs incoming lines against stored lines by `id`, so a payload that drops the ids of retained lines is indistinguishable from a request to delete every stored line and insert one new one.

#### Scenario: Editing a two-line slip loses no line
- **GIVEN** an unlocked slip stored with two lines
- **WHEN** the user opens the edit form, changes only the first line's quantity, and saves
- **THEN** the payload carries both lines, each with its stored `id`
- **AND** the server classifies both as modified, none as removed or added
- **AND** the slip still has exactly two lines afterwards, and the untouched line's package balance is unchanged

#### Scenario: A newly added line is sent without an id
- **WHEN** the user adds a line to an existing slip and saves
- **THEN** the new line is sent with no `id` and the existing lines keep theirs
- **AND** the server classifies the new line as added and the rest as modified

#### Scenario: Removing a line is deliberate and reversed
- **WHEN** the user removes a line in the edit form and saves
- **THEN** that line's `id` is absent from the payload while the others are present
- **AND** the server reverses only that line's stock effect

### Requirement: Slip payloads are schema-validated

Create and update endpoints for both slip types MUST validate their request bodies with zod before reaching the service, including the nested line array. Validation MUST reject an empty line array, a missing `lotProductId` on any line, and a non-positive `soLuongThucTe`. Failures MUST return HTTP 400 in the standard `{ success: false, message }` shape.

#### Scenario: Malformed line array is rejected at the boundary
- **WHEN** a create request omits `lotProductId` on one of its lines
- **THEN** the request is rejected with HTTP 400 and no service call occurs
