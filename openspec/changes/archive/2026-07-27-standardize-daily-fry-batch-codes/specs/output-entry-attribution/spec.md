## ADDED Requirements

### Requirement: Per-grade entry history

The system SHALL record, for each output weight a worker enters, which worker entered it, which grade it belongs to, which fry batch and machine it applies to, and when it was entered. These records SHALL be stored in a child table of `FinishedProduct` so that one output record can carry attribution for several grades entered by different workers.

This replaces the previous single-column approximation, under which a `FinishedProduct` row carried one operator name for all eight grade weights and per-grade attribution was unreachable.

#### Scenario: Two workers entering different grades

- **WHEN** one worker enters a Hang A weight and another worker enters a Hang B weight for the same fry batch and machine
- **THEN** two entry-history records exist, each naming the worker who entered that grade

#### Scenario: Attribution survives a later entry

- **WHEN** a worker enters a Hang B weight on a record where another worker had already entered Hang A
- **THEN** the Hang A attribution is unchanged and still names the original worker

#### Scenario: Re-entering the same grade

- **WHEN** a worker changes a grade weight that already has an entry-history record
- **THEN** the history reflects who made the most recent entry for that grade, and the record identifies the grade, batch, machine and time

### Requirement: Waste distribution is not attributed as manual entry

The even distribution of the shift waste total across every batch and machine SHALL NOT create per-grade entry-history records attributing those shares to the worker who entered the total. Only weights a worker enters directly SHALL produce attribution records.

#### Scenario: Waste total does not attribute other grades

- **WHEN** the worker responsible for Uot enters the shift waste total and confirms
- **THEN** the waste shares are written to every cell and no entry-history record claims the other workers' grades for that worker

#### Scenario: Directly entered grade is attributed

- **WHEN** the same worker enters a Uot weight by hand
- **THEN** an entry-history record attributes that Uot weight to that worker

### Requirement: Employee reference without a foreign key

The entry-history record SHALL reference the employee by a soft reference that carries no database foreign-key constraint, because the employee record and the production record live in different database schemas. Deleting or changing an employee record MUST NOT cascade into or block production history.

#### Scenario: History survives employee record changes

- **WHEN** an employee record is later deactivated or removed
- **THEN** the existing entry-history records remain intact and readable

#### Scenario: No cross-schema constraint

- **WHEN** the schema is inspected
- **THEN** the employee reference on the entry-history model has no foreign-key constraint

### Requirement: Per-grade attribution in the output export

The output export SHALL surface per-grade attribution rather than a single operator name per record, so a reviewer can see which worker entered each grade weight.

#### Scenario: Export shows who entered each grade

- **WHEN** an output report is exported for a production day where different workers entered different grades
- **THEN** the export conveys the entering worker per grade rather than one name for the whole record

#### Scenario: Export for records without history

- **WHEN** a pre-cut-over record has no entry-history rows
- **THEN** the export still renders without error and does not invent attribution
