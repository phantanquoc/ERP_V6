## Context

The ERP_V6 Employee Evaluation module runs a monthly self → supervisor1 → supervisor2 workflow with weighted scoring over `PositionResponsibility` items. Status is forward-only (`SELF_PENDING → SUPERVISOR1_PENDING → SUPERVISOR2_PENDING → COMPLETED → ACKNOWLEDGED`). The payroll linkage computes `kpiDeduction = kpiBonus × (100 − supervisorScore2%) / 100`.

Discovery (see conversation history) identified 14 gaps in three severity tiers plus three cultural/legal amendments from external research (BS1 anti-anchoring, BS2 payroll transparency, BS3 rating-inflation alert). The user has locked scope, decisions D1-D5, monthly cycle retention, and payroll-formula immutability. This design turns those decisions into an implementation plan spanning schema, services, HTTP surface, cron infrastructure, and frontend.

Constraints inherited from `AGENTS.md` and `CLAUDE.md`:
- Prisma multi-schema (`common`, `business`, `auth`) — every new model MUST declare `@@schema("common")`.
- CUID IDs, child tables (not JSON arrays) for related lists.
- `prisma migrate dev` — no `db push`.
- Status is forward-only, transitions server-side only, no generic `PATCH /status` endpoint.
- Parent + children in a single `prisma.$transaction`.
- Notifications wrapped in `try/catch` — never bubble failure to the caller.
- Route → Controller → Service → Prisma. Controllers must never call Prisma.
- Path aliases `@config/@controllers/@routes/@middlewares/@services/@utils/@types/@schemas`.
- API response shape: `{ success, message?, data?, pagination? }`.
- Errors from `@utils/errors` (`NotFoundError`, `ValidationError`, `ConflictError`).
- Frontend uses TanStack Query with a structured query-key factory, `react-hook-form` + `zod` for forms.
- Vietnamese user-facing text, English code identifiers. Dates: `YYYY-MM-DD` API, `DD/MM/YYYY` UI.

Stakeholders: Employees (self-evaluation), TEAM_LEAD (supervisor1), DEPARTMENT_HEAD (supervisor2 / calibration reviewer), ADMIN (all actions), HR/BOD (calibration reports). Vietnam Labor Code 2019 Article 36.1(a) requires an evidence trail for performance-based termination.

## Goals / Non-Goals

**Goals:**
- Split the monthly workflow into a `Quick` mode (production workers — 3-5 core criteria, 1 comment, copy-previous-month baseline) and a `Full` mode (office/management — goals, IDP, evidence, per-detail comments) driven by `Position.category`, without changing the underlying status machine.
- Guarantee scoring correctness by hard-blocking `sum(weight) ≠ 100` at write time and rescaling legacy data during migration.
- Support `N/A` criteria (excluded from weighted average) so partial-period employees and irrelevant criteria don't distort scores.
- Give every actor a first-class narrative surface (per-role comments, appeal window, per-detail comments) satisfying Vietnam Labor Code 2019 evidence needs and modern feedback quality standards.
- Prevent anchoring bias by masking self-score / prior-supervisor score from a supervisor until they save their first line in the current period.
- Show every employee a transparent payroll-impact preview (`kpiBonus`, current sup2 score, projected deduction, projected net) computed server-side using the existing payroll formula — read-only, no formula change.
- Give HR/BOD a calibration dashboard (supervisor × score heatmap, 12-period trend, automatic rating-inflation alert) without adding any calibration workflow gate.
- Persist an immutable audit log for every score, comment, status, and appeal change.
- Introduce optional peer feedback for `TEAM_LEAD+` with anonymous aggregation and a hard privacy contract.
- Automate reminders (7-day, 3-day) and detail-sync so administrators don't need to click "Sync details" manually.
- Ship PDF export per evaluation for archival and legal use.

