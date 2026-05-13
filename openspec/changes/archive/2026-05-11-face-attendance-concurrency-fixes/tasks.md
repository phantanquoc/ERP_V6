## 1. Dependencies and Configuration

- [x] 1.1 Add `date-fns-tz` (pinned version, e.g. `"date-fns-tz": "3.x.x"`) to `backend/package.json` dependencies and run `npm install` inside `backend/`
- [x] 1.2 Add `APP_TIMEZONE` env var to `backend/src/config/env.ts` with default value `Asia/Ho_Chi_Minh` and export it alongside other env vars

## 2. Timezone Utility

- [x] 2.1 Create `backend/src/utils/dateUtils.ts` and implement `getTodayInAppTz(): Date` — returns a UTC Date representing midnight of today in `APP_TIMEZONE` (use `date-fns-tz` `toZonedTime`/`fromZonedTime`)
- [x] 2.2 Implement `nowInAppTz(): { hour: number; minute: number }` in `backend/src/utils/dateUtils.ts` — returns current hour and minute in `APP_TIMEZONE`
- [x] 2.3 Export both functions from `backend/src/utils/dateUtils.ts` ← (verify: unit-test both functions at a known UTC time with APP_TIMEZONE=Asia/Ho_Chi_Minh; confirm getTodayInAppTz returns correct midnight UTC offset and nowInAppTz returns correct local hour)

## 3. Prisma Schema Migration

- [x] 3.1 Add `lastFaceScanAt DateTime?` nullable field to the `Employee` model in `backend/prisma/schema.prisma`
- [x] 3.2 Run `npx prisma migrate dev --name add-employee-last-face-scan-at` inside `backend/` to generate and apply the migration
- [x] 3.3 Verify the generated migration SQL contains `ALTER TABLE "Employee" ADD COLUMN "lastFaceScanAt" TIMESTAMP(3)` (nullable, no default) ← (verify: migration applies cleanly on a fresh DB and existing Employee rows have NULL for lastFaceScanAt)

## 4. attendanceService.ts — TZ Fix and Transaction Support

- [x] 4.1 Import `getTodayInAppTz` from `backend/src/utils/dateUtils.ts` in `backend/src/services/attendanceService.ts`
- [x] 4.2 Replace the `new Date(); setHours(0,0,0,0)` pattern at line 149 (`checkIn`) with `getTodayInAppTz()`
- [x] 4.3 Replace the `new Date(); setHours(0,0,0,0)` pattern at line 191 (`checkOut`) with `getTodayInAppTz()`
- [x] 4.4 Replace the `new Date(); setHours(0,0,0,0)` pattern at line 222 with `getTodayInAppTz()`
- [x] 4.5 Replace the `new Date(); setHours(0,0,0,0)` pattern at line 260 with `getTodayInAppTz()`
- [x] 4.6 Add optional `tx?: Prisma.TransactionClient` parameter to `checkIn` method signature; use `tx ?? prisma` as the Prisma client inside the method body
- [x] 4.7 Add optional `tx?: Prisma.TransactionClient` parameter to `checkOut` method signature; use `tx ?? prisma` as the Prisma client inside the method body ← (verify: attendanceService compiles without errors; existing callers that omit tx still work correctly)

## 5. faceAttendanceService.ts — TZ Fix (remaining occurrences)

- [x] 5.1 Import `getTodayInAppTz` and `nowInAppTz` from `backend/src/utils/dateUtils.ts` in `backend/src/services/faceAttendanceService.ts`
- [x] 5.2 Replace the `new Date(); setHours(0,0,0,0)` pattern at line 616-617 with `getTodayInAppTz()`
- [x] 5.3 Update `getLateMinutes` (or equivalent) to use `nowInAppTz()` instead of `new Date()` for current hour/minute extraction

## 6. faceAttendanceService.ts — Transaction + Advisory Lock (Bug #1)

- [x] 6.1 Wrap the read-decide-write block in `verifyAndRecord` (lines 619-676) in a `prisma.$transaction(async (tx) => { ... })` call
- [x] 6.2 At the start of the transaction body, execute `await tx.$executeRaw\`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))\`` to acquire a per-employee advisory lock
- [x] 6.3 Pass the `tx` client to `attendanceService.checkIn(...)` and `attendanceService.checkOut(...)` calls inside the transaction
- [x] 6.4 Move the `setCooldown(employeeId)` call to inside the transaction body, before the transaction commits ← (verify: simulate two parallel calls to verifyAndRecord for the same employeeId; confirm only one CHECK_IN record is created in the DB)

