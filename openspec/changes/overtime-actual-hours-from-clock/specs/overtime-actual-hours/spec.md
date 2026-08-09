## ADDED Requirements

### Requirement: Actual overtime hours derive from the clock pair against the plan's shift

The system SHALL derive a participant's actual overtime hours for a plan item from that participant's regular (non-overtime) attendance row on the item's date, using the shift recorded on the plan item as the boundary between regular work and overtime.

When the item's overtime window falls after the shift, actual hours SHALL be the clock-out time minus the shift end time. When the window falls before the shift, actual hours SHALL be the shift start time minus the clock-in time. Shift boundaries SHALL be resolved in the application timezone using the existing timezone helper, against a backend clock running in UTC.

The shift SHALL be taken from the plan item, never from the shift label the system inferred at scan time, because inferred labels are demonstrably wrong for participants who clock in early.

#### Scenario: Overtime after the shift is measured from clock-out
- **GIVEN** a plan item for the 07:30–17:00 shift with an overtime window of 17:00–20:00
- **WHEN** the participant clocks out at 18:00
- **THEN** the actual overtime is one hour

#### Scenario: Overtime before the shift is measured from clock-in
- **GIVEN** a plan item for the 14:00–22:00 shift with an overtime window of 11:00–14:00
- **WHEN** the participant clocks in at 10:55
- **THEN** the actual overtime is approximately three hours

#### Scenario: Inferred shift label is ignored
- **GIVEN** a participant whose scan was labelled with one shift by the system but whose plan item names a different shift
- **WHEN** actual overtime is derived
- **THEN** the calculation uses the shift named on the plan item

#### Scenario: Clock pair from the regular attendance row is used
- **GIVEN** a participant holding both a plan-derived overtime row and a regular attendance row on the same date
- **WHEN** actual overtime is derived
- **THEN** the clock times come from the regular row, since that row holds the real punches

### Requirement: Actual hours are rounded to half-hour steps with a tolerance and a ceiling

The system SHALL round derived actual overtime to the nearest half hour. When the derived value falls short of the planned hours by ten minutes or less, the system SHALL credit the full planned hours. The result SHALL never exceed the planned hours for that item. A rounded result below half an hour SHALL be recorded as zero.

#### Scenario: Rounding goes to the nearest half hour, not downward
- **GIVEN** two participants deriving 1.00 and 0.99 hours respectively
- **THEN** both are credited one hour, rather than one hour and half an hour

#### Scenario: A short shortfall is forgiven
- **GIVEN** a planned three hours and a derived 2.92 hours
- **THEN** the participant is credited the full three hours

#### Scenario: Working beyond the plan does not increase the credit
- **GIVEN** a planned two hours and a derived 2.28 hours
- **THEN** the participant is credited two hours

#### Scenario: Trivial overrun credits nothing
- **GIVEN** a planned three hours and a derived 0.22 hours
- **THEN** the participant is credited zero hours

#### Scenario: Exactly half an hour is credited
- **GIVEN** a derived 0.50 hours
- **THEN** the participant is credited half an hour

### Requirement: Plan items are classified as retrospective or prospective individually

The system SHALL classify each plan item by comparing that item's overtime date against the creation date of its plan. An item whose overtime date precedes the plan's creation date is retrospective; otherwise it is prospective. Classification SHALL be performed per item, never per plan, because a single plan may contain items of both kinds.

A retrospective item SHALL retain its planned hours as the actual figure, since the author recorded it after the fact. The system SHALL nevertheless compare against the clock and raise a flag when the two disagree by one hour or more.

A prospective item SHALL have its actual hours derived from the clock once its date has passed.

#### Scenario: A plan spanning past and future is split per item
- **GIVEN** a plan created on 26 July with items dated 22 July through 29 July
- **THEN** the items dated before 26 July are treated as retrospective and those from 26 July onward as prospective

#### Scenario: Retrospective item keeps its planned hours
- **GIVEN** a retrospective item planned at three hours whose clock data suggests 2.9 hours
- **THEN** the actual figure is three hours and no flag is raised

#### Scenario: Retrospective item disagreeing badly is flagged
- **GIVEN** a retrospective item planned at three hours whose clock data suggests one hour
- **THEN** the actual figure is three hours and a flag is raised recording the disagreement

#### Scenario: Prospective item is recomputed once its date passes
- **GIVEN** a prospective item whose overtime date has passed
- **THEN** the actual figure comes from the clock rather than the plan

### Requirement: The system refuses to compute and flags instead when the clock data is unusable

The system SHALL NOT produce an actual-hours figure, and SHALL instead raise a flag naming the reason, when any of the following holds: the participant has no attendance row for the date, the row lacks a clock-in or clock-out, the total elapsed time between the punches is under one hour, or the punches are incompatible with the shift named on the plan item.

A flagged participant-day SHALL contribute zero payable hours when the actual figure is in use, and SHALL remain visible to managers with its reason.

#### Scenario: Missing clock-out is flagged
- **GIVEN** a participant who clocked in but never clocked out
- **THEN** no actual figure is produced and a flag names the missing clock-out

#### Scenario: Double-scan artefact is flagged
- **GIVEN** a participant whose clock-in and clock-out are eleven minutes apart
- **THEN** no actual figure is produced and a flag names the implausibly short day

#### Scenario: Punches contradicting the plan's shift are flagged
- **GIVEN** a plan item naming the 14:00–22:00 shift and a participant whose punches span 05:47 to 17:02
- **THEN** no actual figure is produced and a flag names the shift mismatch, rather than the calculation returning an implausible eight hours

#### Scenario: Absent participant is flagged, not silently zeroed
- **GIVEN** a participant listed on a plan item with no attendance row that day
- **THEN** no actual figure is produced, a flag names the absence, and the participant is visible to managers

### Requirement: Actual hours are computed at read time and not stored

The system SHALL compute actual overtime hours when the data is read, not persist them to the database, and SHALL NOT introduce a scheduled job to maintain them. Reads therefore always reflect the current state of the underlying attendance and plan data.

#### Scenario: Correcting a clock time changes the figure immediately
- **GIVEN** a manager corrects a participant's clock-out
- **WHEN** the attendance or payroll view is next opened
- **THEN** the actual overtime reflects the correction without any intervening job

#### Scenario: No stored column holds the figure
- **WHEN** actual overtime is produced
- **THEN** it exists only in the response, and the attendance row's stored hours are unchanged
