## 1. Prisma schema & migration

- [x] 1.1 Add `PositionCategory` enum (`PRODUCTION`, `OFFICE`, `MANAGEMENT`) in `backend/prisma/schema/common.prisma`
- [x] 1.2 Add `category` field on `Position` (default `OFFICE`)
- [x] 1.3 Extend `Evaluation` with `mode` (enum `EvaluationMode { QUICK, FULL }`), `commentEmployee`, `commentSup1`, `commentSup2`, `selfScorePercentage`, `sup1Percentage`, `sup2Percentage`, `appealComment`, `appealResponse`, `appealedAt`, `appealRespondedAt`, `appealResponderId` (FK → User)
- [x] 1.4 Extend `EvaluationDetail` with `notApplicable Boolean @default(false)`, `commentEmployee`, `commentSup2` (rename existing `comment` → `commentSup1`)
- [x] 1.5 Add `EvaluationEvidence` model (`id`, `evaluationDetailId` FK cascade, `uploadedByUserId`, `fileName`, `filePath`, `mimeType`, `fileSize`, `createdAt`) with `@@schema("common")`
- [x] 1.6 Add `EvaluationGoal` model (`id`, `evaluationId` FK cascade, `orderIndex`, `title`, `description`, `targetPeriod`, timestamps)
- [x] 1.7 Add `EvaluationIdpItem` model (`id`, `evaluationId` FK cascade, `orderIndex`, `skill`, `action`, `deadline`, timestamps)
- [x] 1.8 Add `EvaluationAuditAction` enum with the 12 taxonomy values from spec
- [x] 1.9 Add `EvaluationAuditLog` model (`id`, `evaluationId` FK cascade, `evaluationDetailId` FK cascade optional, `changedByUserId` nullable, `action`, `field`, `oldValue`, `newValue`, `createdAt`)
- [x] 1.10 Add `PeerInviteStatus` enum (`PENDING`, `SUBMITTED`, `DECLINED`, `EXPIRED`) and `PeerFeedbackInvite` model (`id`, `evaluationId` FK cascade, `inviteeUserId`, `invitedByUserId`, `status`, `token` unique, `createdAt`, `respondedAt`; `@@unique([evaluationId, inviteeUserId])`)
- [x] 1.11 Add `EvaluationPeerFeedback` model (`id`, `evaluationId` FK cascade, `strength`, `weakness`, `suggestion`, `createdAt`) — NO author FK
- [x] 1.12 Run `npx prisma migrate dev --name enhance_employee_evaluation` and confirm migration SQL is committed
- [x] 1.13 Write `backend/prisma/scripts/backfillPositionCategory.ts` — mapping table by `Position.code` and keyword (see design D1) → set `Position.category`; log every assignment
- [x] 1.14 Write `backend/prisma/scripts/rescaleResponsibilityWeights.ts` — add `weight_backup_before_rescale` column (via raw SQL if needed), copy weights, rescale to sum=100 with residual on largest weight, log every change
- [x] 1.15 Write `backend/prisma/scripts/backfillEvaluationPercentages.ts` — for every existing `Evaluation`, compute and persist `selfScorePercentage`, `sup1Percentage`, `sup2Percentage`
- [x] 1.16 Write `backend/prisma/scripts/backfillEvaluationMode.ts` — set `Evaluation.mode = FULL` for all existing rows
- [x] 1.17 Write `backend/prisma/scripts/verifyEnhanceEmployeeEvaluation.ts` — post-migration verify: category populated everywhere, weight sum = 100 for every position, percentages non-null on every evaluation, no `EvaluationDetail.comment` column remains ← (verify: run all four backfill scripts + verify script end-to-end on a dev DB snapshot; every position category assigned, every position responsibility weight sum exactly 100, every existing evaluation has non-null percentages and `mode = FULL`)

## 2. Backend — shared utilities

- [x] 2.1 Create `backend/src/utils/payroll.ts` exporting `computeKpiDeduction(kpiBonus, sup2Percentage)` (extracted from current `payrollService.ts` inline logic)
- [x] 2.2 Refactor `backend/src/services/payrollService.ts` to import `computeKpiDeduction` from `@utils/payroll` (KEEP behavior identical; do NOT change the formula)
- [x] 2.3 Add unit test `backend/src/__tests__/utils/payroll.test.ts` with a parameter grid asserting the shared helper matches the legacy formula for `sup2Percentage ∈ {0, 25, 50, 75, 100}` and `kpiBonus ∈ {0, 1_000_000, 5_000_000}` ← (verify: shared helper produces identical numbers to legacy formula for every grid point)

