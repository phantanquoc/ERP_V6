## Context

Phase 1 stabilized the four pricing entities (QuotationRequest, Quotation, Order, ExportCost). Phase 2 extends them with workflow state and audit infrastructure without touching the JSON column refactor that Phase 3 owns. Two pieces of project context shape this design:

1. **CLAUDE.md / AGENTS.md invariants**: child tables, not JSON columns; forward-only status helpers; notifications wrapped in try/catch; multi-schema Prisma (`auth`, `business`, `common`); typed errors from `@utils/errors`; envelope `{ success, message?, data?, pagination? }`; Vietnamese user-facing strings.
2. **Phase 1 artifacts in production**: `backend/src/utils/statusTransitions.ts` (extendable), `@utils/errors`, existing notification service, the `Quotation`/`Order`/`ExportCost`/`QuotationRequest` Prisma models, and the four React management components wired through TanStack Query hooks.

Stakeholders: pricing department staff (creators), team leads (reviewers), department heads (approvers/auditors), admins (override + audit). Data volume target: 100-500 records per entity, so denormalized JSON snapshots for revisions/audit are acceptable in cost terms.

## Goals / Non-Goals

**Goals:**
- Give every pricing entity a complete audit trail (who, when, before, after) without coupling business writes to audit success.
- Make quotation editing reversible by snapshotting the full quotation state on every update.
- Make price commitments durable: once a quote is sent to the customer, prices are locked unless explicitly overridden by ADMIN.
- Give YCBG list a status field so processors and reviewers can filter and prioritize.
- Surface stale quotations through a `daysOpen` derived metric and a dedicated aging-warnings endpoint.
- Trigger notifications on the events that matter (new RFQ, quote won, quote lost, order delivered, ADMIN unlock) without blocking the main flow.
- Reuse Phase 1's forward-only helper pattern for the new YCBG status.

**Non-Goals:**
- No teardown of `flowchartData` / `generalCostGroupsData` JSON columns (Phase 3).
- No `ExportCostCategory` enum, no incoterm/HS Code/COO fields (Phase 3).
- No cost sheet view or margin analysis (Phase 3).
- No `/pricing/stats` endpoint, no KPI dashboard, no win/loss reason, no bulk actions, no file attachment (Phase 4).
- No component splits (Phase 4).
- No pretty diff viewer for revisions — Phase 2 renders JSON snapshot in `<pre>`; pretty diff is Phase 4.
- No multi-level approval workflow.
- No cron scheduler for aging push-notifications — Phase 4 if scheduler infra is not yet present.

## Decisions

### D1. Extend `statusTransitions.ts` with QuotationRequest helpers (do not split modules)

Phase 1 established a single helper module. Phase 2 adds `QUOTATION_REQUEST_STATUS_ORDER = ['CHO_XU_LY', 'DANG_BAO_GIA', 'DA_BAO_GIA']`, `QUOTATION_REQUEST_TERMINAL_STATUSES = { DA_BAO_GIA, HUY }`, `QUOTATION_REQUEST_CANCEL_TARGETS = { HUY }`, and `advanceQuotationRequestStatus(current, next, opts?: { bypass?: boolean })` with the same shape as the quotation helper.

Allowed transitions:
- No-op (current === next).
- Single-step forward along the order array.
- `HUY` from any non-terminal state.
- Anything else throws `ValidationError('Không thể chuyển trạng thái YCBG từ X sang Y')`.
- `opts.bypass === true` (ADMIN) returns `next` unchanged.

Rationale: cohesion with Phase 1; one place to audit. Alternatives considered: separate `quotationRequestStatusTransitions.ts` — rejected because the existing module is small and the patterns are identical.

### D2. `QuotationRevision` snapshots are JSON; this is an explicit exception

Project rule: child tables, not JSON columns. Exception granted here because revision snapshots are **immutable** audit data; they never serve as the source of truth for queries against current state, and they will never be selectively mutated. The revision row is a write-once historical record, conceptually equivalent to a serialized event payload.

