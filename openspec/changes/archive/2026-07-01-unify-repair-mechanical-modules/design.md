## Context

Two sibling modules in the technical vertical of ERP An Binh Foods currently sit at very different maturity levels:

- **Sửa chữa & Nghiệm thu QLHTM** (`RepairRequest` + `AcceptanceHandover` under `/technical/quality?tab=repairRequests`) was hardened by the recently archived `harden-repair-request-lifecycle` change. It now has a Prisma enum `RepairRequestStatus` (`CHO_XU_LY` / `DANG_SUA_CHUA` / `HOAN_THANH` / `DA_HUY`), a forward-only helper `advanceRepairRequestStatus`, a dedicated `RepairRequestStatusLog` audit table, and a coverage-based auto-complete branch inside `acceptanceHandoverService`. It lacks a dashboard.
- **Danh sách lỗi Cơ điện** (`FaultRecord` under `/technical/mechanical?tab=faultRecords`) is the opposite: it already renders a rich dashboard (4 stat cards with delta arrows, 4 collapsible analytical sections, heat maps), but its `trangThai` is a free-form `String` (values live in Vietnamese: "Đang theo dõi", "Đã xử lý", "Tái phát", plus stray legacy values). There is no state machine, no audit trail, and no server-side guard.

The two modules share the same domain (a repair request usually resolves one or more fault records) but do not talk to each other. Operators must manually mirror status transitions between them, which drifts.

The frontend also carries three near-duplicate implementations of colored status pills, severity pills, priority pills, collapsible sections, and stat cards across `FaultRecordList.tsx`, `RepairRequestList.tsx`, and the maintenance list. Each copy has slightly different Tailwind classes, so any UI tweak fans out into three files.

This change unifies the two lifecycles, bridges their data model, ports the dashboard, and extracts the shared UI primitives — in one coordinated migration.

## Goals / Non-Goals

**Goals:**

1. **Bridge (A)** — Give `RepairRequestItem` an optional foreign key to `FaultRecord` so a repair item can point at the fault it resolves. When the parent `RepairRequest` auto-completes, cascade every linked `FaultRecord` to `DA_XU_LY` with a status log entry.
2. **Analytics parity (B)** — Add `GET /repair-requests/stats` returning the same shape family the fault-record dashboard already renders (total, byStatus, avgCompletionHours, delta, topMachines, recurringItems, monthlyTrend, recentlyCreated). Render the dashboard on `RepairRequestList.tsx` above the existing list.
3. **Lifecycle parity (C)** — Convert `FaultRecord.trangThai` from `String` to a Prisma enum `FaultRecordStatus` (`DANG_THEO_DOI` / `DA_XU_LY` / `TAI_PHAT`). Add a forward-only helper `advanceFaultRecordStatus`, a `FaultRecordStatusLog` audit table, dedicated business-event endpoints (`POST /:id/mark-resolved`, `POST /:id/mark-recurred`, `GET /:id/status-history`), a typeahead endpoint (`GET /fault-records?trangThai=…`), and drop `trangThai` from the generic `PUT` update surface.
4. **UI primitives (D)** — Extract `StatusBadge`, `SeverityBadge`, `PriorityBadge`, `CollapsibleSection`, and `StatCard` into `frontend/src/components/shared/`. Refactor `FaultRecordList` and `RepairRequestList` to consume the shared components without visual regression.

**Non-Goals:**

- Not touching `RepairSolution.trangThai` — that is a different capability (repair-solution catalog) with its own workflow ("Đang áp dụng" / "Tạm dừng").
- Not refactoring `MachineSystem`, `Order`, `Maintenance`, or `Quotation` — they are out of scope.
- Not adding bulk actions, batch mark-resolved, or CSV export.
- Not changing the `maYeuCau` / `maNghiemThu` number formats.
- Not touching the AI service (`ai-service/agent/registry.py` untouched — no new tools added to the 66-tool count).
- Not automatically flipping an old resolved `FaultRecord` to `TAI_PHAT` when a similar new record is created within 90 days — the auto-recurrence detector only logs a `recurrence_detected` audit row and displays a UI banner. A human explicitly calls `mark-recurred` to flip the status.
- Not migrating existing free-form `trangThai` values other than the three canonical ones. Unknown legacy values collapse to `DANG_THEO_DOI` with a `legacy_migration_fallback` log row so the drift is auditable.

