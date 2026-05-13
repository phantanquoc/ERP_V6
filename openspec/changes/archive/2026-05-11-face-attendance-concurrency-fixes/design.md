## Context

The face attendance feature spans three services: a React kiosk frontend, an Express/Prisma backend, and a FastAPI AI service. The backend's `faceAttendanceService.ts` is the central orchestrator — it calls the AI service for face recognition, queries attendance history, decides CHECK_IN vs CHECK_OUT, and persists records via `attendanceService.ts`. Four bugs were identified through a targeted audit. All fixes are confined to the backend service layer and its Prisma schema. No frontend or AI service changes are required.

Current state of affected code:
- `verifyAndRecord` (lines 619-676) performs a read-decide-write sequence with no transaction or lock.
- `today` is computed as `new Date(); setHours(0,0,0,0)` in 6 places, using the Node process timezone.
- `recentScans` (line 34) and `embeddingCache` (line 23) are module-level in-memory state.
- `snapshotOwnerId` (line 545) falls back to `topK[0]?.employeeId` when recognition returns UNRECOGNIZED.

## Goals / Non-Goals

**Goals:**
- Prevent duplicate CHECK_IN/CHECK_OUT records from concurrent kiosk scans of the same employee.
- Ensure attendance date queries use the configured application timezone, not the process/system timezone.
- Reduce embedding cache staleness from 5 minutes to 30 seconds and propagate invalidation across backend instances via Postgres LISTEN/NOTIFY.
- Prevent unrecognized face snapshots from being stored under a matched employee's folder.

**Non-Goals:**
- Eliminating the residual cross-instance cooldown window (user accepted this tradeoff — no Redis).
- Fixing gallery FIFO eviction, adaptive enrollment, or `gallery.length` vs `filteredGallery` mismatch.
- Any changes to the frontend (FaceKioskPage, FaceAdminPage) or AI service (`ai-service/main.py`).
- Introducing Redis or any new infrastructure dependency.

## Decisions

### Decision 1: Advisory lock + Prisma transaction for Bug #1

**Chosen approach**: Wrap the read-decide-write block in `verifyAndRecord` in a Prisma `$transaction`. At the start of the transaction, acquire a session-level advisory lock keyed on a hash of `employeeId`:

```sql
SELECT pg_advisory_xact_lock(hashtext($employeeId));
```

This serializes concurrent verifications for the same employee at the database level. The lock is automatically released when the transaction commits or rolls back — no explicit unlock needed.

`attendanceService.checkIn` and `checkOut` gain an optional `tx?: Prisma.TransactionClient` parameter. When called from within `verifyAndRecord`'s transaction, they use the provided client. When called standalone (existing callers), they use the default Prisma client. Cooldown is set inside the transaction before commit so it is always consistent with the written record.

**Why advisory lock over unique constraint**: The `Attendance` table intentionally allows multiple rows per `(employeeId, attendanceDate)` for shift 2 and overtime (`isOvertime` flag). A unique constraint would break legitimate multi-record days. The advisory lock serializes the decision logic without constraining the schema.

**Why advisory lock over application-level mutex**: Application mutexes are in-process only and fail under horizontal scaling. The advisory lock lives in Postgres and is visible to all backend instances.

### Decision 2: `date-fns-tz` + `APP_TIMEZONE` env for Bug #2

**Chosen approach**: Add `APP_TIMEZONE` to `backend/src/config/env.ts` with default `Asia/Ho_Chi_Minh`. Add `date-fns-tz` as a backend dependency. Create `backend/src/utils/dateUtils.ts` exporting:

```typescript
// Returns a Date representing midnight of today in APP_TIMEZONE,
// expressed as a UTC Date (suitable for Prisma gte/lt queries).
export function getTodayInAppTz(): Date

// Returns the current hour and minute in APP_TIMEZONE.
export function nowInAppTz(): { hour: number; minute: number }
```

`getTodayInAppTz` uses `date-fns-tz`'s `toZonedTime` / `fromZonedTime` to compute the correct UTC-equivalent of midnight in the configured timezone. All 6 occurrences of `new Date(); setHours(0,0,0,0)` are replaced with `getTodayInAppTz()`. `getLateMinutes` uses `nowInAppTz()` instead of `new Date()`.

**Why `date-fns-tz` over `luxon` or `moment-timezone`**: `date-fns-tz` is a lightweight peer of `date-fns` (likely already in the project), has no global state, and is tree-shakeable. `moment-timezone` is deprecated. `luxon` is heavier and would be a new paradigm.

