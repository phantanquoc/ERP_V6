# evaluation-peer-feedback Specification

## Purpose
TBD - created by archiving change enhance-employee-evaluation. Update Purpose after archive.
## Requirements
### Requirement: Peer feedback invitations for TEAM_LEAD and above

The system SHALL allow the evaluated employee's supervisor2 (or ADMIN / DEPARTMENT_HEAD) to invite between 2 and 3 peers to submit anonymous feedback on an evaluation whose subject has role `TEAM_LEAD`, `DEPARTMENT_HEAD`, or `ADMIN`. Invitees SHALL be users who share the subject's `subDepartmentId` and who are not the subject themselves. Peer feedback SHALL NOT be available for evaluations whose subject has role `EMPLOYEE`.

#### Scenario: Sup2 invites 2 peers for a TEAM_LEAD evaluation

- **WHEN** supervisor2 POSTs to `/evaluations/:id/peer-feedback/invite` with `inviteeUserIds = [uidA, uidB]` for a TEAM_LEAD's evaluation and both invitees share the subject's subDepartment
- **THEN** the API returns HTTP 201 and two `PeerFeedbackInvite` rows are created with status `PENDING`

#### Scenario: EMPLOYEE-level target cannot receive peer feedback

- **WHEN** supervisor2 tries to invite peers for an evaluation whose subject has role `EMPLOYEE`
- **THEN** the API returns HTTP 400 with `ValidationError` in Vietnamese

#### Scenario: Invitee outside the subDepartment is rejected

- **WHEN** an invited user does not share the subject's subDepartment
- **THEN** the API returns HTTP 400 and no invite rows are created

#### Scenario: Fewer than 2 or more than 3 invites is rejected

- **WHEN** supervisor2 tries to invite 1 or 4 peers in a single request
- **THEN** the API returns HTTP 400

### Requirement: Peer feedback submissions are anonymous

The system SHALL persist each peer feedback response with only `evaluationId`, `strength`, `weakness`, `suggestion`, and `createdAt` — NO field linking the response to the responder. The corresponding `PeerFeedbackInvite.status` SHALL transition from `PENDING` to `SUBMITTED` to record that the invitee has responded, without any direct foreign key from `EvaluationPeerFeedback` to `PeerFeedbackInvite` or User.

#### Scenario: Peer submits feedback via invite token

- **WHEN** an invited user POSTs to `/evaluations/:id/peer-feedback/submit` with `token` and `{ strength, weakness, suggestion }`
- **THEN** an `EvaluationPeerFeedback` row is created without an author FK, and the `PeerFeedbackInvite` matching that token transitions to `SUBMITTED`

#### Scenario: Response data does not include author identity

- **WHEN** any authorized reader retrieves a `EvaluationPeerFeedback` row directly
- **THEN** the row contains no field naming the author

### Requirement: Peer feedback aggregation requires minimum threshold and full resolution

The system SHALL expose `GET /evaluations/:id/peer-feedback/aggregate` returning `{ strengths: string[], weaknesses: string[], suggestions: string[], respondentCount }` only when: (a) every `PeerFeedbackInvite` for the evaluation has status `SUBMITTED`, `DECLINED`, or `EXPIRED` (no `PENDING` remain), AND (b) the number of `SUBMITTED` responses is at least 2. Below this threshold, the endpoint SHALL return `{ pending: true, respondentCount, expectedMinimum: 2 }` with no response content.

#### Scenario: Aggregate returned once threshold met

- **WHEN** 2 invitees have submitted and no invites remain PENDING
- **THEN** the endpoint returns the aggregate with `respondentCount = 2`

#### Scenario: Aggregate withheld when only 1 submitted

- **WHEN** 3 invitees were invited, 1 submitted, 1 declined, 1 expired
- **THEN** the endpoint returns `{ pending: true, respondentCount: 1, expectedMinimum: 2 }`

#### Scenario: Aggregate withheld while invites still pending

- **WHEN** 2 invitees have submitted and 1 is still PENDING
- **THEN** the endpoint returns `{ pending: true, respondentCount: 2, expectedMinimum: 2 }`

### Requirement: Peer feedback invites expire after 21 days

The system SHALL automatically transition any `PeerFeedbackInvite` still in `PENDING` after 21 days from creation to status `EXPIRED`. The expiration SHALL be performed by a background task or on-read check consistent with the project's cron infrastructure.

#### Scenario: 22-day-old pending invite is expired on next check

- **WHEN** the expiration task runs and a `PeerFeedbackInvite` was created 22 days ago with status `PENDING`
- **THEN** its status is updated to `EXPIRED`

### Requirement: Peer feedback does not block workflow

The system SHALL NOT prevent any evaluation status transition (`SELF_PENDING → SUPERVISOR1_PENDING → SUPERVISOR2_PENDING → COMPLETED → ACKNOWLEDGED`) based on peer feedback state. Peer feedback is optional supplementary information.

#### Scenario: Evaluation completes without any peer feedback

- **WHEN** all supervisor scores are filled and no peer feedback was ever invited
- **THEN** the evaluation reaches `COMPLETED` normally

#### Scenario: Evaluation completes with pending peer invites

- **WHEN** all supervisor scores are filled and 2 peer invites are still `PENDING`
- **THEN** the evaluation still reaches `COMPLETED`; the invites remain `PENDING` and may transition to `SUBMITTED` or `EXPIRED` later

### Requirement: Peer feedback aggregate access restricted

The system SHALL restrict `GET /evaluations/:id/peer-feedback/aggregate` to: the evaluation's subject employee, the subject's supervisor2, DEPARTMENT_HEAD (of the subject's department), and ADMIN. Supervisor1 SHALL NOT have access, to prevent supervisor1 from correlating peer feedback with their own rating.

#### Scenario: Employee sees their own aggregate

- **WHEN** the subject employee GETs the peer feedback aggregate for their own evaluation
- **THEN** the API returns HTTP 200 with the aggregate

#### Scenario: Supervisor1 cannot access peer feedback aggregate

- **WHEN** supervisor1 GETs the peer feedback aggregate
- **THEN** the API returns HTTP 403