**Non-Goals:**
- Do not change the `kpiDeduction` formula in `payrollService.ts`.
- Do not change the evaluation cycle from monthly.
- Do not introduce a Skill Matrix / cross-training module in this change (BS4, deferred).
- Do not add a new LLM provider.
- Do not change the RBAC hierarchy (`ADMIN > DEPARTMENT_HEAD > TEAM_LEAD > EMPLOYEE`).
- Do not add a calibration workflow gate — data is presented, decisions stay offline.
- Do not reopen the workflow after `ACKNOWLEDGED` even if an appeal is filed.
- Do not expose peer identities per response — only aggregated results after all invited peers submit.

## Decisions

### D1. `Position.category` drives hybrid mode

**Decision:** Add enum `PositionCategory { PRODUCTION, OFFICE, MANAGEMENT }` as a column on `Position` (default `OFFICE`). At `Evaluation` creation time (either single or bulk), copy `Position.category` into a new `Evaluation.mode` field (`QUICK` for `PRODUCTION`, `FULL` for `OFFICE` and `MANAGEMENT`). All downstream logic (which criteria required, which UI tabs, whether goals/IDP/evidence are enforced) reads `Evaluation.mode`, not `Position.category` — so mid-period category changes on a Position never retroactively invalidate an existing evaluation.

**Backfill:** the migration inspects existing `Position.code` values seeded in `backend/prisma/seed.ts` (`POS_008` "Kỹ sư sản xuất", `POS_003` "Nhân viên sản xuất", QC positions, "Nhân viên kho", "Quản lý kho" → `PRODUCTION`; office roles like `POS_017` marketing, `POS_018/019` accounting, `POS_027/028` HR → `OFFICE`; department-head / team-lead level roles → `MANAGEMENT`) plus a rules table by keyword (`sản xuất`, `kho`, `QC`, `vận hành` → PRODUCTION; `kế toán`, `nhân sự`, `marketing`, `IT`, `hành chính` → OFFICE; `trưởng`, `giám đốc`, `quản lý` → MANAGEMENT).

**Alternatives considered:**
- Store category on `Employee` — rejected: employees inherit the property of the position they hold; storing it twice causes drift.
- Detect category dynamically from position name — rejected: fragile, breaks on new positions, cannot be overridden.
- Boolean `isProduction` — rejected: three-way distinction (management-level office roles need Full mode but might want different rubrics later) needs an enum.

### D2. Weight validation — hard block + migration rescale

**Decision:** `positionResponsibilityService` methods `createResponsibility`, `updateResponsibility`, and `deleteResponsibility` wrap the write in a `prisma.$transaction` that computes `sum(weight)` for the affected `positionId` after the change and throws `ValidationError` if the sum is not exactly `100`. The `weight` field is a `Float`; comparison uses an epsilon of `0.001` to tolerate floating-point noise. Migration data-fix: for every position whose current sum ≠ 100, proportionally rescale each responsibility's weight so the sum becomes 100 (rounded to 2 decimals with a residual applied to the largest weight to guarantee the total = 100 exactly).

**Alternatives considered:**
- Soft warn only — rejected: silent broken data is worse than a small UX papercut.
- Store `weightPercent` as integer — rejected: proportional rescaling for legacy data would round-trip badly.
- Enforce only on create — rejected: update and delete can also break the invariant.

### D3. Appeal — comment-only, 7-day window, no workflow reopen

**Decision:** Add `appealComment` (String?), `appealedAt` (DateTime?), `appealResponse` (String?), `appealRespondedAt` (DateTime?), `appealResponderId` (String? FK → User) to `Evaluation`. Endpoint `POST /evaluations/:id/appeal` requires: `status = ACKNOWLEDGED`, `acknowledgedAt` within the last 7 days, caller is the evaluation's employee, and `appealedAt IS NULL` (one-shot per period). `POST /evaluations/:id/appeal/reply` requires: caller is `ADMIN`, `DEPARTMENT_HEAD`, or `supervisor2` of the evaluated user, and `appealComment IS NOT NULL`. Notifications: employee's appeal notifies supervisor2 (if any) and ADMIN; manager's reply notifies the employee. Every appeal write goes into `EvaluationAuditLog`. Status does **NOT** change from `ACKNOWLEDGED`.