Schema:
```prisma
model QuotationRevision {
  id             String   @id @default(cuid())
  quotationId    String
  revisionNumber Int
  snapshot       Json
  createdBy      String
  createdAt      DateTime @default(now())
  note           String?

  quotation Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)

  @@unique([quotationId, revisionNumber])
  @@index([quotationId])
  @@schema("business")
}
```

Snapshot content: full `Quotation` row plus all `QuotationItem` rows (the same shape returned by `quotationService.getById`). Computed in TS before serialization, not a Prisma raw JSON cast.

Revision creation flow (`quotationService.update`):
1. Open `$transaction`.
2. Fetch current quotation + items.
3. `MAX(revisionNumber) + 1` for this quotation (default 1).
4. `prisma.quotationRevision.create({ data: { quotationId, revisionNumber, snapshot: currentState, createdBy: actorId, note } })`.
5. Apply update (and the existing items delete-then-recreate flow).
6. Commit.

If snapshot creation fails, the whole transaction rolls back — unlike audit and notifications, this one IS load-bearing (we lose history otherwise). Alternative: snapshot table with normalized columns mirroring `QuotationItem` — rejected: would force schema migration on every quotation shape change, defeats the audit purpose. Alternative: separate child table `QuotationRevisionItem` — rejected for the same reason; the cost-per-revision (~1 row + JSON) at 100-500 records is trivial.

### D3. Price lock: enforced at the service layer, derived from status transition

Fields on `Quotation`: `priceLocked Boolean @default(false)`, `priceLockedAt DateTime?`, `priceLockedBy String?`. (Not adding `priceLockReason` — the status transition that triggered it is implicit context.)

Auto-lock rule: when `advanceQuotationStatus` accepts a transition into `DANG_CHO_PHAN_HOI`, the same service writes `priceLocked: true`, `priceLockedAt: now`, `priceLockedBy: actorUserId`. No separate event/listener — the lock is part of the same Prisma write inside the transaction.

Price field set (rejected on update when locked unless `forceUnlock` is true): `donGia`, `soLuong`, `thanhTien`, `vat`, `totalAmount`, plus any field inside the `items[]` array that is `donGia`, `soLuong`, or `thanhTien`. Non-price fields (e.g., `tenKhachHang`, `ghiChu`, `tinhTrang`) remain editable when locked.

ADMIN override: payload may include `forceUnlock: true`. Service checks `actorRole === 'ADMIN'` AND `forceUnlock === true`, sets `priceLocked: false`, `priceLockedAt: null`, `priceLockedBy: null`, performs the price edit, and records an audit entry with `action: 'PRICE_UNLOCK'`. Non-ADMIN sending `forceUnlock` is ignored (and the edit is still rejected). This is intentional — the field is not a "request unlock" signal.

Rejection error: `ValidationError('Báo giá đã khóa giá, không thể sửa giá. Hãy tạo phiên bản mới hoặc liên hệ ADMIN để mở khóa.')`.

Alternative considered: track `lockedFields` per field. Rejected as overkill for current scope; if Phase 4 demands per-field policy we revisit.

### D4. AuditLog: best-effort writes via `@utils/auditLog`

Schema:
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  entityType String
  entityId   String
  action     String
  actorId    String
  actorRole  String
  before     Json?
  after      Json?
  note       String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
  @@schema("common")
}
```

`entityType` is a string (not enum) — keeps the table generic for future entities without migrations. We document the valid values in code as a TS union type: `'QuotationRequest' | 'Quotation' | 'Order' | 'ExportCost'`. Same for `action`: `'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'PRICE_UNLOCK'`.

Helper API (`backend/src/utils/auditLog.ts`):
```ts
export async function recordAudit(params: {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId: string;
  actorRole: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}): Promise<void>;
```

Implementation wraps the Prisma write in `try { … } catch (err) { logger.error(...) }`. **Audit failure must never bubble** — the project notification pattern (CLAUDE.md). Callers do NOT await inside a transaction either; `recordAudit` is fire-and-forget after the primary write commits.

Call sites:
- `quotationRequestService.create / update / delete` and the status-transition path.
- `quotationService.create / update / delete`, status-change path, price-unlock path.
- `orderService.create / update / delete` and status-change path.
- `exportCostService.create / update / delete`.