## 3. Backend — audit log service

- [x] 3.1 Create `backend/src/services/evaluationAuditService.ts` with `logChange(tx, { evaluationId, evaluationDetailId?, changedByUserId?, action, field, oldValue, newValue })` — accepts a Prisma transaction client, always writes inside the caller's transaction
- [x] 3.2 Add helper `logStatusTransition(tx, evaluationId, oldStatus, newStatus, userId)` wrapping `logChange`
- [x] 3.3 Add helper `logScoreUpdate(tx, detail, field, oldValue, newValue, userId)` wrapping `logChange`
- [x] 3.4 Add reader method `getAuditLog(evaluationId, userId)` with RBAC: ADMIN all; DEPARTMENT_HEAD own department; others → throw `Access denied`; return rows sorted newest first
- [x] 3.5 Add unit test `backend/src/__tests__/evaluationAuditService.test.ts` covering: write inside transaction rolls back with parent, RBAC rejection for TEAM_LEAD/EMPLOYEE, DEPARTMENT_HEAD scope enforcement ← (verify: audit rows are transactional with live changes; RBAC filters correctly for all four roles)

## 4. Backend — position responsibility weight validation

- [x] 4.1 Refactor `positionResponsibilityService.createResponsibility` to run inside `prisma.$transaction` and throw `ValidationError` if post-write sum(weight) for `positionId` differs from 100 by more than 0.001
- [x] 4.2 Refactor `updateResponsibility` with the same invariant check
- [x] 4.3 Refactor `deleteResponsibility` with the same invariant check
- [x] 4.4 Add unit tests in `backend/src/__tests__/positionResponsibilityService.test.ts` covering: create rejects when sum > 100 or < 100; update rejects; delete rejects when remaining sum ≠ 100 and other responsibilities exist ← (verify: all three write methods enforce sum=100 hard block with clear Vietnamese error messages)

## 5. Backend — position category management

- [x] 5.1 Extend `positionService` (or equivalent) to accept `category` on create/update and validate against `PositionCategory` enum
- [x] 5.2 Add controller/route surface for updating `Position.category` (via existing Position admin routes)
- [x] 5.3 Add `POST /positions/:positionId/responsibilities/copy-from/:sourcePositionId` route + controller + service method with the ConflictError-on-non-empty behavior (see spec)

## 6. Backend — employee evaluation service refactor

- [x] 6.1 Refactor `createOrUpdateEvaluation` and `createBulkEvaluations` to set `Evaluation.mode` from `Position.category` at creation time
- [x] 6.2 Refactor `computeWeightedScoreForField` and `computeWeightedScore` to skip details where `notApplicable === true`
- [x] 6.3 Update the `updateEvaluationDetail` service method to persist `selfScorePercentage` / `sup1Percentage` / `sup2Percentage` on the parent `Evaluation` inside the same transaction that promotes status
- [x] 6.4 Fix the buggy comment-save condition at line 512 — remove the `data.supervisorScore1 !== undefined || data.supervisorScore2 !== undefined` guard; instead accept `commentEmployee`, `commentSup1`, `commentSup2` distinctly with role+status authorization
- [x] 6.5 Add role+status matrix guard for comment writes at both evaluation and detail level (see spec table): employee/SELF_PENDING → commentEmployee; sup1/SUPERVISOR1_PENDING → commentSup1; sup2/SUPERVISOR2_PENDING → commentSup2; ADMIN → any
- [x] 6.6 Add N/A toggle endpoint logic in service: `toggleNotApplicable(detailId, notApplicable, userId)` — employee only during SELF_PENDING, supervisor of the matching layer any time in their status, ADMIN always
- [x] 6.7 Implement `getEvaluationDetails` BS1 masking (see spec + design D11): mask `selfScore` for sup1 in `SUPERVISOR1_PENDING` before first save; mask `supervisorScore1` for sup2 in `SUPERVISOR2_PENDING` before first save; include `masked` field in response
- [x] 6.8 Replicate BS1 masking in `getSubordinatesForEvaluation` and `getEmployeeEvaluations` (return `null` for the masked aggregate percentage) ← (verify: masked field present in single + list responses; unmasks after first score save; employee and ADMIN never see masking)
- [x] 6.9 Implement `getPayrollImpactPreview(evaluationId, userId)` returning `{ kpiBonus, currentSup2Percentage, projectedDeduction, projectedNet, isFinalized }` using `computeKpiDeduction` from `@utils/payroll`
- [x] 6.10 Implement `submitAppeal(evaluationId, appealComment, userId)` with 7-day window guard, one-shot check, status remains `ACKNOWLEDGED`, audit log, notify supervisor2 + ADMIN inside try/catch
- [x] 6.11 Implement `replyAppeal(evaluationId, appealResponse, userId)` — ADMIN/DEPT_HEAD/supervisor2 only, requires `appealComment IS NOT NULL`, audit log, notify employee
- [x] 6.12 Implement `getCalibrationHeatmap(month, year, userId)` returning `{ supervisors, departmentBenchmarks, trend, inflationAlerts }` (see spec BS3); enforce ADMIN/DEPT_HEAD access with department scope for DEPT_HEAD
- [x] 6.13 Implement `copyFromPreviousMonth(evaluationId, userId)` — Quick-mode helper that pre-fills self-scores from prior period; returns `{ copied, skipped }`
- [x] 6.14 Implement goal CRUD service methods: `createGoal`, `updateGoal`, `deleteGoal`, `listGoals` with 3-per-evaluation cap and role/status guard
- [x] 6.15 Implement IDP item CRUD service methods with same 3-per-evaluation cap
- [x] 6.16 Implement evidence CRUD service methods: `uploadEvidence`, `deleteEvidence`, `listEvidence` with 5-per-detail cap, MIME/size validation, immutability after COMPLETED
- [x] 6.17 Extend `finalizeEvaluation` and the sup2 transition path to enforce Full-mode goal/IDP guardrail (400 if empty and no override, ADMIN bypasses)
- [x] 6.18 Ensure every score/comment/status/appeal/N/A/goal/IDP/evidence write in this service calls the audit helper inside the same transaction

