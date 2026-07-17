## 1. Schema & Migration

- [x] 1.1 Add `type String @default("FACE")` to `AttendanceDevice` in `backend/prisma/schema/common.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add_device_type` + `npx prisma generate`; if DB unavailable, hand-write migration SQL under `backend/prisma/migrations` + `prisma generate` and flag the user to apply it ← (verify: type column exists with default FACE, existing rows backfilled FACE, prisma client regenerated, NO db push)

## 2. Backend — Device service & controller

- [x] 2.1 `faceAttendanceService.createDevice` — accept + persist `type` (validate FACE|DATA_ENTRY, default FACE); `listDevices` returns `type`; optional filter by type
- [x] 2.2 `faceAttendanceController.createDevice` — read `type` from body, validate; `listDevices` returns type unchanged
- [x] 2.3 `faceAttendanceService.validateDevice` (or face kiosk verify path) — constrain accepted key to `type = FACE` ← (verify: DATA_ENTRY key rejected on face verify; existing FACE devices still work)

## 3. Backend — Dual-auth middleware

- [x] 3.1 Add `deviceOrJwtAuth(requiredType: string)` in `backend/src/middlewares/auth.ts`: read `x-device-key` → validate `AttendanceDevice` (active + `type === requiredType`) → set `req.isKioskDevice = true`, `req.kioskOperatorId = header x-operator-id`; else delegate to existing `authenticate`
- [x] 3.2 Extend `AuthenticatedRequest` type with `isKioskDevice?` and `kioskOperatorId?`
- [x] 3.3 Apply `deviceOrJwtAuth('DATA_ENTRY')` to exactly the kiosk endpoints: finished-products (GET list, POST bulk-warehouse-receipt), material-evaluations (GET, POST, generate-code), material-evaluation-criteria (GET), lot-products (`/lots`, `/kien`), machine-systems (`/active-production`), machine-system-details (GET) — swap guard on the specific method+path only, leave sibling routes on `authenticate` ← (verify: each listed endpoint accepts a valid DATA_ENTRY key AND still accepts JWT; non-listed methods on the same routers still require JWT)

## 4. Backend — Operator attribution

- [x] 4.1 `finishedProductController.bulkConfirmReceipt` + `createFinishedProduct` — when `req.isKioskDevice`, use `req.kioskOperatorId` (validate `Employee.findUnique` exists, else `ValidationError`) instead of `req.user.id`; desktop path unchanged
- [x] 4.2 `materialEvaluationController` create — same operator-attribution logic ← (verify: device-authenticated receipt/evaluation stores operator's employeeId; missing/invalid operator → ValidationError; desktop still attributes to req.user)

## 5. Frontend — Kiosk session & transport

- [x] 5.1 `OperatorSelectionScreen.tsx` — `onSelect` returns `{ id, name }`
- [x] 5.2 `kioskSession.ts` — add `operatorId` to `KioskSelection` (get/set); add `pdeDeviceKey` (localStorage) with `getDeviceKey/setDeviceKey/clearDeviceKey`; `hasKioskSession()` checks device key presence
- [x] 5.3 `apiClient.ts` — in kiosk tabs send `x-device-key` (from getDeviceKey) + `x-operator-id` (from selection) instead of `Authorization`; remove the kiosk JWT refresh flow; desktop path unchanged ← (verify: kiosk requests carry device+operator headers, no Authorization; desktop unchanged)

## 6. Frontend — Kiosk pages device-key entry

- [x] 6.1 `ProductionDataEntry.tsx` — if no `pdeDeviceKey`, prompt for it (input) or read `?deviceKey=` query param, store it; update entry guard
- [x] 6.2 `ProductionMaterialEvaluationEntry.tsx` — same device-key entry/guard ← (verify: fresh tablet with no key prompts once, then persists across reload)

## 7. Frontend — Admin device management

- [x] 7.1 `faceAttendanceService.ts` — add `type` to `AttendanceDevice` interface and `createDevice(name, location, type)`
- [x] 7.2 Create `DeviceManagementSection.tsx` — list devices (name, location, type badge, isActive, createdAt), create form (name, location, type FACE|DATA_ENTRY), copy apiKey button, toggle active
- [x] 7.3 Mount the section in `SystemSettingsPage.tsx` under the `system` tab (admin only) ← (verify: admin can create a DATA_ENTRY device, copy its key, toggle it; non-admin cannot see the section)

## 8. Verification

- [x] 8.1 `cd backend && npx prisma generate` then `cd backend && npx tsc --noEmit` — must pass
- [x] 8.2 `cd frontend && npx tsc --noEmit` — must pass
- [x] 8.3 `cd backend && npm run lint` — report; fix only in-scope files ← (verify: all checks green; end-to-end — create DATA_ENTRY key, run kiosk, restart backend, kiosk still works without login)
