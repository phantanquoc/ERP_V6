## ADDED Requirements

### Requirement: Typed attendance/kiosk devices

The system SHALL classify each `AttendanceDevice` with a `type` of `FACE` or `DATA_ENTRY`, defaulting to `FACE`. Existing devices SHALL be treated as `FACE`.

#### Scenario: Create a data-entry device
- **WHEN** an admin creates a device with type `DATA_ENTRY`
- **THEN** the device is stored with `type = "DATA_ENTRY"` and a unique `apiKey`

#### Scenario: Legacy devices default to FACE
- **WHEN** the migration runs on existing devices
- **THEN** each existing device has `type = "FACE"`

### Requirement: Device-or-JWT authentication for data-entry endpoints

The system SHALL authenticate the data-entry kiosk endpoints by accepting a valid `x-device-key` of type `DATA_ENTRY`, and SHALL otherwise fall back to normal JWT authentication. The protected endpoints are limited to: finished-products (list GET, bulk-warehouse-receipt POST), material-evaluations (GET, POST, generate-code), material-evaluation-criteria (GET), lot-products (`/lots`, `/kien`), machine-systems (`/active-production`), machine-system-details (GET).

#### Scenario: Valid data-entry device key grants access
- **WHEN** a request to a protected data-entry endpoint carries a valid, active `x-device-key` of type `DATA_ENTRY`
- **THEN** the request is authorized as a kiosk device without a JWT

#### Scenario: JWT fallback for desktop
- **WHEN** a request to a protected endpoint has no valid device key but a valid JWT
- **THEN** the request is authorized normally as that user

#### Scenario: Wrong-type key rejected
- **WHEN** a request presents a `FACE` device key to a data-entry endpoint (and no valid JWT)
- **THEN** the request is rejected as unauthorized

#### Scenario: Inactive device key rejected
- **WHEN** a request presents a device key whose device is `isActive = false` (and no valid JWT)
- **THEN** the request is rejected as unauthorized

### Requirement: Face kiosk constrained to FACE keys

The face-attendance kiosk verification SHALL only accept device keys of type `FACE`.

#### Scenario: Data-entry key cannot check in faces
- **WHEN** a `DATA_ENTRY` device key is used on the face kiosk verify endpoint
- **THEN** verification is rejected as an invalid device

### Requirement: Operator attribution for device-authenticated writes

When a write is authenticated by a data-entry device key (no JWT user), the system SHALL attribute the record to the operator selected on the kiosk, provided via header `x-operator-id`, and SHALL validate that the operator is an existing employee.

#### Scenario: Finished-product receipt attributed to operator
- **WHEN** a device-authenticated bulk warehouse receipt is submitted with a valid `x-operator-id`
- **THEN** the receipt's `employeeId` is the operator's employee id (not a logged-in user)

#### Scenario: Material evaluation attributed to operator
- **WHEN** a device-authenticated material evaluation is created with a valid `x-operator-id`
- **THEN** the evaluation records the operator as its author

#### Scenario: Missing or invalid operator rejected
- **WHEN** a device-authenticated write has no `x-operator-id` or an id that is not an existing employee
- **THEN** the request is rejected with a validation error

#### Scenario: Desktop attribution unchanged
- **WHEN** the same endpoints are called with a JWT (desktop)
- **THEN** the record is attributed to `req.user` as before

### Requirement: Kiosk uses device key instead of borrowed JWT

The data-entry kiosk pages SHALL authenticate API calls using a stored device key (`x-device-key`) plus the selected `x-operator-id`, and SHALL NOT depend on a borrowed user JWT or its refresh flow.

#### Scenario: Kiosk survives deploy without re-login
- **WHEN** the backend is redeployed or restarted while a kiosk holds a valid device key
- **THEN** the kiosk continues to call the API successfully without any login

#### Scenario: First-time device key entry
- **WHEN** a kiosk page loads without a stored device key
- **THEN** the page prompts for (or accepts via query param) a device key and stores it for subsequent use

### Requirement: Admin device management

The admin System Settings page SHALL provide a device management section to list devices, create a device with a chosen type, copy a device's apiKey, and toggle its active state.

#### Scenario: Admin creates and copies a data-entry key
- **WHEN** an admin creates a `DATA_ENTRY` device and copies its apiKey
- **THEN** the key can be pasted into a kiosk tablet to authenticate it

#### Scenario: Admin disables a device
- **WHEN** an admin toggles a device to inactive
- **THEN** subsequent requests using that device key are rejected