`STATUS_CHANGE` is recorded as a separate entry when only the status changed, with `before: { status: oldValue }`, `after: { status: newValue }`. Mixed changes (status + other fields) record as `UPDATE` with full before/after.

Read endpoint: `GET /api/audit-logs?entityType=Quotation&entityId=…&action=…&actorId=…&page=&limit=` — paginated, RBAC `ADMIN | DEPARTMENT_HEAD`. Standard envelope.

Alternative considered: writing audit synchronously inside the transaction so primary + audit succeed/fail together. Rejected because audit failure (e.g., schema/index issue) would block legit pricing operations — wrong trade-off for an audit-only side effect.

### D5. Notification triggers: fire-and-forget after primary write

All triggers live in their respective services, fire after the primary write commits, and are wrapped in `try { await notificationService.create(...) } catch (err) { logger.warn(...) }`. They never block return. They never run inside the primary transaction.

Trigger matrix:

| Event | Recipients | Vietnamese template |
|---|---|---|
| QuotationRequest CREATE | All `DEPARTMENT_HEAD` + `TEAM_LEAD` in creator's department | "Có YCBG mới: {tenKhachHang} từ {nguoiTao}" |
| Quotation status → DA_DAT_HANG | Quotation creator | "Báo giá {soBaoGia} đã được khách hàng đặt hàng" |
| Quotation status → KHONG_DAT_HANG | Creator + all DEPARTMENT_HEAD in creator's department | "Báo giá {soBaoGia} không đạt đơn hàng" |
| Order status → DA_GIAO_CHO_KHACH_HANG | Order creator | "Đơn hàng {soDonHang} đã giao thành công" |
| Price unlock by ADMIN | Quotation creator + all DEPARTMENT_HEAD in creator's department | "ADMIN {tenAdmin} đã mở khóa giá báo giá {soBaoGia}" |

Recipient resolution: query `User` table by role + departmentId. Cache nothing — at 100-500 records and a handful of department heads per department, the per-event query is cheap.

Notification payload `{ type, title, body, linkTo, recipientId }` follows the existing `notificationService` contract. `linkTo` deep-links into the relevant pricing detail page.

### D6. Quote aging: derived, not stored

`daysOpen` is computed as `Math.floor((now - createdAt) / msPerDay)` in TypeScript after the Prisma query. Added to the list response only for non-terminal quotations (`tinhTrang ∉ { DA_DAT_HANG, KHONG_DAT_HANG, EXPIRED, REJECTED }`); omitted otherwise to avoid noise.

`GET /api/quotations/aging-warnings?threshold=N` is a separate, slimmer endpoint that returns just the rows where `daysOpen >= threshold` and status is non-terminal, plus the count grouped by warning band (yellow 7-13, red ≥14). Threshold whitelist: integer 1-90, default 7 — anything else falls back to default. RBAC: `ADMIN | DEPARTMENT_HEAD`. Returns standard envelope.

Implementation note: derive `daysOpen` after Prisma returns; do not push aging filtering into Prisma `where` since `createdAt + interval` predicates differ across databases. Sort the aging-warnings result by `daysOpen DESC` server-side.

Frontend badge bands: `daysOpen < 7` no badge; `7 ≤ daysOpen < 14` yellow `Tailwind bg-yellow-100 text-yellow-800`; `daysOpen ≥ 14` red `bg-red-100 text-red-800`. Render label as `"X ngày"`.

Cron-scheduled push notifications are deferred to Phase 4 because scheduler infra is not yet confirmed to be in place. The aging endpoint and badge ship in Phase 2.

### D7. Migration plan

Four migrations, applied in order:
1. `add_quotation_request_status` — enum + nullable column then backfill to `CHO_XU_LY`, then NOT NULL with default `CHO_XU_LY`. (Two-step migration if Prisma forces it; otherwise single migration with `@default(CHO_XU_LY)`.)
2. `add_quotation_revision` — new table + indexes.
3. `add_quotation_price_lock` — three nullable columns + boolean default false.
4. `add_audit_log` — new table + indexes.