**Alternatives considered:**
- Reopen workflow on appeal → sup2 re-scores → back to COMPLETED → new ACKNOWLEDGED — rejected: burdens supervisors and defeats forward-only status invariant; the goal is documented dissent, not re-litigation.
- Free-form threaded comments — rejected: two-slot design (one appeal, one reply) is enough and keeps audit tractable.
- Longer / shorter windows — 7 days chosen because it matches Vietnam workplace norms (one work-week to react to a completed monthly evaluation) and gives HR a clear cutoff for compliance records.

### D4. Peer feedback — anonymous, TEAM_LEAD+, optional

**Decision:** Two new tables:
- `PeerFeedbackInvite`: `evaluationId`, `inviteeUserId`, `invitedByUserId`, `status` (`PENDING`, `SUBMITTED`, `DECLINED`, `EXPIRED`), `token` (opaque, for lightweight audit), `createdAt`, `respondedAt`. `evaluationId + inviteeUserId` is unique. Peer invitees must belong to the same `subDepartmentId` as the evaluation subject. Only issuable when the evaluation's employee has role `TEAM_LEAD`, `DEPARTMENT_HEAD`, or `ADMIN`. Between 2 and 3 invites per evaluation (`ADMIN` or `DEPARTMENT_HEAD` may adjust for `ADMIN` and `DEPARTMENT_HEAD` targets).
- `EvaluationPeerFeedback`: `evaluationId`, `strength`, `weakness`, `suggestion`, `createdAt`. Does **NOT** hold `authorUserId` — anonymous by design. The corresponding `PeerFeedbackInvite` is marked `SUBMITTED` so we know who has responded without linking response to identity.

Aggregation is exposed via `GET /evaluations/:id/peer-feedback/aggregate` — only after all pending invites are either `SUBMITTED`, `DECLINED`, or `EXPIRED`, and the number of `SUBMITTED` responses is ≥ 2. Returns `{ strengths: string[], weaknesses: string[], suggestions: string[], respondentCount }`. If fewer than 2 responses are in, the endpoint returns `{ pending: true, respondentCount, expectedMinimum: 2 }` with no content. Access: subject employee, subject's supervisor2, `DEPARTMENT_HEAD`, `ADMIN`. Never `supervisor1`.

Peer feedback is optional: absence of peer feedback does NOT block any status transition. Invites expire 21 days after creation.

**Alternatives considered:**
- Named peer feedback — rejected: kills honesty in Vietnam's face-saving culture.
- Show partial aggregates as they arrive — rejected: even with N=2 minimum, showing "1 response so far" leaks identity when only one peer knows they submitted.
- Include EMPLOYEE-level targets — rejected: friendship bias too high on the factory floor; keep phase 1 to team-lead upward per researcher recommendation.

### D5. Calibration — report-only dashboard

**Decision:** Extend the existing `getEvaluationCompletionStats` with a sibling `getCalibrationHeatmap(month, year)` that returns:
- `supervisors`: array of `{ supervisorId, supervisorName, supervisorRole, subordinateCount, avgScore, distribution: { d0_20, d21_40, d41_60, d61_80, d81_100 } }`.
- `departmentBenchmarks`: per-`department` `{ p20, p50, p80 }` computed over completed evaluations that month.
- `trend`: last-12-period `{ period, avgScore, completionRate }` for the caller's department (`ADMIN` sees company-wide).
- `inflationAlerts` (**BS3**): array of `{ supervisorId, supervisorName, departmentName, inflationRate, sampleSize }` for supervisors whose direct reports have `>70 %` of scores at or above their department's `p80`. Requires `sampleSize ≥ 5` to fire (avoids noise on tiny teams).

Access: `ADMIN` and `DEPARTMENT_HEAD` (limited to own department) — matches the existing `getCompletionStats` authorization pattern.

**Alternatives considered:**
- Forced distribution / mandatory quota — rejected: 53 % of orgs have dropped forced ranking (researcher finding), and it's a poor fit for varied SME team sizes.
- Digitized calibration workflow (meeting minutes, sign-offs) — rejected: adds process burden and doesn't fit VN SME practice; the meeting stays offline, data supports it.
- Alert threshold at P70 or 60 % — rejected: chosen 70 % + P80 based on Deloitte 2025 industry median.

