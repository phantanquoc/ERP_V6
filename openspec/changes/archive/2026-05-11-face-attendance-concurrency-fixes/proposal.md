## Why

The face attendance feature contains four concrete bugs that cause data integrity failures in production: duplicate attendance records from concurrent kiosk scans, wrong-day attendance queries in UTC-offset deployments, in-memory state that breaks under horizontal scaling, and misattributed snapshots that corrupt admin audit trails. These bugs surface under normal multi-kiosk usage and must be fixed before the feature is considered production-safe.

## What Changes

- **Bug #1 — Race condition double CHECK_IN/CHECK_OUT** (`backend/src/services/faceAttendanceService.ts:619-676`, `backend/src/services/attendanceService.ts:148,190`): The read-decide-write block in `verifyAndRecord` has no transaction or row lock. Two kiosks verifying the same employee within one round-trip can both read "no attendance today" and both insert CHECK_IN records. Fix: wrap the block in a Prisma `$transaction` with a `pg_advisory_xact_lock` keyed on `employeeId`. `attendanceService.checkIn` and `checkOut` gain an optional `tx` parameter so they execute inside the caller's transaction.

- **Bug #2 — Timezone bug in `today` calculation** (`faceAttendanceService.ts:616-617`, `attendanceService.ts:149,191,222,260`): `new Date(); setHours(0,0,0,0)` uses the Node process timezone. Docker production defaults to UTC, so at 00:30 Vietnam time (UTC+7) the query targets yesterday's date and employees see "not checked in" — triggering double punches. Fix: introduce `APP_TIMEZONE` env (default `Asia/Ho_Chi_Minh`), add `date-fns-tz`, and create `backend/src/utils/dateUtils.ts` with `getTodayInAppTz()` and `nowInAppTz()`. Replace all 6 occurrences of the broken pattern.

- **Bug #3 — In-memory cooldown and embedding cache block horizontal scale** (`faceAttendanceService.ts:23,34`): `recentScans: Map<string, number>` and `embeddingCache: CachedProfile[] | null` are process-local. Two backend instances behind a load balancer share no state, so cooldown can be bypassed and embedding caches can drift up to 5 minutes after profile changes. Fix: persist `lastFaceScanAt DateTime?` on `Employee` as the authoritative cooldown source (Map is a fast-path cache). Reduce embedding cache TTL from 5 minutes to 30 seconds. Add Postgres LISTEN/NOTIFY on channel `face_profile_changed` so any instance calling `invalidateEmbeddingCache()` broadcasts to all peers. No Redis introduced (user-accepted scope tradeoff: a small cross-instance cooldown window remains possible).

- **Bug #4 — `snapshotOwnerId` falls back to top-1 candidate on no-match** (`faceAttendanceService.ts:545`): When recognition returns UNRECOGNIZED, the snapshot is saved under the top-scoring candidate's employee folder. Admins browsing `snapshots/<employeeId>/` see strangers' faces and may audit incorrectly. Fix: drop the `topK[0]?.employeeId` fallback so unrecognized snapshots go to `snapshots/unknown/YYYYMMDD/` instead.

## Capabilities

### New Capabilities

- `face-attendance`: Covers the behavioral contract of the face attendance feature — recognition flow, attendance recording rules (CHECK_IN/CHECK_OUT sequencing, cooldown, duplicate prevention), snapshot storage conventions, and timezone handling.

### Modified Capabilities

<!-- No pre-existing capability specs exist; all behavioral contracts are being established fresh via the new face-attendance spec. -->

## Impact

- **Files modified**: `backend/src/services/faceAttendanceService.ts`, `backend/src/services/attendanceService.ts`, `backend/src/index.ts`, `backend/src/config/env.ts`
- **Files created**: `backend/src/utils/dateUtils.ts`
- **Schema change**: Prisma migration adding nullable `lastFaceScanAt DateTime?` column to `Employee` model
- **New dependency**: `date-fns-tz` added to `backend/package.json`
- **Tests updated**: `backend/src/__tests__/faceAttendance.test.ts` — new cases for race condition, TZ-aware today, dual-store cooldown, unknown-folder snapshot
- **No frontend changes**, **no AI service changes**, **no Redis introduced**
