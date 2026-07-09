## ADDED Requirements

### Requirement: Position category drives evaluation mode

The system SHALL classify every `Position` with a `category` enum (`PRODUCTION`, `OFFICE`, `MANAGEMENT`), and every new `Evaluation` SHALL derive an immutable `mode` field (`QUICK` for `PRODUCTION`, `FULL` for `OFFICE` and `MANAGEMENT`) at creation time. The evaluation's runtime behavior (which criteria are required, which UI tabs are exposed, whether goals/IDP/evidence are enforced) SHALL be determined by `Evaluation.mode`, not by the current `Position.category`, so that mid-period category changes do not retroactively alter open evaluations.

#### Scenario: Production position creates a Quick-mode evaluation

- **WHEN** an evaluation is created for an employee whose position has `category = PRODUCTION`
- **THEN** the resulting evaluation's `mode` is `QUICK` and the response includes `mode = "QUICK"`

#### Scenario: Office position creates a Full-mode evaluation

- **WHEN** an evaluation is created for an employee whose position has `category = OFFICE`
- **THEN** the resulting evaluation's `mode` is `FULL`

#### Scenario: Management position creates a Full-mode evaluation

- **WHEN** an evaluation is created for an employee whose position has `category = MANAGEMENT`
- **THEN** the resulting evaluation's `mode` is `FULL`

#### Scenario: Position category change does not mutate open evaluation

- **WHEN** an evaluation exists with `mode = QUICK` and an admin changes the underlying `Position.category` to `OFFICE`
- **THEN** the existing evaluation's `mode` remains `QUICK` until it reaches `COMPLETED` or `ACKNOWLEDGED`

### Requirement: PositionResponsibility weight sum must equal 100

The system SHALL reject any create, update, or delete of `PositionResponsibility` that would leave `sum(weight)` for the affected `positionId` different from 100 (using an epsilon of 0.001 for floating-point comparison). The migration SHALL rescale legacy positions whose weight sum is not 100 proportionally, so that every position on disk satisfies the invariant after deployment.

#### Scenario: Creating a responsibility that breaks the sum is rejected

- **WHEN** an admin tries to create a `PositionResponsibility` whose weight would push the position's total above or below 100
- **THEN** the API returns HTTP 400 with a `ValidationError` message in Vietnamese explaining the sum constraint

#### Scenario: Updating a responsibility that breaks the sum is rejected

- **WHEN** an admin tries to update a `PositionResponsibility.weight` such that the position's total is no longer 100
- **THEN** the API returns HTTP 400 with a `ValidationError`

#### Scenario: Deleting a responsibility that breaks the sum is rejected

- **WHEN** an admin tries to delete a `PositionResponsibility` for a position that has other responsibilities and the remaining sum would not equal 100
- **THEN** the API returns HTTP 400 with a `ValidationError`

#### Scenario: Legacy weights are rescaled to sum to 100 during migration

- **WHEN** the enhance-employee-evaluation migration runs against a position whose responsibilities sum to 120
- **THEN** each responsibility's weight is rescaled proportionally to 2 decimals with the residual applied to the largest weight so the sum equals exactly 100

### Requirement: Evaluation detail supports N/A flag

The system SHALL allow an `EvaluationDetail` to be flagged as `notApplicable`, and any detail so flagged SHALL be excluded from all weighted-average score calculations. Only the employee may set `notApplicable = true` while the evaluation is in `SELF_PENDING`; supervisors and ADMIN may set or unset the flag at any subsequent status.

#### Scenario: N/A detail is excluded from weighted average

- **WHEN** an evaluation has 3 details with weights 40/40/20 and the 20-weight detail is flagged `notApplicable`
- **THEN** the weighted average is computed over only the two remaining details (weights 40 and 40, total 80), and the result is reported as a percentage relative to weight 80

#### Scenario: Non-employee cannot toggle N/A during SELF_PENDING

- **WHEN** a supervisor or admin tries to set `notApplicable` on a detail while the evaluation status is `SELF_PENDING`
- **THEN** the API returns HTTP 400 (supervisor) or succeeds (admin), consistent with the RBAC override rule

#### Scenario: Supervisor can toggle N/A after supervisor status begins