### D6. Persist score percentages on Evaluation

**Decision:** Add `selfScorePercentage`, `sup1Percentage`, `sup2Percentage` columns (Float?, nullable). Updated inside the same transaction that already promotes `status` when a scoring layer completes. Downstream consumers (payroll preview, calibration heatmap, list APIs) read these fields directly instead of recomputing from `EvaluationDetail` on every request.

Migration backfills these fields for every existing `Evaluation` in a single pass by running the current `computeWeightedScoreForField` over `evaluation.details`.

**Alternatives considered:**
- Compute on-demand — retained cost is negligible for a single evaluation but multiplies badly on list views (`getEmployeeEvaluations`, `getSubordinatesForEvaluation`, calibration heatmap). Persisting is O(1) reads at O(1) extra write cost.
- Denormalize per-detail percentages — rejected: overkill; the aggregate is all downstream needs.

### D7. Comment model — per-role, per-scope

**Decision:**
- `Evaluation` gains three optional String columns: `commentEmployee`, `commentSup1`, `commentSup2`.
- `EvaluationDetail` gains three optional String columns: `commentEmployee`, `commentSup1`, `commentSup2`. The legacy `comment` column is renamed to `commentSup1` during migration (the current buggy behavior only ever wrote it from a supervisor, so this preserves the semantics of existing rows) and the new `commentEmployee` and `commentSup2` are added blank.
- Write authorization is enforced by role and status: employee may write `commentEmployee` while `status = SELF_PENDING`; supervisor1 may write `commentSup1` while `status = SUPERVISOR1_PENDING`; supervisor2 may write `commentSup2` while `status = SUPERVISOR2_PENDING`. ADMIN may write any of them at any status. The current buggy check `data.supervisorScore1 !== undefined || data.supervisorScore2 !== undefined` is removed.

**Alternatives considered:**
- Single `comment` free-for-all with a `role` discriminator column and one row per author — rejected: adds JOIN cost and doesn't reflect the natural 1-1 employee/sup1/sup2 mapping.
- Store as a Comment child table — rejected: only up to 3 comments per evaluation and per detail; the child table pattern is right for lists with unknown cardinality, not for 3 well-defined slots.

### D8. Evidence attachments (Full mode)