## 7. Backend — peer feedback service

- [x] 7.1 Create `backend/src/services/evaluationPeerFeedbackService.ts`
- [x] 7.2 Implement `invitePeers(evaluationId, inviteeUserIds[], invitedByUserId)` with role gate (target role ∈ TEAM_LEAD/DEPT_HEAD/ADMIN), same-subDepartment check, 2-3 count, opaque token generation, audit log `PEER_INVITE`
- [x] 7.3 Implement `submitPeerFeedback(token, { strength, weakness, suggestion }, callerUserId)` — validate token → invite matches PENDING, create anonymous `EvaluationPeerFeedback` row, transition invite to `SUBMITTED` inside single transaction, audit log `PEER_SUBMIT` with `changedByUserId = null` for anonymity
- [x] 7.4 Implement `declineInvite(token)` transition to `DECLINED`
- [x] 7.5 Implement `expirePendingInvites()` sweep — invites older than 21 days with status `PENDING` → `EXPIRED`; wired into the daily cron
- [x] 7.6 Implement `getPeerAggregate(evaluationId, userId)` with access matrix (subject / sup2 / DEPT_HEAD / ADMIN; sup1 denied) and threshold check (no PENDING remain AND submittedCount ≥ 2)
- [x] 7.7 Add unit tests `backend/src/__tests__/evaluationPeerFeedbackService.test.ts`: role gating, aggregation threshold, anonymity (peer feedback rows never carry author FK), sup1 access denied ← (verify: all four privacy/access rules from the spec hold; aggregate correctly withholds until threshold)

## 8. Backend — controllers, routes, and ROUTE_MAP

- [x] 8.1 Extend `employeeEvaluationController` with methods: `updateEvaluationComment`, `toggleNotApplicable`, `uploadEvidence`, `deleteEvidence`, `listEvidence`, `submitAppeal`, `replyAppeal`, `getAuditLog`, `getCalibrationHeatmap`, `getPayrollPreview`, `copyFromPreviousMonth`, `getPdf`, goal CRUD handlers, IDP CRUD handlers, peer invite / submit / decline / aggregate handlers
- [x] 8.2 Register new routes in `backend/src/routes/employeeEvaluationRoutes.ts` with correct `authenticate` + `authorize` middleware per spec
- [x] 8.3 Route: `POST /evaluations/:id/appeal` (EMPLOYEE, sanity check own-evaluation in service)
- [x] 8.4 Route: `POST /evaluations/:id/appeal/reply` (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD supervisor-check in service)
- [x] 8.5 Route: `GET /evaluations/:id/audit-log` (ADMIN, DEPARTMENT_HEAD)
- [x] 8.6 Route: `GET /evaluations/:id/payroll-preview` (all authenticated, scope in service)
- [x] 8.7 Route: `GET /evaluations/:id/pdf` (all authenticated + rate-limit)
- [x] 8.8 Route: `GET /calibration/heatmap` (ADMIN, DEPARTMENT_HEAD)
- [x] 8.9 Route: `POST /evaluations/:id/copy-previous-month` (EMPLOYEE)
- [x] 8.10 Route: goals + IDP CRUD (`POST/PATCH/DELETE /evaluations/:id/goals[/:goalId]`, similarly for IDP)
- [x] 8.11 Route: evidence upload/delete/list (multipart upload; wire multer or existing upload middleware)
- [x] 8.12 Route: peer feedback (`POST /evaluations/:id/peer-feedback/invite`, `POST /peer-feedback/submit/:token`, `POST /peer-feedback/decline/:token`, `GET /evaluations/:id/peer-feedback/aggregate`)
- [x] 8.13 Route: N/A toggle (`PATCH /evaluations/details/:detailId/na`)
- [x] 8.14 Route: comment update at eval level (`PATCH /evaluations/:id/comment` with body `{ role: 'employee'|'sup1'|'sup2', comment }`)
- [x] 8.15 Route: position responsibility copy-from (`POST /positions/:positionId/responsibilities/copy-from/:sourceId`)
- [x] 8.16 Add all new routes to `backend/src/routes/index.ts` `ROUTE_MAP` ← (verify: every new route appears in server startup logs when backend boots; hit each with a smoke request and confirm expected status codes)

