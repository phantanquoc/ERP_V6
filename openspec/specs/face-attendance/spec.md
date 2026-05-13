## ADDED Requirements

### Requirement: Attendance recording is serialized per employee
The system SHALL prevent duplicate CHECK_IN or CHECK_OUT records for the same employee caused by concurrent kiosk scans. When two verification requests for the same employee arrive simultaneously, only one SHALL succeed in creating an attendance record; the second SHALL be rejected or treated as a cooldown hit.

#### Scenario: Concurrent CHECK_IN from two kiosks
- **WHEN** two kiosk scans for the same employee are processed concurrently with no existing attendance record for today
- **THEN** exactly one CHECK_IN record is created in the database
- **THEN** the second scan receives a cooldown or duplicate response, not a second CHECK_IN

#### Scenario: Sequential scans within cooldown window
- **WHEN** a second scan for the same employee arrives within the cooldown period after a successful CHECK_IN
- **THEN** the system returns a cooldown response without creating a new attendance record

### Requirement: Attendance date queries use the configured application timezone
The system SHALL compute "today" using the `APP_TIMEZONE` environment variable (default: `Asia/Ho_Chi_Minh`) rather than the Node process timezone. All attendance date boundaries (start of day, end of day) SHALL be calculated in the application timezone.

#### Scenario: Query at midnight boundary in UTC+7 deployment
- **WHEN** the current UTC time is 17:00 (which is 00:00 the next day in UTC+7) and `APP_TIMEZONE=Asia/Ho_Chi_Minh`
- **THEN** attendance queries target the new calendar day in UTC+7, not the previous UTC day

#### Scenario: Default timezone when APP_TIMEZONE is unset
- **WHEN** `APP_TIMEZONE` is not set in the environment
- **THEN** the system defaults to `Asia/Ho_Chi_Minh` for all date calculations

### Requirement: Cooldown state is consistent across backend instances
The system SHALL persist cooldown state to the database (`Employee.lastFaceScanAt`) so that a scan on one backend instance correctly detects an active cooldown set by a different instance. The in-memory `recentScans` Map MAY be used as a fast-path optimization but SHALL NOT be the sole source of truth.

#### Scenario: Cooldown set on instance A, checked on instance B
- **WHEN** a successful scan sets cooldown on instance A
- **THEN** a subsequent scan on instance B within the cooldown window reads `Employee.lastFaceScanAt` from the database and returns a cooldown response

#### Scenario: Fast-path cooldown check on same instance
- **WHEN** a scan arrives on the same instance that set the cooldown and the in-memory Map entry is present
- **THEN** the system returns a cooldown response without a database query

### Requirement: Embedding cache invalidation propagates across backend instances
The system SHALL broadcast embedding cache invalidation to all backend instances via Postgres LISTEN/NOTIFY on the `face_profile_changed` channel. Each instance SHALL reset its local embedding cache upon receiving the notification. The embedding cache TTL SHALL be no greater than 30 seconds.

#### Scenario: Profile update invalidates cache on all instances
- **WHEN** a face profile is updated and `invalidateEmbeddingCache()` is called on any instance
- **THEN** all backend instances receive a `face_profile_changed` notification and reset their local embedding caches within the notification delivery latency

#### Scenario: Cache expires by TTL if no explicit invalidation
- **WHEN** no invalidation notification is received
- **THEN** the embedding cache expires and is refreshed within 30 seconds of its last population

### Requirement: Unrecognized face snapshots are stored in the unknown folder
The system SHALL store snapshots of unrecognized faces under `snapshots/unknown/YYYYMMDD/` where `YYYYMMDD` is the current date in the application timezone. The system SHALL NOT store unrecognized face snapshots under any employee's folder, regardless of recognition confidence scores.

#### Scenario: Unrecognized face snapshot storage
- **WHEN** face recognition returns UNRECOGNIZED for a scan
- **THEN** the snapshot is saved to `snapshots/unknown/YYYYMMDD/<filename>` using today's date in APP_TIMEZONE
- **THEN** no snapshot is written to any `snapshots/<employeeId>/` folder

#### Scenario: Recognized face snapshot storage is unchanged
- **WHEN** face recognition returns a matched employee
- **THEN** the snapshot is saved to `snapshots/<employeeId>/<filename>` as before
