# daily-fry-batch-schedule Specification

## Purpose

Fixed sixteen-batch daily fry-batch schedule that replaces the previous unbounded code scheme. Defines a repeating `MC-01` through `MC-16` cadence anchored at 06:30 each production day, with shift grouping, production-day semantics, and on-demand record creation.

## Requirements

### Requirement: Fixed sixteen-batch daily schedule

The system SHALL define a fixed daily fry-batch schedule of exactly sixteen batches per production day, coded `MC-01` through `MC-16` with a two-digit sequence. The first batch SHALL start at 06:30 and each batch SHALL last 90 minutes, so the sixteenth batch starts at 05:00 and the cycle closes at 06:30 the following morning.

The codes SHALL be identical on every production day. They SHALL be derived from the production day rather than allocated from a running sequence, so no code counter exists and no two production days receive different code sets.

#### Scenario: Schedule for a production day

- **WHEN** the schedule is requested for a production day
- **THEN** exactly sixteen entries are returned, coded `MC-01` through `MC-16`

#### Scenario: Start times follow the 90-minute cadence

- **WHEN** the schedule for a production day is inspected
- **THEN** `MC-01` starts at 06:30, each subsequent batch starts 90 minutes after the previous one, and `MC-16` starts at 05:00 of the following calendar day

#### Scenario: Codes repeat across days

- **WHEN** the schedule is requested for two different production days
- **THEN** both return the same sixteen codes `MC-01` through `MC-16`

#### Scenario: No sequence allocation

- **WHEN** a fry-batch record is created for a scheduled code
- **THEN** the code comes from the schedule for that production day and no global code counter is read or advanced

### Requirement: Production day is the 06:30 cycle

A production day SHALL be the period from 06:30 on that date to 06:30 on the following date. The system SHALL store this as `ngaySanXuat` on the fry batch, separate from the batch's `thoiGianChien` timestamp.

Batches whose start time falls after midnight (`MC-13` at 00:30, `MC-14` at 02:00, `MC-15` at 03:30, `MC-16` at 05:00) SHALL carry the `ngaySanXuat` of the day their shift began, not the calendar date shown on the clock.

#### Scenario: After-midnight batches keep the starting day

- **WHEN** the schedule for production day 2026-07-27 is inspected
- **THEN** `MC-13` through `MC-16` have `ngaySanXuat` 2026-07-27 even though their clock times fall on 2026-07-28

#### Scenario: Deriving the production day from a timestamp

- **WHEN** a timestamp before 06:30 is mapped to a production day
- **THEN** the production day is the previous calendar date

#### Scenario: Deriving the production day at the boundary

- **WHEN** a timestamp at exactly 06:30 is mapped to a production day
- **THEN** the production day is that same calendar date

### Requirement: Shift grouping by batch count

The sixteen batches SHALL be grouped into three shifts by batch count, not by clock hours: shift 1 covers `MC-01` through `MC-05`, shift 2 covers `MC-06` through `MC-10`, and shift 3 covers `MC-11` through `MC-16`. The grouping SHALL be fixed and SHALL NOT depend on when a worker clocks in.

When a worker selects a shift, the system SHALL offer only that shift's batch codes for the selected production day.

#### Scenario: Shift 1 batches

- **WHEN** a worker selects shift 1
- **THEN** only `MC-01` through `MC-05` are offered

#### Scenario: Shift 2 batches

- **WHEN** a worker selects shift 2
- **THEN** only `MC-06` through `MC-10` are offered

#### Scenario: Shift 3 batches

- **WHEN** a worker selects shift 3
- **THEN** `MC-11` through `MC-16` are offered, including the four that run after midnight

#### Scenario: Grouping is independent of clock-in time

- **WHEN** the shift of a batch is determined
- **THEN** it follows the batch's position in the sixteen-code sequence and not the hours of any work roster

### Requirement: Batch identity is code plus production day

A fry batch SHALL be identified by the pair (`maChien`, `ngaySanXuat`). `maChien` alone SHALL NOT be treated as unique, and every query, update and deletion that targets a fry batch or its child rows SHALL be scoped by production day as well as code.

#### Scenario: Same code on different days are different batches

- **WHEN** `MC-01` exists for two different production days
- **THEN** both records exist independently and neither overwrites the other

#### Scenario: Child rows are scoped by production day

- **WHEN** child rows are looked up for a batch code
- **THEN** only the rows belonging to that code on that production day are returned

#### Scenario: Deletion is scoped by production day

- **WHEN** a batch is deleted
- **THEN** only that code's rows for that production day are removed, and the same code on other production days is untouched

### Requirement: Records are created on demand, not pre-created

The system SHALL NOT pre-create fry-batch records or their child rows for scheduled codes. The sixteen codes SHALL exist as a computed schedule only; a `MaterialEvaluation` record and its child rows SHALL be written only when a worker actually enters data for that batch.

#### Scenario: Unused batch has no record

- **WHEN** a production day passes and no worker entered data for `MC-09`
- **THEN** no `MaterialEvaluation` row and no child rows exist for `MC-09` on that day

#### Scenario: Entry creates the record

- **WHEN** a worker enters evaluation data for a scheduled code that has no record yet
- **THEN** the record is created for that code and production day, and its child rows are generated

#### Scenario: Schedule is offered regardless of records

- **WHEN** a worker selects a shift on a production day with no records at all
- **THEN** the shift's batch codes are still offered for selection

### Requirement: Legacy codes are left unchanged

Fry-batch codes created before the cut-over under the old unbounded scheme (`MC-001` and similar three-digit codes) SHALL be left as they are. The system MUST NOT rewrite them into the new format. Their `ngaySanXuat` SHALL be backfilled from `thoiGianChien` using the 06:30 production-day boundary.

#### Scenario: Legacy code retained

- **WHEN** a pre-cut-over batch `MC-047` is loaded
- **THEN** its code is unchanged and it is not renumbered into the new two-digit scheme

#### Scenario: Legacy production day backfilled

- **WHEN** a pre-cut-over batch has `thoiGianChien` at 02:00 on 2026-06-10
- **THEN** its backfilled `ngaySanXuat` is 2026-06-09, following the 06:30 boundary

#### Scenario: Reports spanning the cut-over

- **WHEN** a report covers production days both before and after the cut-over
- **THEN** both code formats appear and neither is suppressed or rewritten

