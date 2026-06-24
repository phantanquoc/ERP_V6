# Proposal: Redesign Fault Records Tab

## Why

The current "Danh sách lỗi" (Fault Records) tab in the Cơ điện section has three structural gaps that block daily operations:

1. **Production operators cannot self-report faults.** Every endpoint on `faultRecordRoutes.ts` is gated behind `requireTechnicalAccess(MECHANICAL)`, so a line operator who spots a defect must wait for a technical staff member to log it. This delay loses observation context (who saw it, when, under what condition) and discourages reporting altogether.
2. **Recurrence is invisible at creation time.** When a user creates a fault from a `FaultTemplate`, nothing surfaces that the same template has already fired N times against the same `MachineSystemDetail`. Recurring faults are the strongest signal for upgrading from "Đang theo dõi" to "Tái phát" or escalating to a maintenance plan, but today they are buried in a flat list.
3. **No aggregate visibility.** The list view shows individual records only. There is no answer to "which machines fail most this quarter?" or "which template+device combinations recur?" without exporting and pivoting in Excel.

These gaps directly contradict the user's operational request: production staff must be able to log faults without technical-team help, recurring faults must be flagged at creation, and the system must summarise machine fault patterns.

## What Changes

- **Open fault GET/POST to production users** — Split route middleware in `faultRecordRoutes.ts`: list and create become accessible to authenticated users in the production departments; update and delete remain technical-only via `requireTechnicalAccess(MECHANICAL)`. Template management (`faultTemplateRoutes.ts`) stays technical-only.
- **Add recurrence check** — New service method `faultRecordService.checkRecurrence(faultTemplateId, machineSystemDetailId)` returns count plus 5 most recent records. New controller + route `GET /api/fault-records/recurrence?faultTemplateId=&machineSystemDetailId=`. Frontend create flow calls this endpoint when a template is selected and shows "Lỗi này đã xảy ra N lần trước đó" with links to past records.
- **Add stats aggregation** — New service method `faultRecordService.getStats()` returns totals, breakdowns by `mucDo` (Nghiêm trọng / Trung bình / Nhẹ), breakdowns by `trangThai` (Đang theo dõi / Đã xử lý / Tái phát), top 5 machines by fault count, and top 5 recurring template+device combos. New endpoint `GET /api/fault-records/stats`.
- **Redesign FaultRecordList UI** — Add summary card row at top (4 cards: total + 3 status counts, with severity stacked inside). Add two collapsible sections below cards: "Máy hay lỗi nhất" (top 5) and "Lỗi hay tái phát" (top 5). Update `canWrite` rule so production users can create, but only technical+admin can edit/delete. The recurrence warning surfaces inline in the create modal.
- **No schema change** — Recurrence pivots on the existing `faultTemplateId` + `machineSystemDetailId` columns; stats aggregates over current `FaultRecord` columns.

**BREAKING**: Production users gain write access to the create endpoint. This is intentional and is the central goal of decision 1.C. No existing technical-team behaviour is removed.

## Capabilities

### New Capabilities

- **fault-records** — Covers fault record CRUD with split write authorisation (create open to production, mutate restricted to technical), template-driven recurrence detection at creation time, and aggregate statistics for fleet-wide fault visibility.

### Modified Capabilities

None.

## Impact

- **Affected code (backend)**:
  - `backend/src/routes/faultRecordRoutes.ts` — split middleware per HTTP method
  - `backend/src/services/faultRecordService.ts` — add `checkRecurrence`, `getStats`
  - `backend/src/controllers/faultRecordController.ts` — add recurrence + stats handlers
- **Affected code (frontend)**:
  - `frontend/src/services/faultRecordService.ts` — add stats + recurrence types and API methods
  - `frontend/src/hooks/useFaultRecords.ts` — add `useFaultRecordStats`, `useFaultRecurrence`
  - `frontend/src/components/FaultRecordList.tsx` — summary cards, collapsible sections, updated `canWrite`, recurrence warning in create modal
- **Affected specs**: New `fault-records` capability spec.
- **Database / migrations**: None. All work uses existing columns.
- **Verification**:
  - `cd backend && npx tsc --noEmit`
  - `cd frontend && npx tsc --noEmit`
  - `cd backend && npm run lint`
- **Risk**: Authorisation widening on POST is the highest-risk change. Mitigation: keep `authenticate` middleware, only relax department-scope check for GET/POST. Stats endpoint is read-only with no PII exposure beyond what GET list already exposes.
