## Why

The two production data-entry kiosk pages (`/production/nhap-lieu` and `/production/nhap-lieu-danh-gia`) currently "borrow" a real user's JWT access + refresh tokens (copied via `kioskSession.activate`). After every production deploy, the operator logs back into that account on another machine, which triggers single-device login (`authService.ts` deletes all refresh tokens for the user), invalidating the kiosk's tokens and forcing the tablet to log in again. The face-attendance kiosk never has this problem because it authenticates with a device key (`AttendanceDevice.apiKey`, header `x-device-key`) that is bound to the device — not a user — and survives deploys and restarts.

## What Changes

- Give the data-entry kiosks their own **device key** (same mechanism as the face kiosk), reusing the existing `AttendanceDevice` table.
- Add **dual authentication** to the specific endpoints the kiosks call: a valid `x-device-key` is accepted, otherwise the request falls back to normal JWT `authenticate`. Desktop behavior is unchanged.
- **Classify devices by purpose** via a new `type` column on `AttendanceDevice` (`FACE` | `DATA_ENTRY`). A `DATA_ENTRY` key only works on data-entry routes; a `FACE` key only works on the attendance kiosk.
- Record "who did it" from the **operator selected on the kiosk** (not `req.user`). Because `WarehouseReceipt.employeeId` is a NOT-NULL FK to `Employee`, the operator picker must return an id, sent via header `x-operator-id`, and the backend validates the employee exists.
- Add a **"Quản lý thiết bị" (Device Management)** section to the admin System Settings page: list devices, create a device (choose type), copy its apiKey, toggle active.

## Capabilities

### New Capabilities
- `kiosk-device-auth`: Device-key authentication for production data-entry kiosks — a typed device key (reusing `AttendanceDevice`) that authenticates a fixed set of data-entry endpoints (with JWT fallback), attributes writes to the on-kiosk selected operator, and is managed by admins from System Settings. Includes the device `type` classification that also constrains the existing face-attendance kiosk to `FACE` keys.

### Modified Capabilities
<!-- None — no existing capability spec governs kiosk/device authentication. -->

## Impact

- **Schema (migration required)**: `AttendanceDevice` (`common.prisma`) gains `type String @default("FACE")`; existing rows backfill to `FACE`. Requires `prisma migrate dev` + `prisma generate` (NOT `db push`).
- **Backend**: new `deviceOrJwtAuth(requiredType)` middleware; `faceAttendanceService.createDevice`/`listDevices` carry `type`; face kiosk verify constrained to `FACE`; selected data-entry routes switch to dual-auth; `finishedProductController` (bulkConfirmReceipt, createFinishedProduct) and `materialEvaluationController` (create) attribute to `kioskOperatorId` when device-authenticated.
- **Frontend**: `OperatorSelectionScreen` returns `{ id, name }`; `kioskSession` gains `operatorId` + `pdeDeviceKey`; `apiClient` sends `x-device-key` + `x-operator-id` in kiosk tabs; both kiosk pages gain a device-key entry/guard; new `DeviceManagementSection` in `SystemSettingsPage`; `faceAttendanceService` types gain `type`.
- **Security**: data-entry kiosks stop depending on borrowed user JWTs and single-device login; device keys are typed to prevent cross-use between attendance and data entry.
- **Out of scope**: face kiosk logic beyond the `type=FACE` constraint, desktop JWT / single-device login, any route outside the listed data-entry endpoints, `db push`.