## 9. Backend — cron jobs

- [x] 9.1 Check `backend/package.json` for existing cron/scheduler; add `node-cron` (pinned exact version) if absent
- [x] 9.2 Create `backend/src/cron/evaluationCron.ts` with three jobs (`evaluationReminderD7`, `evaluationReminderD3`, `evaluationDailySync`) each wrapped in `pg_try_advisory_lock`
- [x] 9.3 Add `evaluationPeerInviteExpiry` job in the same file — runs 03:00 daily, calls `evaluationPeerFeedbackService.expirePendingInvites()`
- [x] 9.4 Wire the cron init into the backend bootstrap (`src/index.ts` or wherever startup lives), respecting the existing pattern for other scheduled work if any
- [x] 9.5 Add `NotificationEvent.EVALUATION_REMINDER_SELF_PENDING` and `EVALUATION_REMINDER_SUPERVISOR_PENDING` to the notification event enum; add templates in Vietnamese ← (verify: cron jobs fire on schedule in a manual test by shifting system clock or by manual trigger endpoint; advisory lock prevents duplicate runs; new notification templates render correctly in Vietnamese)

## 10. Backend — TypeScript types & error contract

- [x] 10.1 Update `backend/src/types/index.ts` (or the evaluation-specific type module) with new enums, request/response DTOs for every new endpoint
- [x] 10.2 Update notification types with the new reminder events
- [x] 10.3 Add validation schemas in `backend/src/schemas/` for every new request body using existing pattern (Zod if the project uses it, otherwise the local shape)

## 11. Backend — tests

- [x] 11.1 Extend `backend/src/__tests__/employeeEvaluationService.test.ts` with weight validation, N/A math, comment fix (employee can save), BS1 masking, appeal window, calibration inflation detection, payroll preview correctness
- [x] 11.2 Add `backend/src/__tests__/employeeEvaluationController.test.ts` covering RBAC on new endpoints
- [x] 11.3 Add `backend/src/__tests__/evaluationEvidence.test.ts` covering MIME/size validation and post-completion immutability
- [x] 11.4 Add `backend/src/__tests__/evaluationPdf.test.ts` covering successful stream, rate-limit behavior, Full vs Quick sections
- [x] 11.5 Add `backend/src/__tests__/evaluationCron.test.ts` covering advisory-lock behavior and D-7/D-3 selection logic (mock date)
- [x] 11.6 Run full backend test suite: `cd backend && npm test` ← (verify: all tests pass; coverage report shows every new service method exercised)

## 12. Frontend — service & hooks

- [x] 12.1 Extend `frontend/src/services/employeeEvaluationService.ts` with types for `Evaluation.mode`, `EvaluationDetail.notApplicable`, `masked`, comments, goals, IDP, evidence, appeal, peer feedback, calibration heatmap, payroll preview
- [x] 12.2 Add API client wrappers for every new endpoint
- [x] 12.3 Extend `frontend/src/hooks/useEmployeeEvaluation.ts` with new query keys and mutations (matching existing factory pattern); ensure invalidations touch the right list keys after mutations
- [x] 12.4 Add hook `usePeerFeedback`, `useCalibrationHeatmap`, `useEvaluationAuditLog`, `usePayrollPreview` if scope-appropriate

## 13. Frontend — refactor existing components