## 7. faceAttendanceService.ts — Dual-Store Cooldown (Bug #3)

- [x] 7.1 Update `isCoolingDown(employeeId)`: check `recentScans` Map first; if not present, query `Employee.lastFaceScanAt` from DB using the transaction client (or default prisma); return true if within cooldown window; populate Map on DB hit
- [x] 7.2 Update `setCooldown(employeeId)`: write to `recentScans` Map AND update `Employee.lastFaceScanAt = new Date()` using the `tx` client passed from `verifyAndRecord`'s transaction ← (verify: set cooldown on a simulated "instance A" by clearing the Map and reading lastFaceScanAt from DB; confirm isCoolingDown returns true)

## 8. faceAttendanceService.ts — Embedding Cache LISTEN/NOTIFY (Bug #3)

- [x] 8.1 Reduce `CACHE_TTL_MS` constant from 300000 (5 min) to 30000 (30 s) in `faceAttendanceService.ts`
- [x] 8.2 In `invalidateEmbeddingCache()`, add a `NOTIFY face_profile_changed` call using the pg LISTEN client (import or call a shared notifier function — see task 9.2)
- [x] 8.3 Export a `resetLocalEmbeddingCache()` function (or make `invalidateEmbeddingCache` callable without NOTIFY side-effect) so the LISTEN handler in `index.ts` can reset the local cache without re-notifying ← (verify: after calling invalidateEmbeddingCache, embeddingCache is null and a NOTIFY is sent on face_profile_changed channel)

## 9. index.ts — LISTEN/NOTIFY Lifecycle

- [x] 9.1 Add `pg` package import (or confirm it is already a dependency via Prisma's peer deps); if not present, add `"pg": "x.x.x"` and `"@types/pg": "x.x.x"` to `backend/package.json`
- [x] 9.2 On backend startup in `backend/src/index.ts`, create a `pg.Client` connected to the same DATABASE_URL, call `client.query('LISTEN face_profile_changed')`, and on `notification` event call `faceAttendanceService.resetLocalEmbeddingCache()`
- [x] 9.3 On graceful shutdown in `backend/src/index.ts` (SIGTERM/SIGINT handler), call `client.query('UNLISTEN face_profile_changed')` then `client.end()` to release the connection ← (verify: startup log shows LISTEN registered; sending NOTIFY face_profile_changed from psql resets the cache on the running instance; shutdown cleanly ends the pg client)

## 10. faceAttendanceService.ts — Snapshot Owner Fix (Bug #4)

- [x] 10.1 Change line 545 from `const snapshotOwnerId = matchedCached?.employeeId ?? topK[0]?.employeeId ?? undefined` to `const snapshotOwnerId = matchedCached?.employeeId ?? undefined`
- [x] 10.2 In `saveSnapshot`, detect when `ownerId` is undefined and construct the path as `snapshots/unknown/${format(getTodayInAppTz(), 'yyyyMMdd')}/<filename>` using `date-fns` format
- [x] 10.3 Ensure the `snapshots/unknown/YYYYMMDD/` directory is created if it does not exist before writing the file ← (verify: trigger an UNRECOGNIZED scan; confirm snapshot appears under snapshots/unknown/YYYYMMDD/ and no file is written under any snapshots/<employeeId>/ folder)

## 11. Tests

- [x] 11.1 Add test case to `backend/src/__tests__/faceAttendance.test.ts`: "race condition — two parallel verifyAndRecord calls for same employee create exactly one CHECK_IN record" (mock prisma.$transaction and advisory lock; assert single DB write)
- [x] 11.2 Add test case: "getTodayInAppTz returns correct midnight UTC for Asia/Ho_Chi_Minh at a known UTC timestamp" (e.g., UTC 17:00 on day D should return midnight of day D+1 in UTC+7)
- [x] 11.3 Add test case: "isCoolingDown falls back to DB when Map is empty and lastFaceScanAt is recent" (mock Employee query returning a recent lastFaceScanAt; assert returns true)
- [x] 11.4 Add test case: "UNRECOGNIZED scan saves snapshot to unknown/YYYYMMDD folder, not to any employee folder" (mock saveSnapshot path construction; assert path starts with snapshots/unknown/) ← (verify: all 4 new test cases pass; existing test suite remains green)

## 12. Build and Verification

- [x] 12.1 Run `npm run build` inside `backend/` and confirm zero TypeScript compilation errors
- [x] 12.2 Run `npm test` inside `backend/` and confirm all tests pass including the 4 new cases ← (verify: build output is clean; test runner reports 0 failures; no regressions in existing face attendance tests)
