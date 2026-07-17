## Context

Data-entry kiosks (`ProductionDataEntry`, `ProductionMaterialEvaluationEntry`) run full-screen on tablets and currently reuse a user's JWT via `kioskSession` (localStorage `pdeAccessToken`/`pdeRefreshToken`). Single-device login in `authService` deletes a user's refresh tokens on each new login, so the kiosk loses its session whenever the operator logs in elsewhere after a deploy. The face kiosk avoids this with `AttendanceDevice` (`common.prisma`): a DB-backed `apiKey` sent as `x-device-key`, validated by `faceAttendanceService.validateDevice`. Device management endpoints already exist (`GET/POST /face-attendance/devices`, `PATCH /devices/:id/toggle`, ADMIN-only) and already expose `apiKey`. `SystemSettingsPage` already has a `personal`/`system` admin tab switcher.

## Goals / Non-Goals

**Goals:**
- Data-entry kiosks authenticate via a device key that survives deploys/restarts and is independent of any user login.
- Device keys are typed so a data-entry key cannot be used for attendance and vice versa.
- Writes are attributed to the on-kiosk selected operator.
- Admins manage devices from System Settings.

**Non-Goals:**
- Changing desktop JWT auth or single-device login.
- Changing face kiosk logic beyond the `type=FACE` constraint.
- Opening device auth to any endpoint outside the listed data-entry set.

## Decisions

**Decision 1 — Reuse `AttendanceDevice` with a `type` column, not a new table.**
Rationale: the table, endpoints, and frontend service already exist and already expose `apiKey`. Adding `type String @default("FACE")` is one migration with a safe default that backfills existing rows to `FACE`. Alternative (separate table) rejected: duplicates model + endpoints + admin UI for no benefit.

**Decision 2 — `deviceOrJwtAuth(requiredType)` middleware with JWT fallback.**
Rationale: the same endpoints serve both desktop (JWT) and kiosk (device key). The middleware checks `x-device-key` first: if it maps to an active device of `requiredType`, set `req.isKioskDevice = true` and `req.kioskOperatorId` from `x-operator-id`; otherwise delegate to the existing `authenticate`. This keeps desktop untouched and confines device auth to explicitly-guarded routes. Routes currently using `router.use(authenticate)` must swap the guard on the specific kiosk method+path only, leaving other methods on the same router on plain `authenticate`.

**Decision 3 — Attribute writes to the operator, validated as an employee.**
Rationale: `WarehouseReceipt.employeeId` is a NOT-NULL FK to `Employee`; the borrowed-JWT flow used `req.user.id`. The kiosk already has an operator picker, but it only returns a name. It must return `{ id, name }`; the id is sent as `x-operator-id`, and controllers validate `Employee.findUnique` before writing, throwing `ValidationError` if missing. Desktop path keeps `req.user.id`.

**Decision 4 — Device key stored in localStorage (`pdeDeviceKey`), entered once.**
Rationale: mirrors the face kiosk's persistent device key. The kiosk page prompts for the key (or reads `?deviceKey=`) and stores it; `apiClient` sends `x-device-key` + `x-operator-id` on kiosk tabs instead of `Authorization`, and the kiosk refresh-token flow is removed (device keys don't expire).

## Risks / Trade-offs

- **[Broadening a shared router's auth could expose non-kiosk methods]** → Swap the guard only on the exact kiosk method+path; leave sibling routes on `authenticate`. Verify each touched router explicitly.
- **[Device key leakage lets anyone write data]** → Keys are typed (DATA_ENTRY can't do attendance), admin-revocable via `isActive` toggle, and only unlock the minimal endpoint set. Same trust model as the accepted face kiosk.
- **[Operator id spoofing]** → `x-operator-id` is validated against `Employee`; an invalid id is rejected. It only sets attribution, not authorization (the device key authorizes).
- **[Migration on live data]** → `type` has a default; existing rows backfill to `FACE` with no downtime. Use `prisma migrate dev` + `generate`; if the DB is unavailable, hand-write the migration SQL and run `generate`, and tell the user to apply it — never claim it ran.

## Migration Plan

1. Add `type String @default("FACE")` to `AttendanceDevice`.
2. `prisma migrate dev --name add_device_type` then `prisma generate`.
3. Existing devices default to `FACE`; no manual backfill needed.
4. Rollback: drop the `type` column — all devices revert to untyped (behaving as before).
