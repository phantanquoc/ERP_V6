## Why

The current Employee Evaluation module is a dry scorecard, not a coaching tool. Monthly cycles create rating fatigue because the workflow is rigid and treats factory workers and office staff identically. Employees cannot justify their self-scores, supervisors cannot leave overall feedback, and there is no goal setting, IDP, evidence attachment, appeal channel, or audit trail — which also creates legal risk under Vietnam Labor Code 2019 Article 36.1(a) (requires evidence trail for performance-based termination). Supervisors see the self-score before rating (anchoring bias, culturally amplified in Vietnam's hierarchical workplace). Employees do not see how a score translates into salary, and HR/BOD have no calibration data to detect rating inflation.

## What Changes

- **Add** `Position.category` enum (`PRODUCTION` | `OFFICE` | `MANAGEMENT`) that drives a hybrid evaluation flow: Quick mode for production workers (3-5 core criteria, single overall comment, one-click "copy previous month" baseline) and Full mode for office/management (goals for next period, individual development plan, per-detail evidence upload, per-detail comments for every role).
- **Add** per-role evaluation-level comment fields (`commentEmployee`, `commentSup1`, `commentSup2`) and fix the existing bug where employee comments cannot be saved.
- **Add** "N/A" flag on `EvaluationDetail` so criteria that do not apply this period are excluded from the weighted average.
- **Add** hard validation that the sum of `PositionResponsibility.weight` per position equals 100, with a data-fix migration that rescales legacy positions.
- **Add** goal-setting (2-3 SMART goals for next period) and individual development plan (2-3 skill/action/deadline items) — Full mode only.
- **Add** evidence attachment per evaluation detail (Full mode) — file upload with size/type validation.
- **Add** appeal mechanism: 7-day window after `ACKNOWLEDGED` for the employee to post `appealComment`; manager may reply. Appeal does **NOT** reopen the workflow.
- **Add** peer feedback: `TEAM_LEAD+` only, anonymous, 2-3 invited peers per period, 3 questions (strength / weakness / suggestion), aggregated. Optional — does NOT block status transitions.
- **Add** immutable audit log for every score/comment/status/appeal change (`EvaluationAuditLog`).
- **Add** persisted percentage fields (`selfScorePercentage`, `sup1Percentage`, `sup2Percentage`) on `Evaluation` so downstream consumers do not recompute from details.
- **Add** anti-anchoring "first-blind rating" (**BS1**): a supervisor's `GET details` response masks `selfScore` when `status = SUPERVISOR1_PENDING` and no `supervisorScore1` has been saved yet (same rule for supervisor2 vs `supervisorScore1`); unmasks after the supervisor saves their first detail.
- **Add** payroll transparency panel (**BS2**): a new `getPayrollImpactPreview` endpoint returns `{ kpiBonus, currentSup2Score, projectedDeduction, projectedNet }` — read-only, does NOT touch payroll formula.
- **Add** calibration dashboard (**BS3**): supervisor × score heatmap, 12-period trend, and automatic rating-inflation alert flagging any supervisor whose direct reports have >70 % in the top P80 of their department.
- **Add** PositionResponsibility preset/template — copy criteria from another position.
- **Add** PDF export per evaluation (logo, details, comments, evidence, appeal, acknowledgment).
- **Add** reminder cron jobs — 7 days before month-end (nudge `SELF_PENDING`), 3 days before month-end (nudge pending supervisors), plus a daily auto-sync of evaluation details for the current period.
- **Modify** `EmployeeSelfEvaluationModal`, `SubordinateEvaluationList`, and `EmployeeEvaluationManagement` to render mode-aware layouts, expose the new tabs (goals, IDP, evidence, payroll impact), show masked-score placeholders (BS1), and surface inflation alerts + heatmap (BS3).

**Explicitly out of scope:**
- The `kpiDeduction` formula in `payrollService.ts` stays exactly as it is.
- Monthly cycle stays — no move to quarterly.
- Skill Matrix / cross-training (BS4) is deferred to a separate future change.
- No new LLM provider (OpenRouter-only, per CLAUDE.md).
- No changes to the RBAC hierarchy.

## Capabilities

### New Capabilities

- `employee-evaluation`: Full lifecycle of monthly employee performance evaluations including hybrid quick/full modes driven by position category, self and multi-tier supervisor scoring, N/A flag, per-role comments, goal setting, individual development plan, evidence attachments, appeal window, calibration reporting, anti-anchoring masking, payroll impact preview, audit logging, PDF export, and reminder/sync automation.
- `evaluation-peer-feedback`: Anonymous peer feedback collection for `TEAM_LEAD` and higher, including peer invitations by supervisors, structured 3-question responses, aggregation after all invited peers respond, and privacy guarantees (no per-response attribution surfaced).
- `evaluation-audit-log`: Immutable, append-only audit log of every field change (score, comment, status, appeal) on evaluations and details, with actor, old value, new value, and timestamp — used both for HR review and Vietnam Labor Code 2019 evidence trail.

### Modified Capabilities

None — the current evaluation flow lives in code without a dedicated spec, so this change introduces the first spec for it (as a new capability) rather than modifying an existing one.

## Impact

**Prisma schema (`backend/prisma/schema/common.prisma`)**
- New enum `PositionCategory`.
- `Position` gains `category` field (default `OFFICE`).
- `Evaluation` gains `mode`, `commentEmployee`, `commentSup1`, `commentSup2`, `selfScorePercentage`, `sup1Percentage`, `sup2Percentage`, `appealComment`, `appealResponse`, `appealedAt`, `appealRespondedAt`, and relations to new child tables.
- `EvaluationDetail` gains `notApplicable` boolean and per-role comment columns (`commentEmployee`, `commentSup1`, `commentSup2`) — legacy `comment` retained for backward-compat migration then dropped.
- New models: `EvaluationEvidence`, `EvaluationGoal`, `EvaluationIdpItem`, `EvaluationAuditLog`, `EvaluationPeerFeedback`, `PeerFeedbackInvite` — all in `common` schema with CUID IDs, child-table pattern (no JSON arrays).

**Backend services**
- New: `evaluationAuditService.ts`, `evaluationPeerFeedbackService.ts`.
- Extended: `employeeEvaluationService.ts` (hybrid branching, N/A math, BS1 masking, BS3 inflation, appeal methods, payroll preview, calibration heatmap), `positionResponsibilityService.ts` (weight = 100 hard block), `positionService.ts` (category CRUD).
- Untouched: `payrollService.ts` deduction formula.

**Backend controllers & routes**
- ~15 new endpoints under `/api/employee-evaluations/…` (comment, evidence, appeal, N/A, peer, audit, heatmap, PDF, payroll-preview, template-copy).
- `ROUTE_MAP` in `backend/src/routes/index.ts` gains new entries.

**Backend infrastructure**
- New cron/worker for reminders (7-day / 3-day) and daily auto sync-details.
- Local file upload directory or existing storage adapter for evidence files.

**Frontend**
- Existing components refactored: `EmployeeSelfEvaluationModal`, `SubordinateEvaluationList`, `EmployeeEvaluationManagement`.
- New components: `EvaluationAppealForm`, `PeerFeedbackForm`, `CalibrationDashboard`, `EvaluationPdfPreview`, `PayrollImpactPanel`, `IDPForm`, `GoalsForm`, `EvidenceUpload`.
- New route `/dashboard/evaluation-calibration` for `ADMIN` / `DEPARTMENT_HEAD`.
- `useEmployeeEvaluation` hook and `employeeEvaluationService` client gain mutations/queries for the new endpoints.

**Data migration**
- Backfill `Position.category` from `Position.code` seed patterns (`POS_008` production → `PRODUCTION`, `POS_017` marketing → `OFFICE`, etc.).
- Rescale legacy `PositionResponsibility.weight` per position so the sum equals 100 (proportional).

**Legal / compliance**
- Immutable audit trail satisfies Vietnam Labor Code 2019 Article 36.1(a) requirement for evidence when disciplining or terminating for repeated non-performance.

**Dependencies**
- New: `pdfkit` (or reuse existing PDF library if present) for evaluation PDF export. Verify existing dependencies first.
- No new frontend runtime dependencies expected beyond what is already in use (TanStack Query, react-hook-form, zod).