**Decision:** New `EvaluationEvidence` model in `common` schema: `id`, `evaluationDetailId` (FK, cascade), `uploadedByUserId`, `fileName`, `filePath`, `mimeType`, `fileSize`, `createdAt`. Files are stored in the existing project upload directory (identified during implementation; likely `backend/uploads/evaluation-evidence/<evaluationId>/`). Max 5 MB per file; allowed MIME types: `image/*`, `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Enforced both client- and server-side.

Delete rule: cascade on `EvaluationDetail` delete. Also, an evidence row cannot be deleted after the evaluation reaches `COMPLETED` (immutability post-completion, complementing the audit log).

**Alternatives considered:**
- Store binary in DB (`Bytes` column) — rejected: bloats the DB, defeats CDN caching, forbidden by common practice.
- External blob store — deferred: the existing upload location is fine for on-prem SME scale. Design remains open to swap adapters later.

### D9. Audit log — append-only

**Decision:** `EvaluationAuditLog` model: `id`, `evaluationId` (FK, cascade), `evaluationDetailId` (FK optional, cascade), `changedByUserId`, `action` (enum `SCORE_UPDATE`, `COMMENT_UPDATE`, `STATUS_TRANSITION`, `NA_TOGGLE`, `APPEAL_SUBMIT`, `APPEAL_REPLY`, `EVIDENCE_ADD`, `EVIDENCE_DELETE`, `GOAL_UPDATE`, `IDP_UPDATE`, `PEER_INVITE`, `PEER_SUBMIT`), `field`, `oldValue`, `newValue`, `createdAt`.

`oldValue` and `newValue` are stored as strings — numeric scores serialize as decimal strings, status transitions store the enum string, comments store the full text (truncated to first 4000 chars if longer; the row is a log, not a replacement for the live field). Writes are always immediately after the live-field update inside the same transaction so audit and live state cannot diverge. There is no delete or update endpoint; log rows exist for the lifetime of the parent evaluation.

Access: `ADMIN` sees all; `DEPARTMENT_HEAD` sees rows for evaluations in their department; other roles do not see logs directly (audit is HR-facing, not employee-facing).

**Alternatives considered:**
- Trigger-based audit at the DB layer — rejected: harder to unit-test, harder to correlate with request context (`changedByUserId`).
- One row per whole-evaluation snapshot — rejected: query cost and storage bloat; per-field deltas answer "who changed what when" directly.

### D10. Goals & IDP — child tables, not JSON

**Decision:** Two new tables:
- `EvaluationGoal`: `id`, `evaluationId` (FK cascade), `orderIndex` (Int for stable order), `title`, `description`, `targetPeriod` (String `YYYY-MM`, the *next* period the goal applies to), `createdAt`, `updatedAt`. Max 3 goals per evaluation, enforced at service layer.
- `EvaluationIdpItem`: `id`, `evaluationId` (FK cascade), `orderIndex`, `skill`, `action`, `deadline` (DateTime), `createdAt`, `updatedAt`. Max 3 items.

Full mode requires at least 1 goal and 1 IDP item before `SUPERVISOR2_PENDING` can transition to `COMPLETED` (soft guardrail: warn but do not block if the supervisor explicitly override-completes; ADMIN may always override).

**Alternatives considered:**
- JSON columns — rejected by AGENTS.md: "child tables, not JSON columns" is a project rule and holds here because goals/IDP items may later need per-item audit and per-item queries (e.g., "how many employees have `Excel` as a target skill?").

### D11. BS1 anti-anchoring masking

**Decision:** Enforce in `employeeEvaluationService.getEvaluationDetails(evaluationId, userId)` as follows: after the existing access check, if the caller is a non-ADMIN user whose role is `TEAM_LEAD` or `DEPARTMENT_HEAD` and:
- `evaluation.status === SUPERVISOR1_PENDING` and the caller is `supervisor1Id` of the target user and no `EvaluationDetail.supervisorScore1` is non-null yet → return `selfScore` for every detail as `null` (mask); include `masked: 'selfScore'` in the response so the UI can render the placeholder.
- `evaluation.status === SUPERVISOR2_PENDING` and the caller is `supervisor2Id` of the target user and no `EvaluationDetail.supervisorScore2` is non-null yet → return `supervisorScore1` for every detail as `null`; include `masked: 'supervisorScore1'`.

After the caller saves their first score, subsequent GETs return the previously-masked field normally.

ADMIN and the employee themselves are never masked. The evaluation-list endpoints (`getEmployeeEvaluations`, `getSubordinatesForEvaluation`) also mask the aggregate percentage under the same conditions.

**Alternatives considered:**
- Timer-based unmask (e.g., "you must wait 60 seconds before seeing self-score") — rejected: cheap to bypass with a second tab.
- Global "supervisor never sees self-score" — rejected: comparing after rating is exactly the pedagogical purpose; only the first-blind step is at risk.

### D12. BS2 payroll transparency — read-only preview

**Decision:** New service method `getPayrollImpactPreview(evaluationId, userId)`:
- Reads the evaluation and its employee (with `positionLevel.kpiSalary` fallback chain matching `payrollService`).
- Reuses the existing exported `computeWeightedScoreForField(details, 'supervisorScore2')` from `employeeEvaluationService`.
- Uses the exact deduction formula found in `payrollService.ts` (`kpiDeduction = kpiBonus > 0 ? Math.round((kpiBonus * (100 - sup2Percentage)) / 100) : 0`). If the formula ever changes, both files must stay aligned — the design mitigation is a shared helper in `@utils/payroll` (created here) that both services import.
- Returns `{ kpiBonus, currentSup2Percentage, projectedDeduction, projectedNet: kpiBonus - projectedDeduction, isFinalized: status === COMPLETED || status === ACKNOWLEDGED }`.

Access: employee (own only), supervisor1/2 for their subordinates, ADMIN, DEPARTMENT_HEAD.

**Alternatives considered:**
- Call `payrollService` directly to compose the preview — rejected: `payrollService.getEmployeePayrolls` is designed for a whole department query and does too much for a single-employee preview endpoint. Sharing the formula through a utility keeps both callers correct.

### D13. Cron / worker for reminders and sync

**Decision:** Use `node-cron` (add if not present; check dependencies first) or the project's existing scheduler if one exists. Three jobs:
- `evaluationReminderD7`: runs 09:00 daily. When today is 7 days from the end of the current month, emit `EVALUATION_REMINDER_SELF_PENDING` notifications for every `Evaluation` still in `SELF_PENDING` for the current period.
- `evaluationReminderD3`: runs 09:00 daily. When today is 3 days from the end of the current month, emit `EVALUATION_REMINDER_SUPERVISOR_PENDING` to every supervisor with subordinates in `SUPERVISOR1_PENDING` or `SUPERVISOR2_PENDING`.
- `evaluationDailySync`: runs 03:00 daily. Calls `syncEvaluationDetails(currentMonth, currentYear)` so new `PositionResponsibility` rows automatically appear in in-progress evaluations without a manual button click.

All jobs use an advisory lock (`SELECT pg_try_advisory_lock('evaluation_cron', jobId)`) so restarts / multiple instances don't fire duplicates.

**Alternatives considered:**
- Trigger at request time — no good hook exists for month-end.
- One consolidated job — rejected: three logical jobs are clearer to reason about and to disable individually.

### D14. PDF export

**Decision:** Server-side PDF generation via `pdfkit` (verify existing dependency; add if missing — pinned exact version per project convention). Endpoint `GET /evaluations/:id/pdf` streams the PDF with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="danh-gia-<employeeCode>-<period>.pdf"`. Layout: header (logo, employee info, period), scoring table (weight, self/sup1/sup2 columns, N/A markers), per-detail comments, evaluation-level comments, goals + IDP (Full mode only), evidence list (name + link, files not embedded), appeal + reply, acknowledgment date, generation timestamp footer. All labels in Vietnamese.

