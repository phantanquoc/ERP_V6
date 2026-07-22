## ADDED Requirements

### Requirement: Tablet entry hub

The system SHALL provide a full-screen tablet hub screen that lists the available data-entry types as large navigation cards. The hub SHALL currently show two entries — Sản lượng chiên (`/production/nhap-lieu`) and Đánh giá nguyên liệu (`/production/nhap-lieu-danh-gia`) — and SHALL reserve a visible placeholder slot for a future third entry type. The hub route SHALL be public (outside the sidebar layout) and self-guard as a kiosk tab, consistent with the existing entry pages.

#### Scenario: Hub lists entry types

- **WHEN** a kiosk tab opens the hub
- **THEN** two navigation cards (Sản lượng chiên, Đánh giá nguyên liệu) are shown, plus a placeholder slot for a future third type

#### Scenario: Navigate to an entry page

- **WHEN** the worker taps an entry card
- **THEN** the tablet navigates to that entry page's route

### Requirement: Attended operators by shift

After a shift is chosen on an entry page, the system SHALL fetch the operator list from a kiosk endpoint keyed by production date, shift number, and page key. The list SHALL contain only employees who (a) have an Attendance record for that date whose check-in time maps to the chosen shift, and (b) hold a position mapped to that page. Each returned operator SHALL include name, employee code, and position name.

#### Scenario: Only attended, correctly-positioned operators

- **WHEN** the operator list is fetched for a date, shift, and page
- **THEN** it contains only employees who checked in that day into that shift and whose position is mapped to that page

#### Scenario: Empty attended list

- **WHEN** no employee matches the date, shift, and page
- **THEN** a Vietnamese empty-state is shown and the "Tìm người khác" fallback remains available

### Requirement: Shift-to-name matching

The system SHALL determine an employee's shift by deriving the shift name from their check-in time using the existing shift-window logic, then matching the numeric kiosk shift to the shift name of the form "Ca N". Shifts whose name does not match the "Ca N" pattern SHALL be excluded from kiosk operator filtering.

#### Scenario: Check-in maps to chosen shift

- **WHEN** an employee's check-in time falls in the window of the shift named "Ca 2" and the worker chose shift 2
- **THEN** that employee is included in the shift-2 operator list

#### Scenario: Non-numeric shift excluded

- **WHEN** an employee's check-in maps to a shift named "Hành chính"
- **THEN** that employee is not included in any numeric kiosk shift list