## Decisions

### D1 — Optional FK vs. join table for RepairRequestItem ↔ FaultRecord

**Decision:** Add `faultRecordId: String? @db.VarChar(30)` directly on `RepairRequestItem` (nullable, `onDelete: SetNull`, `onUpdate: Cascade`, indexed).

**Rationale:** A repair item resolves at most one fault record in practice, and the reverse direction (one fault → many repair items across re-scoped attempts) is naturally represented by leaving the FK non-unique. A join table would be overkill and would force a two-hop join in the cascade path.

**Alternatives considered:**
- **Join table `RepairRequestItemFaultLink`** — adds a table for cardinality that is 1-to-many at most. Rejected.
- **FK on `RepairRequest` (not the item)** — misses the granularity that a single repair request can span multiple faults across different items. Rejected.

### D2 — Cascade auto-close: inner try/catch per FaultRecord

**Decision:** Inside the same `prisma.$transaction` that transitions `RepairRequest` to `HOAN_THANH`, iterate all `RepairRequestItem.faultRecordId` non-null values. For each, wrap the sub-update in a try/catch that logs the error and continues. A single FaultRecord failure MUST NOT roll back the parent transaction.

**Rationale:** The parent transition already passed its own guards (coverage checked, actor authorized). If a linked FaultRecord is in an unexpected state (e.g., manually deleted, already at `DA_XU_LY`), we do not want to leave the repair request stuck in `DANG_SUA_CHUA` forever. Logging the error surface makes drift discoverable; blocking would create operational deadlocks.

**Alternatives considered:**
- **Abort-all-on-first-error** — safer in a strict-consistency sense but blocks completion in production for orphan data. Rejected.
- **Do the cascade after commit (out of transaction)** — decouples the two states so a mid-flight crash leaves the repair complete but the fault open. Rejected — creates ghost work.

### D3 — Auto-recurrence detection: log-only

**Decision:** When a new `FaultRecord` is created and the composite `(machineSystemDetailId, loaiLoi)` matches an existing `FaultRecord` at `DA_XU_LY` created within the last 90 days, insert a `FaultRecordStatusLog` row on the OLD record with `source = 'recurrence_detected'` and `reason = 'Phát hiện tái phát tương tự: <new maSuCo>'` — but do NOT change the old record's `trangThai`. The UI shows a banner on the new record's detail page.

**Rationale:** We don't know if the "similar" record is genuinely the same failure returning or a coincidentally similar new incident. Automatically flipping status would cause false-positive `TAI_PHAT` flags. Logging is enough for the dashboard to surface the pattern, and an operator can call `POST /:id/mark-recurred` if they confirm.

**Alternatives considered:**
- **Auto-flip old record to `TAI_PHAT`** — risk of false positives and audit noise. Rejected.
- **Prompt user to confirm** — belongs to UI, not backend. The backend logs; the UI decides how loudly to surface it.

### D4 — Migration mapping for unknown String values

**Decision:** The migration maps:
- `'Đang theo dõi'` → `DANG_THEO_DOI`
- `'Đã xử lý'` → `DA_XU_LY`
- `'Tái phát'` → `TAI_PHAT`
- Anything else (including empty, `NULL`, or legacy junk like `'Đang áp dụng'` if any exist on `FaultRecord`) → `DANG_THEO_DOI` + one row inserted into `FaultRecordStatusLog` with `source = 'legacy_migration_fallback'`, `reason = 'Migrated from unknown legacy value: <original>'`.

**Rationale:** Every existing record must land on a valid enum. Silent collapse to `DANG_THEO_DOI` is the safest default (the "just started tracking" state), and the fallback log row keeps the drift auditable so operators can review after migration.

**Alternatives considered:**
- **Fail migration on unknown values** — production could have any drift; rejecting stalls deployment. Rejected.
- **Introduce a fourth `UNKNOWN` enum value** — pollutes the enum with a permanent legacy escape hatch. Rejected.

### D5 — Stats endpoint windows

**Decision:** `GET /repair-requests/stats` defaults to `[now - 90d, now]` when `dateFrom`/`dateTo` are omitted. `delta` is computed against the immediately preceding equal-length window. `recurringItems` uses a wider 180-day trailing window (window end minus 180 days) to capture recurrence signals that would otherwise be missed. `monthlyTrend` returns 12 monthly buckets ending at the window end, oldest-first.