- **WHEN** the evaluation status is `SUPERVISOR1_PENDING` or `SUPERVISOR2_PENDING` and a matching supervisor toggles `notApplicable` on a detail
- **THEN** the API accepts the change and the audit log records the toggle

### Requirement: Per-role comments at evaluation and detail level

The system SHALL provide three optional comment columns at both `Evaluation` level (`commentEmployee`, `commentSup1`, `commentSup2`) and `EvaluationDetail` level (same field names). Employees SHALL be able to save their own comment while the evaluation is `SELF_PENDING`; supervisor1 SHALL be able to save their own comment while `SUPERVISOR1_PENDING`; supervisor2 SHALL be able to save their own comment while `SUPERVISOR2_PENDING`. ADMIN MAY save any comment at any status. The previous behavior that only allowed a comment to be saved when a supervisor score was also being saved SHALL be removed.

#### Scenario: Employee saves self-comment during SELF_PENDING

- **WHEN** an employee is in `SELF_PENDING` and submits `commentEmployee = "Đã hoàn thành mục tiêu Q3"` for a detail
- **THEN** the API accepts the write and the detail's `commentEmployee` is persisted

#### Scenario: Employee cannot save self-comment after leaving SELF_PENDING

- **WHEN** the evaluation is in `SUPERVISOR1_PENDING` and the employee tries to update `commentEmployee`
- **THEN** the API returns HTTP 400

#### Scenario: Supervisor1 comment does not require a supervisor score

- **WHEN** supervisor1 saves only `commentSup1` on a detail (no `supervisorScore1` in the payload)
- **THEN** the API accepts the write and `commentSup1` is persisted

### Requirement: Quick mode workflow for production positions

The system SHALL, for evaluations with `mode = QUICK`, expose a simplified UI surface: single-screen table of up to the 5 highest-weight responsibilities, one overall `commentEmployee` field, and a "Copy from previous month" action that pre-fills the current period's `selfScore` values from the previous period's completed evaluation of the same employee. Quick-mode evaluations SHALL NOT enforce goal or IDP creation.

#### Scenario: Copy-from-previous-month pre-fills self scores

- **WHEN** an employee in a Quick-mode evaluation clicks "Copy from previous month" and a completed prior-month evaluation exists
- **THEN** every detail's `selfScore` is pre-filled with the corresponding prior detail's `selfScore` (matched by `positionResponsibilityId`); details that did not exist last month remain empty

#### Scenario: Copy-from-previous-month with no prior evaluation is a no-op

- **WHEN** an employee clicks "Copy from previous month" and no prior evaluation exists for the same employee
- **THEN** the API returns HTTP 200 with `data = { copied: 0 }` and no fields are modified

#### Scenario: Quick mode does not require goals or IDP

- **WHEN** a Quick-mode evaluation reaches `SUPERVISOR2_PENDING → COMPLETED` without any `EvaluationGoal` or `EvaluationIdpItem` rows
- **THEN** the completion succeeds

### Requirement: Full mode workflow for office and management positions

The system SHALL, for evaluations with `mode = FULL`, expose per-detail comments for every role (employee, supervisor1, supervisor2), per-detail evidence attachments, an evaluation-level goals section (up to 3 `EvaluationGoal` rows targeting the next period), and an evaluation-level IDP section (up to 3 `EvaluationIdpItem` rows). A Full-mode evaluation SHOULD have at least 1 goal and 1 IDP item before completion; the system SHALL warn but NOT block if the supervisor2 explicitly overrides the guardrail. ADMIN SHALL always be permitted to complete a Full-mode evaluation regardless of goals/IDP presence.

#### Scenario: Full mode completion without goals warns

- **WHEN** a Full-mode evaluation has all supervisor2 scores filled and no `EvaluationGoal` rows, and supervisor2 submits without the override flag
- **THEN** the API returns HTTP 400 with a `ValidationError` in Vietnamese asking for at least one goal

#### Scenario: Full mode completion with override succeeds

- **WHEN** supervisor2 submits the completion with `overrideEmptyGoals = true` and there are still no goals
- **THEN** the evaluation completes and an audit log entry records the override

#### Scenario: ADMIN completion never blocks on goals

- **WHEN** an ADMIN completes a Full-mode evaluation with no goals
- **THEN** the API accepts the completion without an override flag

