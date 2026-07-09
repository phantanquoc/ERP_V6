# evaluation-audit-log Specification

## Purpose
TBD - created by archiving change enhance-employee-evaluation. Update Purpose after archive.
## Requirements
### Requirement: Immutable audit log for evaluation changes

The system SHALL record every score, comment, status, appeal, evidence, goal, IDP, and peer-invite/submit change on an evaluation as an append-only `EvaluationAuditLog` row containing at minimum: `evaluationId`, `evaluationDetailId` (nullable, for detail-scoped changes), `changedByUserId`, `action` (enum), `field`, `oldValue`, `newValue`, `createdAt`. Audit rows SHALL NOT be updatable or deletable via any application-level endpoint.

#### Scenario: Score update produces an audit row

- **WHEN** supervisor1 updates `EvaluationDetail.supervisorScore1` from `null` to `80`
- **THEN** an `EvaluationAuditLog` row is created with `action = SCORE_UPDATE`, `field = "supervisorScore1"`, `oldValue = null`, `newValue = "80"`, and `changedByUserId` equal to the caller's user id

#### Scenario: Status transition produces an audit row

- **WHEN** the evaluation transitions from `SELF_PENDING` to `SUPERVISOR1_PENDING`
- **THEN** an `EvaluationAuditLog` row is created with `action = STATUS_TRANSITION`, `field = "status"`, `oldValue = "SELF_PENDING"`, `newValue = "SUPERVISOR1_PENDING"`

#### Scenario: No delete endpoint exposed

- **WHEN** any user attempts to DELETE `/evaluations/:id/audit-log/:logId`
- **THEN** the API returns HTTP 404 (no such route registered)

### Requirement: Audit writes are transactional with the live change

The system SHALL write each `EvaluationAuditLog` row inside the same `prisma.$transaction` block that mutates the live field, so a live-field write cannot succeed without a corresponding audit row (and vice versa).

#### Scenario: Live-field mutation rollback also rolls back audit

- **WHEN** a transaction updating a score and its audit row throws mid-flight
- **THEN** neither the live field nor the audit row is persisted

### Requirement: Audit log access restricted to HR-facing roles

The system SHALL expose `GET /evaluations/:id/audit-log` to `ADMIN` (all evaluations) and `DEPARTMENT_HEAD` (evaluations of employees whose department they head). `TEAM_LEAD`, `EMPLOYEE`, and other roles SHALL NOT have access.

#### Scenario: ADMIN reads any evaluation's audit log

- **WHEN** an `ADMIN` GETs the audit log of any evaluation
- **THEN** the API returns HTTP 200 with the ordered list of audit rows (newest first)

#### Scenario: DEPARTMENT_HEAD reads own-department audit only

- **WHEN** a `DEPARTMENT_HEAD` GETs the audit log of an evaluation for an employee in a different department
- **THEN** the API returns HTTP 403

#### Scenario: TEAM_LEAD is denied

- **WHEN** a `TEAM_LEAD` GETs the audit log endpoint
- **THEN** the API returns HTTP 403

### Requirement: Audit action taxonomy

The system SHALL classify each audit row with one of these `action` enum values:
- `SCORE_UPDATE` — change to `selfScore`, `supervisorScore1`, or `supervisorScore2`
- `COMMENT_UPDATE` — change to any `commentEmployee` / `commentSup1` / `commentSup2` at evaluation or detail level
- `STATUS_TRANSITION` — change to `Evaluation.status`
- `NA_TOGGLE` — change to `EvaluationDetail.notApplicable`
- `APPEAL_SUBMIT` — employee posted `appealComment`
- `APPEAL_REPLY` — manager posted `appealResponse`
- `EVIDENCE_ADD` / `EVIDENCE_DELETE` — evidence attachment lifecycle
- `GOAL_UPDATE` — create/update/delete of `EvaluationGoal`
- `IDP_UPDATE` — create/update/delete of `EvaluationIdpItem`
- `PEER_INVITE` — a `PeerFeedbackInvite` row was created (identifies invitee)
- `PEER_SUBMIT` — a `PeerFeedbackInvite` transitioned to `SUBMITTED` (does NOT identify the invitee to preserve anonymity — records only that the invite completed)

#### Scenario: Comment update is classified correctly

- **WHEN** an employee saves `commentEmployee` on a detail
- **THEN** the audit row's `action = COMMENT_UPDATE` and `field = "commentEmployee"`

#### Scenario: Peer submit audit does not identify the peer

- **WHEN** a peer submits feedback and the invite transitions to `SUBMITTED`
- **THEN** the audit row for `PEER_SUBMIT` records the fact of transition but its `changedByUserId` is left null (no per-response identity leak)