**Rationale:** The fault-record dashboard uses the same 90-day default; matching windows keeps the two dashboards comparable side-by-side. 12 monthly buckets is the smallest range that shows year-over-year seasonality for food manufacturing.

**Alternatives considered:**
- **Rolling 30-day window** — too short for a manufacturing plant with monthly repair cadence. Rejected.
- **Calendar year** — misleading in January (only 30 days of data). Rejected.

### D6 — Shared primitives location

**Decision:** Extract to `frontend/src/components/shared/` with a barrel `index.ts`. Import via `@/components/shared`.

**Rationale:** The codebase already has `frontend/src/components/` at the top level. `shared/` is unambiguous for "components that are not tied to any single domain module." An `ui/` folder would suggest a design-system distinction that does not exist here.

**Alternatives considered:**
- **`frontend/src/components/ui/`** — would collide with the shadcn/radix convention if we ever adopt one. Rejected pre-emptively.
- **Per-primitive folders** — over-nested for 5 files. Rejected.

### D7 — Frontend status field type change

**Decision:** Frontend types for `FaultRecord.trangThai` change from `string` to a union `'DANG_THEO_DOI' | 'DA_XU_LY' | 'TAI_PHAT'`. `FaultRecordList.tsx` renders the status via `StatusBadge` (readonly) and exposes two buttons in the row actions: "Đánh dấu đã xử lý" (available when `trangThai !== 'DA_XU_LY'`, role ADMIN/DEPT_HEAD/TEAM_LEAD) and "Đánh dấu tái phát" (available only when `trangThai === 'DA_XU_LY'`, role ADMIN/DEPT_HEAD). Neither the create form nor the edit form exposes `trangThai` — creation defaults to `DANG_THEO_DOI` on the server.

**Rationale:** Matches the same pattern already established by `RepairRequestList` (readonly badge + action buttons). Eliminates the free-form select that currently lets operators pick invalid values.

### D8 — Endpoint role gating

**Decision:**
- `POST /fault-records/:id/mark-resolved` — allowed for `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD` in the `technical` department, mechanical sub-department. Reuses `checkAccess({ allowedRoles: ['ADMIN','DEPARTMENT_HEAD','TEAM_LEAD'], checkDepartment: 'technical', checkSubDepartment: 'mechanical' })`.
- `POST /fault-records/:id/mark-recurred` — allowed for `ADMIN`, `DEPARTMENT_HEAD` only (TEAM_LEAD cannot re-open, to keep the workflow honest). Accepts optional body `{ auto: true }` — when set, the source column becomes `recurrence_detected_manual_confirm` instead of `manual`.
- `GET /fault-records/:id/status-history` — any authenticated user.
- `GET /fault-records?trangThai=DANG_THEO_DOI,TAI_PHAT&search=...` — any authenticated user, paginated (matches existing list endpoint policy).

**Rationale:** ADMIN always bypasses ABAC per the global rule. Restricting `mark-recurred` to senior roles prevents accidental churn.

## Risks / Trade-offs

- **[Migration data loss on unknown legacy values]** → Mitigation: D4 fallback log row per unknown value preserves the audit trail. A post-migration report query (`SELECT reason FROM fault_record_status_logs WHERE source = 'legacy_migration_fallback'`) surfaces drift for review.
- **[Cascade transaction size grows unbounded on large repair requests]** → Mitigation: A single RepairRequest realistically has ≤ 20 items. Even 100 linked FaultRecord updates in a transaction is well within Prisma's limits. The per-record try/catch prevents pathological blast radius.
- **[Stats aggregation queries slow on years of data]** → Mitigation: Add index on `RepairRequest.createdAt` and `RepairRequest.trangThai` (may already exist), and index `RepairRequestItem.machineSystemDetailId`. The default 90-day window bounds the row count; the 180-day recurrence scan uses a groupBy on `machineSystemDetailId` which is O(N log N).
- **[UI regression on shared primitives adoption]** → Mitigation: Snapshot the existing `FaultRecordList` colors and paddings as the reference. The new `StatusBadge` maps tone → the exact same Tailwind classes. Manual visual smoke on both lists before archiving.
- **[Race: new FaultRecord created concurrently with a cascade close]** → Mitigation: The cascade only touches records with `id IN (...linkedIds)`. A new FaultRecord created after the transaction opens has a fresh id and cannot be in that set. Prisma's default isolation is `READ COMMITTED`, sufficient here.
- **[Frontend type break for consumers still passing strings]** → Mitigation: Grep for all `trangThai` writes to `FaultRecord` in `frontend/src/`. Every write site becomes either the create-form default or a mutation call to `mark-resolved` / `mark-recurred`. TS `--noEmit` will surface any missed reference.
- **[Cascade fires but Notification queue is down]** → Mitigation: Notification sends are already wrapped in try/catch per the existing convention. A notification failure does not fail the transaction. This risk is inherited, not new.