Access: same as `getEvaluationDetails`. Rate-limited to 20 requests/min per user.

**Alternatives considered:**
- Client-side PDF (`html2canvas` + `jsPDF`) — rejected: unpredictable rendering, no server audit of who exported when.
- HTML print stylesheet — rejected: doesn't produce a real archival file.

### D15. Position responsibility template

**Decision:** `POST /positions/:positionId/responsibilities/copy-from/:sourcePositionId` (ADMIN + DEPARTMENT_HEAD) clones all responsibilities from source into target as new rows (fresh CUIDs). Fails with `ConflictError` if target already has any responsibilities. Uses `prisma.$transaction` and re-validates the weight-sum invariant post-copy (should always pass because source was already valid).

**Alternatives considered:**
- Merge into existing — rejected: template intent is "start from a clean baseline", not "append".
- Global templates (independent from any position) — rejected: adds a new concept; copy-from-position is enough for SME scale.

## Risks / Trade-offs

- **[Weight rescale rounds unpredictably]** → Mitigation: migration rounds to 2 decimals and adjusts the largest weight by the residual so the sum equals 100 exactly. Emit a migration log for every position whose weights changed so admins can review.
- **[Payroll formula drift between payroll and preview]** → Mitigation: extract the deduction formula into `@utils/payroll.computeKpiDeduction(kpiBonus, sup2Percentage)` and require both `payrollService` and `employeeEvaluationService.getPayrollImpactPreview` to import it. Add a unit test that asserts the formula returns identical values for a shared parameter grid.
- **[BS1 masking bypass via list endpoints]** → Mitigation: masking rules replicated in `getSubordinatesForEvaluation` and `getEmployeeEvaluations` (return null for the masked aggregate); explicit unit tests cover both list and detail endpoints.
- **[Peer feedback identity leak with 2-respondent minimum]** → Mitigation: aggregate only after all invites resolved (SUBMITTED/DECLINED/EXPIRED) AND `submittedCount ≥ 2`. Below that threshold, endpoint returns `{ pending: true }` with no content. Front-end never displays partial responses.
- **[Legacy evaluations without `mode`]** → Mitigation: migration sets `Evaluation.mode = 'FULL'` for every existing row (safer default — Full mode's rules are a superset of Quick mode's; no lost data or blocked transitions). The behavior of already-completed evaluations does not change.
- **[Legacy `EvaluationDetail.comment` renamed]** → Mitigation: migration renames the column to `commentSup1` in a single ALTER TABLE. Code no longer references `detail.comment` after the rename; a grep-time check during implementation confirms no remaining references.
- **[Cron job double-fire]** → Mitigation: `pg_try_advisory_lock` around each job body. If the lock is held (another instance is running), skip the run.
- **[Inflation alert false positives on small teams]** → Mitigation: minimum sample size = 5 direct reports before an alert fires; below that, the supervisor is excluded from the alert list.
- **[PDF export DoS via bulk requests]** → Mitigation: per-user rate limit 20 req/min (already available via existing rate-limit middleware if present; add if not).
- **[Evidence file upload abuse]** → Mitigation: 5 MB per file, allowlisted MIME types, virus scanning is out of scope for phase 1 (documented; future ClamAV integration can be layered).
- **[Migration data-fix runs on large tables]** → Mitigation: legacy tables are small (< 50k `Evaluation` rows, < 500k `EvaluationDetail` rows expected). Backfill queries scoped with `WHERE` clauses and executed in a single migration transaction. Rollback = down migration drops the new columns/tables; legacy weight values are preserved in a `weight_backup_before_rescale` column added during migration and dropped after 30 days.