### Requirement: Evidence attachment for Full-mode details

The system SHALL allow Full-mode `EvaluationDetail` rows to have up to 5 evidence files attached. Each file SHALL be at most 5 MB. Allowed MIME types SHALL be images (`image/*`), PDFs (`application/pdf`), Excel (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), and Word (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`). Evidence rows SHALL NOT be deletable once the evaluation reaches `COMPLETED` or `ACKNOWLEDGED`.

#### Scenario: Oversized evidence is rejected

- **WHEN** a user uploads a 10 MB PDF as evidence
- **THEN** the API returns HTTP 400 with a `ValidationError` in Vietnamese explaining the 5 MB limit

#### Scenario: Disallowed MIME type is rejected

- **WHEN** a user uploads a `.exe` file as evidence
- **THEN** the API returns HTTP 400

#### Scenario: Evidence cannot be deleted after COMPLETED

- **WHEN** the evaluation status is `COMPLETED` and a user tries to delete an evidence row
- **THEN** the API returns HTTP 400 with a `ValidationError`

### Requirement: Anti-anchoring first-blind rating (BS1)

The system SHALL mask the previous rater's score from a supervisor until the supervisor has saved at least one score in the current period. Specifically, when a supervisor1 GETs a `SUPERVISOR1_PENDING` evaluation and has not yet saved any `supervisorScore1`, all details SHALL return `selfScore = null` and the response SHALL include `masked: "selfScore"`. The same rule SHALL apply to supervisor2 masking `supervisorScore1`. Employees and ADMIN SHALL never see masked responses. List endpoints (`getEmployeeEvaluations`, `getSubordinatesForEvaluation`) SHALL also return `null` for masked aggregate percentages under the same conditions.

#### Scenario: Supervisor1 sees self-scores masked before rating

- **WHEN** supervisor1 GETs an evaluation in `SUPERVISOR1_PENDING` state before saving any score
- **THEN** the response's details all have `selfScore = null` and the top-level response includes `masked = "selfScore"`

#### Scenario: Supervisor1 sees self-scores after saving first score

- **WHEN** supervisor1 saves one detail's `supervisorScore1` and then GETs the evaluation again
- **THEN** the response's details include the actual `selfScore` values

#### Scenario: Employee never sees masked response

- **WHEN** the employee GETs their own evaluation in `SUPERVISOR1_PENDING`
- **THEN** the response includes actual scores (no masking applies to the subject)

#### Scenario: ADMIN never sees masked response

- **WHEN** an ADMIN GETs any evaluation
- **THEN** the response includes actual scores regardless of status

### Requirement: Payroll transparency preview (BS2)

The system SHALL provide a read-only endpoint that returns the projected payroll impact of an evaluation for an employee: `kpiBonus`, `currentSup2Percentage`, `projectedDeduction` (computed via the same shared utility that `payrollService` uses), `projectedNet` (`kpiBonus - projectedDeduction`), and `isFinalized` (`true` when status is `COMPLETED` or `ACKNOWLEDGED`). This endpoint SHALL NOT modify any payroll record and SHALL NOT change the deduction formula.

#### Scenario: Employee views their own payroll impact preview

- **WHEN** the employee GETs `/evaluations/:id/payroll-preview` for their own evaluation
- **THEN** the response contains the projected payroll impact and `isFinalized` reflecting the current status

#### Scenario: Projected deduction uses the shared formula

- **WHEN** `kpiBonus = 5,000,000` and `currentSup2Percentage = 85.5`
- **THEN** `projectedDeduction = round(5,000,000 × (100 - 85.5) / 100) = 725,000` (matching `payrollService`)

#### Scenario: Endpoint is read-only

- **WHEN** the payroll-preview endpoint is called
- **THEN** no `Payroll` row is created or updated, and the response indicates preview-only

### Requirement: Persisted percentage columns on Evaluation

The system SHALL persist three percentage columns on `Evaluation` (`selfScorePercentage`, `sup1Percentage`, `sup2Percentage`, all `Float?`). Each column SHALL be updated inside the same transaction that promotes the evaluation status when the corresponding scoring layer is complete. Downstream consumers (payroll preview, calibration heatmap, list endpoints) SHALL read these fields rather than recomputing from `EvaluationDetail`.

#### Scenario: Self percentage is persisted when self-scoring completes

- **WHEN** an employee saves the last self-score of an evaluation and the status transitions from `SELF_PENDING`
- **THEN** the `Evaluation.selfScorePercentage` is populated with the weighted average and the value equals the result of `computeWeightedScoreForField(details, "selfScore")`

#### Scenario: Sup1 percentage is persisted when sup1 scoring completes

- **WHEN** supervisor1 saves the last score and the status transitions from `SUPERVISOR1_PENDING`
- **THEN** the `Evaluation.sup1Percentage` is populated

#### Scenario: Sup2 percentage is persisted when sup2 scoring completes

- **WHEN** supervisor2 saves the last score and the status transitions to `COMPLETED`
- **THEN** the `Evaluation.sup2Percentage` is populated and matches `Evaluation.score`

### Requirement: Appeal window with reply, no workflow reopen

The system SHALL allow the employee to submit a one-shot `appealComment` within 7 days after `ACKNOWLEDGED`. Managers (`ADMIN`, `DEPARTMENT_HEAD`, or the assigned supervisor2) MAY submit `appealResponse` at any time thereafter. The evaluation's `status` SHALL remain `ACKNOWLEDGED` regardless of appeal activity. Every appeal submit and reply SHALL emit a notification (submit → supervisor2 + ADMIN; reply → employee) and write an entry to the audit log. A second appeal on the same evaluation SHALL be rejected.

#### Scenario: Employee submits appeal within the window

- **WHEN** an evaluation was acknowledged 3 days ago and the employee POSTs to the appeal endpoint with `appealComment`
- **THEN** the API returns HTTP 200, `appealComment` and `appealedAt` are persisted, status remains `ACKNOWLEDGED`, and supervisor2 + ADMIN receive a notification

#### Scenario: Employee appeal outside the window is rejected

- **WHEN** an evaluation was acknowledged 10 days ago and the employee tries to submit an appeal
- **THEN** the API returns HTTP 400 with `ValidationError` in Vietnamese explaining the 7-day window

#### Scenario: Employee cannot submit twice

- **WHEN** an appeal already exists (`appealComment IS NOT NULL`) and the same employee tries to submit again
- **THEN** the API returns HTTP 400

#### Scenario: Manager reply notifies the employee

- **WHEN** a `DEPARTMENT_HEAD` submits `appealResponse`
- **THEN** `appealResponse`, `appealRespondedAt`, and `appealResponderId` are persisted, the employee receives a notification, and the audit log records the reply

### Requirement: Calibration heatmap and inflation alert (BS3)

The system SHALL provide a report-only calibration dashboard endpoint that returns, for a given month and year: (a) a per-supervisor distribution of `sup2Percentage` bucketed by deciles, (b) per-department benchmarks (P20, P50, P80), (c) a 12-period trend of average score and completion rate, and (d) an `inflationAlerts` list containing any supervisor with `sampleSize ≥ 5` direct reports whose ratio of `sup2Percentage ≥ department P80` exceeds 70 %. This endpoint SHALL NOT block any workflow.

#### Scenario: Heatmap returns per-supervisor distribution

- **WHEN** `ADMIN` GETs the calibration heatmap for a month with 30 completed evaluations across 3 supervisors
- **THEN** the response includes an entry per supervisor with `subordinateCount`, `avgScore`, and 5 decile buckets

#### Scenario: Inflation alert fires above threshold

- **WHEN** a supervisor has 10 direct reports and 8 of them (80 %) score at or above the department's P80
- **THEN** the supervisor appears in `inflationAlerts` with `inflationRate = 0.8` and `sampleSize = 10`

#### Scenario: Small teams do not fire alerts

- **WHEN** a supervisor has 3 direct reports all scoring above P80
- **THEN** the supervisor does NOT appear in `inflationAlerts` because `sampleSize < 5`

#### Scenario: Department head sees own department only

- **WHEN** a `DEPARTMENT_HEAD` GETs the calibration heatmap
- **THEN** the response is filtered to their own department; supervisors from other departments are excluded

### Requirement: Goal setting and individual development plan (Full mode)

The system SHALL allow a Full-mode evaluation to have up to 3 `EvaluationGoal` rows (targeting the next period) and up to 3 `EvaluationIdpItem` rows. Employees and supervisor1/2 (based on evaluation status) SHALL be able to create/update/delete goals and IDP items. Every change SHALL be logged in the audit log.

#### Scenario: Employee adds a goal during SELF_PENDING

- **WHEN** an employee in `SELF_PENDING` POSTs a new `EvaluationGoal` with title, description, and targetPeriod
- **THEN** the API returns HTTP 201, the goal is persisted, and the audit log records `GOAL_UPDATE`

#### Scenario: More than 3 goals is rejected

- **WHEN** an employee tries to add a 4th goal
- **THEN** the API returns HTTP 400 with `ValidationError` in Vietnamese explaining the limit

#### Scenario: IDP items follow the same 3-item limit

- **WHEN** an employee tries to add a 4th IDP item
- **THEN** the API returns HTTP 400

### Requirement: Automated reminders and detail sync

The system SHALL run three scheduled jobs:
- **`evaluationReminderD7`** — at 09:00 daily, if today is 7 days before the last day of the current month, notify every employee whose current-period evaluation is still in `SELF_PENDING`.
- **`evaluationReminderD3`** — at 09:00 daily, if today is 3 days before the last day of the current month, notify every supervisor with subordinate evaluations still in `SUPERVISOR1_PENDING` or `SUPERVISOR2_PENDING`.
- **`evaluationDailySync`** — at 03:00 daily, run `syncEvaluationDetails(currentMonth, currentYear)` so newly-added `PositionResponsibility` rows are automatically reflected in in-progress evaluations.

Each job SHALL acquire a PostgreSQL advisory lock before running so multiple instances / restarts do not fire duplicates.

#### Scenario: D-7 reminder fires only once per employee per period

- **WHEN** the D-7 job runs twice in the same day (e.g., after a restart)
- **THEN** each eligible employee receives at most one `EVALUATION_REMINDER_SELF_PENDING` notification for the period thanks to the advisory lock

#### Scenario: Daily sync backfills missing details

- **WHEN** the daily-sync job runs and a new `PositionResponsibility` was added to a position that has an in-progress evaluation
- **THEN** the missing `EvaluationDetail` row is created (with null scores) and appears on subsequent GETs

### Requirement: PDF export per evaluation

The system SHALL provide `GET /evaluations/:id/pdf` returning `Content-Type: application/pdf` with the evaluation's full record: header (logo, employee code + name + position, period), score table (weight, self/sup1/sup2 columns, N/A markers), per-detail comments, evaluation-level comments, goals + IDP (Full mode only), evidence list (filename + URL, files not embedded), appeal and reply, acknowledgment date, and a generation timestamp footer. All labels SHALL be in Vietnamese. Access matches `getEvaluationDetails`. Rate limited to 20 requests per minute per user.

#### Scenario: Employee downloads their own evaluation PDF

- **WHEN** the employee GETs `/evaluations/:id/pdf` for their own evaluation
- **THEN** the API returns HTTP 200 with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="danh-gia-<code>-<period>.pdf"`

#### Scenario: PDF includes acknowledgment section when acknowledged

- **WHEN** the evaluation has been `ACKNOWLEDGED`
- **THEN** the PDF includes the acknowledgment date

#### Scenario: PDF omits Full-mode sections for Quick-mode evaluation

- **WHEN** a `QUICK` evaluation's PDF is generated
- **THEN** the PDF omits goals, IDP, and per-detail evidence sections

### Requirement: Copy responsibilities from another position (template)

The system SHALL allow ADMIN or DEPARTMENT_HEAD to clone all `PositionResponsibility` rows from a source position to a target position via `POST /positions/:positionId/responsibilities/copy-from/:sourcePositionId`. The target position SHALL be empty of responsibilities; otherwise the API returns HTTP 409. New rows are created with fresh CUIDs. The weight sum invariant is verified after copy.

#### Scenario: Copy into an empty target succeeds

- **WHEN** the target position has zero responsibilities and the source has 3 responsibilities summing to 100
- **THEN** 3 new responsibilities are created on the target, weights match the source, and the sum is 100

#### Scenario: Copy into a non-empty target is rejected

- **WHEN** the target position already has one or more responsibilities
- **THEN** the API returns HTTP 409 with `ConflictError`