### Decision 3: Dual-store cooldown + LISTEN/NOTIFY for Bug #3

**Cooldown dual-store pattern**:
- `recentScans: Map<string, number>` remains as a fast-path in-memory cache (avoids a DB round-trip on the hot path).
- A new nullable column `lastFaceScanAt DateTime?` is added to the `Employee` model via Prisma migration. This is the authoritative cross-instance source of truth.
- `isCoolingDown(employeeId)`: checks Map first; if not present, queries `Employee.lastFaceScanAt` from DB and evaluates against the cooldown window. Populates the Map on DB hit.
- `setCooldown(employeeId)`: writes both the Map entry and `Employee.lastFaceScanAt` (inside the transaction from Decision 1).

**Embedding cache LISTEN/NOTIFY**:
- Reduce `CACHE_TTL_MS` from 5 minutes (300,000 ms) to 30 seconds (30,000 ms).
- Add a Postgres LISTEN/NOTIFY channel named `face_profile_changed`.
- `invalidateEmbeddingCache()` calls `NOTIFY face_profile_changed` in addition to clearing the local cache.
- On backend startup (`backend/src/index.ts`), a `pg` client (separate from Prisma, since Prisma does not expose raw LISTEN) subscribes to `face_profile_changed`. On notification, it calls `faceAttendanceService.invalidateEmbeddingCache()`.
- On graceful shutdown, the `pg` client is unlistened and ended.

**Why keep in-memory Map**: The Map avoids a DB query on every scan for the common case (same instance, within cooldown window). The DB column handles the cross-instance case. The residual window (two instances, same employee, within one cooldown period, hitting different instances before either Map is populated) is accepted as a known tradeoff.

**Why not Redis**: User explicitly ruled it out to avoid new infrastructure. The LISTEN/NOTIFY approach uses the existing Postgres connection and is sufficient for the cache invalidation use case.

### Decision 4: Drop `topK` fallback in `snapshotOwnerId` for Bug #4

**Chosen approach**: Change line 545 from:
```typescript
const snapshotOwnerId = matchedCached?.employeeId ?? topK[0]?.employeeId ?? undefined;
```
to:
```typescript
const snapshotOwnerId = matchedCached?.employeeId ?? undefined;
```

Modify `saveSnapshot` to detect when `ownerId` is undefined and write to `snapshots/unknown/YYYYMMDD/<filename>` instead of `snapshots/<employeeId>/<filename>`. The `YYYYMMDD` subfolder uses the application timezone date (via `getTodayInAppTz()`) to avoid a flat directory with unbounded growth.

## Risks / Trade-offs

- **Residual cross-instance cooldown window** → Accepted by user. Two kiosks hitting different backend instances within the cooldown period can both pass the Map check before either instance writes `lastFaceScanAt`. The DB check on the second scan will catch it if the first write has committed, but there is a small window. Mitigation: the advisory lock (Decision 1) prevents duplicate DB records even if cooldown is bypassed.

- **`pg` client for LISTEN alongside Prisma** → Two Postgres connections per instance. The `pg` client is long-lived and dedicated to LISTEN only; it does not execute queries. Connection count impact is minimal. Mitigation: ensure the `pg` client is properly ended on shutdown to avoid connection leaks.

- **`date-fns-tz` version compatibility** → Pin to a specific version in `package.json` to avoid breaking changes. Verify compatibility with the existing `date-fns` version if present.

- **Advisory lock contention** → `pg_advisory_xact_lock` serializes all concurrent verifications for the same employee. For a single employee, this is the desired behavior. For different employees, locks are independent (different hash values). No cross-employee contention.

- **`lastFaceScanAt` migration on live DB** → Adding a nullable column is a non-destructive migration. Existing rows get `NULL`, which `isCoolingDown` treats as "not cooling down" — correct behavior.

## Migration Plan

1. Run `npx prisma migrate dev --name add-employee-last-face-scan-at` to generate and apply the migration adding `lastFaceScanAt DateTime?` to `Employee`.
2. Deploy backend with new env var `APP_TIMEZONE=Asia/Ho_Chi_Minh` (or leave unset to use default).
3. No data backfill needed — `NULL` in `lastFaceScanAt` is a valid initial state.
4. Rollback: remove the column via a new migration; revert code changes. The column is nullable so rollback does not require data migration.

## Open Questions

None. All design decisions were provided by the user in the change brief.