- [x] 13.1 `EmployeeSelfEvaluationModal.tsx` — split render into Quick-mode and Full-mode branches based on `evaluation.mode`
- [x] 13.2 Quick-mode UI: single-screen inline table; add "Copy điểm tháng trước" button wired to `copyFromPreviousMonth`; one overall `commentEmployee` textarea
- [x] 13.3 Full-mode UI: tabbed layout — Đánh giá / Mục tiêu / Kế hoạch phát triển / Bằng chứng / Ảnh hưởng lương
- [x] 13.4 Add BS1 masked placeholder rendering when API returns `masked` field ("🔒 Sẽ hiện sau khi bạn chấm 1 tiêu chí đầu tiên")
- [x] 13.5 Add per-detail comment inputs for the caller's role slot (employee/sup1/sup2 depending on status)
- [x] 13.6 Add N/A toggle affordance per detail row for the role/status combinations allowed by spec
- [x] 13.7 `SubordinateEvaluationList.tsx` — add mode badge (Quick/Full) per subordinate; add bulk "quick score" affordance for Quick-mode subordinates; render BS1 masked aggregates as `–` with tooltip
- [x] 13.8 `EmployeeEvaluationManagement.tsx` — add tab "Phân bố điểm" hosting `CalibrationDashboard`; add PDF export action button per row; surface inflation alert banner when present

## 14. Frontend — new components

- [x] 14.1 `GoalsForm.tsx` — up to 3 goals; react-hook-form + zod; Vietnamese labels
- [x] 14.2 `IDPForm.tsx` — up to 3 items with `skill`, `action`, `deadline`; deadline picker
- [x] 14.3 `EvidenceUpload.tsx` — drop zone with 5 MB / MIME check client-side (mirroring server), up to 5 files per detail
- [x] 14.4 `EvaluationAppealForm.tsx` — countdown badge for 7-day window; disabled once submitted; reply block for managers
- [x] 14.5 `PayrollImpactPanel.tsx` — displays kpiBonus / current sup2 / projected deduction / projected net with formatted VND; disclaimer that value is provisional until `isFinalized = true`
- [x] 14.6 `PeerFeedbackForm.tsx` — invite view (subordinates in same subDepartment picker, 2-3 selection cap), submit view (token-based deep link, 3 textareas), aggregate view (list under Strengths / Weaknesses / Suggestions)
- [x] 14.7 `CalibrationDashboard.tsx` — supervisor × score heatmap, 12-period trend chart (reuse existing chart lib), inflation alerts list
- [x] 14.8 `EvaluationPdfPreview.tsx` — optional in-app preview before download; button triggers `GET /evaluations/:id/pdf` and streams to browser download

## 15. Frontend — routing & permissions

- [x] 15.1 Add route `/dashboard/evaluation-calibration` mounted for `ADMIN` and `DEPARTMENT_HEAD` in the router
- [x] 15.2 Add navigation entry for calibration dashboard under the evaluation section
- [x] 15.3 Ensure existing calibration/inflation views are gated by `useAuth().user.role` check

## 16. Frontend — verification

- [x] 16.1 Run `cd frontend && npx tsc --noEmit` — must pass with zero errors
- [x] 16.2 Run `cd frontend && npm run lint` — must pass
- [x] 16.3 Manual smoke: start dev server, log in as EMPLOYEE, do quick self-evaluation flow; log in as TEAM_LEAD, verify BS1 masking; log in as DEPT_HEAD, view calibration dashboard with inflation alerts; log in as ADMIN, run bulk create + PDF export ← (verify: happy path works for every persona; masked→unmasked transition observable in devtools network tab; PDF opens and shows Vietnamese labels)

## 17. Backend — verification

- [x] 17.1 Run `cd backend && npx tsc --noEmit` — must pass
- [x] 17.2 Run `cd backend && npm run lint` — must pass
- [x] 17.3 Run `cd backend && npm test` — must pass all tests
- [ ] 17.4 Run migration on a clean dev DB copy: `cd backend && npx prisma migrate reset && npx prisma migrate dev` — must succeed without errors ← (verify: end-to-end backend passes type-check, lint, tests; migration + backfill runs clean on fresh DB)

## 18. Change management

- [x] 18.1 Run `openspec validate enhance-employee-evaluation` — must pass
- [x] 18.2 Run `gitnexus_detect_changes()` before commit — confirm scope matches expected files only
- [x] 18.3 Update AGENTS.md high-risk table with `employeeEvaluationService.ts` entry mentioning masking + N/A + audit invariants (if not already covered)
- [x] 18.4 Post-merge: schedule follow-up change for BS4 Skill Matrix as noted in the user's memory file `project_evaluation_bs4_skill_matrix.md`