## Migration Plan

Two sequential Prisma migrations to keep the change reviewable:

**Migration 1 — `link_fault_record_to_repair_request_item`** (additive, non-destructive):
1. `ALTER TABLE common."RepairRequestItem" ADD COLUMN "faultRecordId" VARCHAR(30) NULL;`
2. `CREATE INDEX "RepairRequestItem_faultRecordId_idx" ON common."RepairRequestItem"("faultRecordId");`
3. Add FK: `ALTER TABLE common."RepairRequestItem" ADD CONSTRAINT "RepairRequestItem_faultRecordId_fkey" FOREIGN KEY ("faultRecordId") REFERENCES common."FaultRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;`

Rollback: drop the FK, drop the index, drop the column. No data loss because existing rows have `NULL`.

**Migration 2 — `enum_fault_record_status`**:
1. `CREATE TYPE common."FaultRecordStatus" AS ENUM ('DANG_THEO_DOI', 'DA_XU_LY', 'TAI_PHAT');`
2. `CREATE TABLE common."FaultRecordStatusLog" (id VARCHAR(30) PRIMARY KEY, faultRecordId VARCHAR(30) NOT NULL REFERENCES common."FaultRecord"(id) ON DELETE CASCADE, oldStatus common."FaultRecordStatus" NULL, newStatus common."FaultRecordStatus" NOT NULL, actorId VARCHAR(30) NULL, reason TEXT NULL, source VARCHAR(64) NOT NULL DEFAULT 'manual', createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW());`
3. Add column temp: `ALTER TABLE common."FaultRecord" ADD COLUMN "trangThai_new" common."FaultRecordStatus" NOT NULL DEFAULT 'DANG_THEO_DOI';`
4. Data migration:
   ```sql
   UPDATE common."FaultRecord" SET "trangThai_new" = CASE
     WHEN "trangThai" = 'Đang theo dõi' THEN 'DANG_THEO_DOI'::common."FaultRecordStatus"
     WHEN "trangThai" = 'Đã xử lý'      THEN 'DA_XU_LY'::common."FaultRecordStatus"
     WHEN "trangThai" = 'Tái phát'       THEN 'TAI_PHAT'::common."FaultRecordStatus"
     ELSE 'DANG_THEO_DOI'::common."FaultRecordStatus"
   END;
   ```
5. Insert legacy fallback log rows for rows whose original `trangThai` was not one of the three canonical values (single-shot INSERT … SELECT).
6. Drop old column, rename new column: `ALTER TABLE common."FaultRecord" DROP COLUMN "trangThai"; ALTER TABLE common."FaultRecord" RENAME COLUMN "trangThai_new" TO "trangThai";`
7. Create index on `FaultRecordStatusLog(faultRecordId, createdAt DESC)` for history queries.

Rollback (best-effort — data loss on unknown legacy values is irreversible):
1. Add back `trangThai` as `VARCHAR(50)`.
2. Reverse-map enum → String literals.
3. Drop the enum type after dropping the column.
4. Drop `FaultRecordStatusLog` table.

**Deployment order:**
1. Deploy Migration 1 (safe — additive column).
2. Deploy backend build with `advanceFaultRecordStatus`, new endpoints, cascade wired but feature-flag off. (Actually no feature flag — the cascade is enabled the moment migration 1 is live because the FK exists but is null for all rows.)
3. Deploy Migration 2 in the same maintenance window as the backend build that expects the enum type.
4. Deploy frontend with typed enum and shared primitives.
5. Post-deploy verification: run the fallback-log query, confirm no unexpected drift.

## Open Questions

None — all decisions above are locked. If a decision needs revisiting during implementation (e.g., a Prisma index name collision), the implementer should update this design.md in the same PR as the code change.