All run via `npx prisma migrate dev --name <name>`. **Never `db push`.** Rollback strategy: each migration's `down` would drop the new artifact; revision and audit-log tables hold immutable data and would lose history on rollback (accepted — these are new tables, no production data lost). Price-lock columns dropped on rollback unlock everything (acceptable for a Phase 2 rollback window).

### D8. Frontend hook layout

New hooks under `frontend/src/hooks/`:
- `useQuotationRevisions.ts` — list + detail. Query key factory: `{ all, lists, list({ quotationId, page, limit }), detail(quotationId, revisionId) }`.
- `useAuditLogs.ts` — list. Query key factory: `{ all, lists, list({ entityType, entityId, action?, actorId?, page, limit }) }`.
- `useQuotationAgingWarnings.ts` — list. Query key factory: `{ all, lists, list({ threshold }) }`.

New service modules under `frontend/src/services/`:
- `quotationRevisionService.ts`
- `auditLogService.ts`

Components call hooks; no direct `apiClient` calls. Mutation hooks invalidate the relevant `lists()` key.

## Risks / Trade-offs

- **JSON snapshot drift** → snapshots may reference renamed quotation fields. **Mitigation**: snapshots are read-only display; rendered in `<pre>` so renames don't break the UI. Phase 4 pretty diff will tolerate missing fields by design.
- **Notification storm** → status change loops could spam recipients. **Mitigation**: notifications only fire on the specific listed transitions, not on every status change. Forward-only helpers reject loops anyway.
- **Audit log size** → at 500 records × frequent updates × full before/after JSON the table can grow fast. **Mitigation**: indexes on `(entityType, entityId)` and `createdAt` keep reads sharded; Phase 4 will add retention/archival if growth becomes operational.
- **Price-lock bypass via direct DB** → if someone updates `priceLocked = false` via SQL the service guard is sidestepped. **Mitigation**: out of scope for application-layer security; ADMIN already has DB access in practice. Audit log still records nothing in that case — accepted gap.
- **`daysOpen` recomputed on every list query** → trivial CPU cost at scale 100-500. **Mitigation**: none needed; revisit if dataset grows beyond Phase 4 scope.
- **`actorId` plumbing complexity** → controllers must thread `req.user.id` and `req.user.role` into every service write. **Mitigation**: extend Phase 1 plumbing (which already does `actorRole`) to also pass `actorId`. Type the service signature explicitly so a missing actor blocks compile.
- **`forceUnlock` payload field collision** → a non-ADMIN client sending `forceUnlock` could be confused by silent ignore. **Mitigation**: when a non-ADMIN sends `forceUnlock: true` against a locked quote with price edits, the error is still the standard locked-quote `ValidationError`, with a Vietnamese hint mentioning ADMIN. Frontend doesn't expose the field except for ADMIN.

## Migration Plan

Phase 2 ships in 4 commit batches matching the 4 migrations, each with passing `npx tsc --noEmit`, `npm run lint`, and `npm test`:

1. Migration `add_quotation_request_status` + helper extension + service changes + frontend filter+badge.
2. Migration `add_quotation_revision` + service snapshot logic + revision endpoints + frontend tab.
3. Migration `add_quotation_price_lock` + lock semantics + ADMIN unlock flow + frontend badge/disable/unlock UI.
4. Migration `add_audit_log` + helper + service call sites + notifications + audit endpoint + aging endpoint + frontend tab + aging badge.

Final commit: end-to-end smoke + tasks.md `## 10` verification gates.

## Open Questions

- Does the existing `notificationService.create` API accept a `linkTo` field, or do we need to extend it? (To be confirmed during implementation; if not, add `linkTo` field or use existing `data` JSON payload.)
- Does the User model expose a `departmentId` for resolving recipients? (Confirmed in Phase 1 RBAC work, but verify during apply.)
- Is there an existing `logger` utility (`@utils/logger`) the helper should use, or should it fall back to `console.warn`? (Verify during apply; default to whichever is the project standard.)