## Migration Plan

1. **Schema changes** — apply the new Prisma schema, adding enums, new columns, and new tables. Split into a single migration for clarity of review: `20260708000000_enhance_employee_evaluation`.
2. **Data-fix step 1: Position categories** — populate `Position.category` from the keyword mapping table (see D1). Log which positions receive each category so an admin can audit and correct via the Position admin UI before rollout.
3. **Data-fix step 2: Weight rescale** — before applying the D2 constraint, add a nullable `weight_backup_before_rescale` column, copy legacy weights into it, then compute the rescaled weight per position group and update. Log every position whose weight sum drifted from 100.
4. **Data-fix step 3: Percentage backfill** — for every existing `Evaluation`, compute the three percentages from its details and populate `selfScorePercentage`, `sup1Percentage`, `sup2Percentage`.
5. **Data-fix step 4: Mode assignment** — set `Evaluation.mode = 'FULL'` for all existing rows.
6. **Data-fix step 5: Comment rename** — rename `EvaluationDetail.comment` to `commentSup1`. Add new blank `commentEmployee` and `commentSup2` columns.
7. **Deployment sequence** — deploy backend + migrations first (frontend still works against old API because new fields are additive and new endpoints are extra). Deploy frontend last.
8. **Rollback strategy** — down migration reverses schema; new endpoints simply cease to exist. Persisted percentages become dead columns until dropped by the down migration. Peer feedback data would be lost on rollback — document this in the migration `README.md` under this change directory.
9. **Post-migration verification** — a one-off SQL script (`prisma/scripts/verify-enhance-employee-evaluation.ts`) that confirms: every `Position` has a `category`, every `PositionResponsibility` group sums to 100, every `Evaluation` has non-null `mode` and percentages, no `EvaluationDetail.comment` column remains.

## Open Questions

- **Which PDF library is already available?** — Implementation must check `backend/package.json` before adding `pdfkit`. If `pdfmake` or `puppeteer` is already present, prefer to reuse.
- **Is there an existing cron/scheduler in this project?** — If `node-cron` or an in-house `@services/cron` module exists, reuse it. Otherwise, add `node-cron` with a pinned version.
- **Where are uploaded files currently stored?** — Locate the existing upload handler (used e.g. for face-attendance photos or product images) and adopt the same directory convention for evidence.
- **Rate-limit middleware presence** — Confirm whether the project has one (e.g., `express-rate-limit`) before adding a new dependency for the PDF endpoint.
- **Position-category admin UI** — Where is the current Position management UI? Implementation must extend it to include the category dropdown; if no admin UI exists yet, an out-of-scope note goes into `tasks.md` for a follow-up mini-change.
