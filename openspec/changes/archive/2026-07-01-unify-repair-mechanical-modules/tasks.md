## 1. Prisma schema and migrations

- [x] 1.1 Add `faultRecordId String? @db.VarChar(30)` to `RepairRequestItem` in `backend/prisma/schema/common.prisma` with `@@index([faultRecordId])` and relation `faultRecord FaultRecord? @relation(fields: [faultRecordId], references: [id], onDelete: SetNull, onUpdate: Cascade)`. Add reverse relation `repairRequestItems RepairRequestItem[]` on `FaultRecord`.
- [x] 1.2 Run `npx prisma migrate dev --name link_fault_record_to_repair_request_item` from `backend/` and verify the generated migration matches Migration 1 in design.md.
- [x] 1.3 Add Prisma enum `FaultRecordStatus { DANG_THEO_DOI DA_XU_LY TAI_PHAT }` (schema `common`) and change `FaultRecord.trangThai` from `String` to `FaultRecordStatus @default(DANG_THEO_DOI)`.
- [x] 1.4 Add Prisma model `FaultRecordStatusLog` (schema `common`, id CUID, `faultRecordId` FK cascade, `oldStatus FaultRecordStatus?`, `newStatus FaultRecordStatus`, `actorId String?`, `reason String?`, `source String @default("manual")`, `createdAt DateTime @default(now())`, index on `(faultRecordId, createdAt(sort: Desc))`). Add reverse relation `statusLogs FaultRecordStatusLog[]` on `FaultRecord`.
- [x] 1.5 Run `npx prisma migrate dev --name enum_fault_record_status`. Edit the generated migration SQL to include the temp-column + data-migration + legacy-fallback-log-inserts steps from design.md (steps 3-6).
- [x] 1.6 Run `npx prisma generate` and confirm `FaultRecordStatus` is exported from the Prisma client. ← (verify: schema matches design.md D1+D2 shape, both migrations apply cleanly on a copy of dev DB, `SELECT DISTINCT trangThai FROM common."FaultRecord"` returns only enum values after migration)

## 2. Backend status transition helper and types

- [x] 2.1 In `backend/src/utils/statusTransitions.ts`, export `advanceFaultRecordStatus(current: FaultRecordStatus, next: FaultRecordStatus, opts?: { bypass?: boolean }): FaultRecordStatus`. Allowed transitions: no-op, `DANG_THEO_DOI→DA_XU_LY`, `DA_XU_LY→TAI_PHAT`, `TAI_PHAT→DA_XU_LY`. All others throw `ValidationError` with a Vietnamese message. Bypass returns `next` unchanged.
- [x] 2.2 Add Jest tests for `advanceFaultRecordStatus` in `backend/src/__tests__/statusTransitions.test.ts` covering all 6 scenarios from `specs/status-transitions/spec.md`. ← (verify: `cd backend && npx jest src/__tests__/statusTransitions.test.ts --runInBand` passes with all 6 scenarios green)

## 3. Backend FaultRecord service

- [x] 3.1 In `backend/src/services/faultRecordService.ts`, remove `trangThai` from the allowed body fields of `updateFaultRecord`. If `trangThai` is present in the body, log a warning (`console.warn` with the record id) and drop it silently.
- [x] 3.2 Add `faultRecordService.markResolved(id, actorId, reason?)`: fetches record, calls `advanceFaultRecordStatus(current, 'DA_XU_LY')`, inside a `prisma.$transaction` updates `trangThai` and `ngayXuLy = now()`, inserts `FaultRecordStatusLog` row with `source: 'manual'`. Send notification (wrapped in try/catch).
- [x] 3.3 Add `faultRecordService.markResolvedFromRepair(id, repairRequestId, actorId)`: same as markResolved but with `source: 'auto_from_repair'` and `reason` referencing the `maYeuCau` of the parent RepairRequest. If record is already at `DA_XU_LY`, no-op (return silently). Guard: never throw — errors are logged, not raised (called from within another transaction that must not roll back).
- [x] 3.4 Add `faultRecordService.markRecurred(id, actorId, opts: { auto?: boolean, reason?: string })`: fetches record, calls `advanceFaultRecordStatus(current, 'TAI_PHAT')`, updates `trangThai`, clears `ngayXuLy = null`, inserts log row with `source: opts.auto ? 'recurrence_detected_manual_confirm' : 'manual'`. Send notification.
- [x] 3.5 Add `faultRecordService.getStatusHistory(id, opts?: { page?, limit? })` returning paginated `FaultRecordStatusLog` rows ordered by `createdAt DESC`, with joined `actor` (name only).
- [x] 3.6 Add `faultRecordService.getForTypeahead(filters: { trangThai?: FaultRecordStatus[], search?, limit? })` returning up to 20 records matching `trangThai IN (…)` and fuzzy match on `maSuCo`/`tenLoi`. Default limit 10.
- [x] 3.7 Add `faultRecordService.detectRecurrenceOnCreate(newRecord, actorId)`: when a new FaultRecord is created, look for prior `FaultRecord` with same `machineSystemDetailId` + `loaiLoi` at `DA_XU_LY` in last 90 days. If found, insert a `FaultRecordStatusLog` row on the OLD record with `source: 'recurrence_detected'`, `reason` referencing the new `maSuCo`. Do NOT change the old record's status. Wrap in try/catch — never bubble.
- [x] 3.8 Wire `detectRecurrenceOnCreate` into the existing `createFaultRecord` flow (after successful commit).
- [x] 3.9 Add Jest tests in `backend/src/__tests__/faultRecordService.test.ts` covering: markResolved happy path, markResolved rejects skip-step (DANG_THEO_DOI→TAI_PHAT), markResolvedFromRepair swallows errors, markRecurred clears ngayXuLy, detectRecurrenceOnCreate log-only. ← (verify: all service scenarios in `specs/fault-record-lifecycle/spec.md` covered by at least one test; `cd backend && npx jest src/__tests__/faultRecordService.test.ts --runInBand` passes)

## 4. Backend FaultRecord controller and routes

- [x] 4.1 In `backend/src/controllers/faultRecordController.ts`, add `markResolved`, `markRecurred`, `getStatusHistory`, and `getForTypeahead` handlers. Each does HTTP-only parsing and delegates to the service. Response shape `{ success, data, message }`.
- [x] 4.2 Ensure the existing `updateFaultRecord` controller passes the body to the service unchanged — the service is now responsible for dropping `trangThai`.
- [x] 4.3 In `backend/src/routes/faultRecordRoutes.ts`, register:
  - `POST /:id/mark-resolved` — `checkAccess({ allowedRoles: ['ADMIN','DEPARTMENT_HEAD','TEAM_LEAD'], checkDepartment: 'technical', checkSubDepartment: 'mechanical' })`
  - `POST /:id/mark-recurred` — `checkAccess({ allowedRoles: ['ADMIN','DEPARTMENT_HEAD'], checkDepartment: 'technical', checkSubDepartment: 'mechanical' })`
  - `GET /:id/status-history` — `authenticate` only
  - Update the existing list `GET /` to accept `trangThai` (comma-separated) filter for the typeahead scenario.
- [x] 4.4 Verify the route is registered in `backend/src/routes/index.ts` ROUTE_MAP.
- [x] 4.5 Add supertest integration tests in `backend/src/__tests__/faultRecordRoutes.test.ts` covering role gating for both mark-resolved and mark-recurred, and PUT rejecting trangThai in body. ← (verify: unauthorized roles get 403; PUT with `trangThai` returns 200 but does not change status; `cd backend && npx jest src/__tests__/faultRecordRoutes.test.ts --runInBand` passes)

## 5. Backend RepairRequest cascade

- [x] 5.1 In `backend/src/services/repairRequestService.ts` (or `acceptanceHandoverService.ts` where the auto-complete branch lives), inside the transaction that transitions `RepairRequest` to `HOAN_THANH`, add: fetch `RepairRequestItem[]` where `repairRequestId = X` and `faultRecordId IS NOT NULL`.
- [x] 5.2 For each linked FaultRecord, call `faultRecordService.markResolvedFromRepair(faultRecordId, repairRequestId, actorId)` inside a try/catch. Failures log with `console.error` and continue.
- [x] 5.3 Ensure the cascade runs inside the same `prisma.$transaction` block as the RepairRequest status update (per D2 in design.md).
- [x] 5.4 In `backend/src/services/repairRequestService.ts`, allow `createRepairRequest` and `updateRepairRequest` to accept and persist `items[].faultRecordId`. Validate that the referenced FaultRecord exists and is in `DANG_THEO_DOI` or `TAI_PHAT` (reject with `ValidationError` otherwise).
- [x] 5.5 Add Jest tests in `backend/src/__tests__/repairRequestCascade.test.ts` for: one-linked auto-close, non-linked no-op, already-DA_XU_LY skip, cascade failure does not roll back parent. ← (verify: all 3 scenarios in `specs/repair-request-lifecycle/spec.md` for cascade pass; `cd backend && npx jest src/__tests__/repairRequestCascade.test.ts --runInBand` passes)

## 6. Backend RepairRequest stats endpoint

- [x] 6.1 Add `repairRequestService.getStats(filters: { dateFrom?, dateTo?, machineSystemId? })` returning the shape defined in `specs/repair-request-analytics/spec.md`. Default window `[now-90d, now]` when filters omitted.
- [x] 6.2 Implement `total`, `byStatus` (counts per enum value), `avgCompletionHours` (mean of `completedAt - createdAt` in hours over `HOAN_THANH` rows, null when empty), `delta` (same shape for preceding equal-length window).
- [x] 6.3 Implement `topMachines` (groupBy `machineSystemId` on joined items, top 5 by count), `recurringItems` (groupBy `machineSystemDetailId` where count > 2 in 180-day trailing window, top 10 with `latestMaYeuCau`), `monthlyTrend` (12 buckets ending at window end, oldest-first), `recentlyCreated` (10 latest rows in CHO_XU_LY or DANG_SUA_CHUA).
- [x] 6.4 Add controller `getStats` in `backend/src/controllers/repairRequestController.ts` — parses ISO date query params, delegates to service.
- [x] 6.5 Register `GET /api/repair-requests/stats` in `backend/src/routes/repairRequestRoutes.ts` with same auth policy as `GET /api/repair-requests` (any authenticated user).
- [x] 6.6 Add Jest tests in `backend/src/__tests__/repairRequestStats.test.ts` covering: default 90-day window, explicit date range, machineSystemId filter, avgCompletionHours null when no completed rows, recurring threshold >2, monthly trend 12 buckets. ← (verify: all 6 scenarios in `specs/repair-request-analytics/spec.md` for getStats covered; `cd backend && npx jest src/__tests__/repairRequestStats.test.ts --runInBand` passes)

## 7. Frontend shared primitives

- [x] 7.1 Create `frontend/src/components/shared/StatusBadge.tsx` with props `{ label, tone: 'green'|'blue'|'yellow'|'red'|'gray', size?: 'sm'|'md' }`. Tone → Tailwind classes matching the existing FaultRecordList color palette.
- [x] 7.2 Create `frontend/src/components/shared/SeverityBadge.tsx` mapping `'Nghiêm trọng'|'Trung bình'|'Nhẹ'` to red/yellow/gray tones. Reuse `StatusBadge` internally.
- [x] 7.3 Create `frontend/src/components/shared/PriorityBadge.tsx` mapping `'Cao'|'Trung bình'|'Thấp'` to red/yellow/blue tones. Reuse `StatusBadge` internally.
- [x] 7.4 Create `frontend/src/components/shared/CollapsibleSection.tsx` extracted from `FaultRecordList.tsx`. Props: `{ title, icon?, defaultOpen?, children, rightAdornment? }`. Chevron animation on click.
- [x] 7.5 Create `frontend/src/components/shared/StatCard.tsx` extracted from `FaultRecordList.tsx`. Props: `{ label, value, delta?, deltaLabel?, subCounts?, icon?, onClick? }`. Renders delta arrow up/down/flat, subCounts row.
- [x] 7.6 Create `frontend/src/components/shared/index.ts` barrel exporting all 5 primitives.
- [x] 7.7 Run `cd frontend && npx tsc --noEmit`. ← (verify: all 5 primitives export cleanly, no TS errors, storybook-style smoke by importing all 5 in a scratch file if available)

## 8. Frontend FaultRecordList refactor

- [x] 8.1 Update `frontend/src/services/faultRecordService.ts` types: `trangThai: 'DANG_THEO_DOI' | 'DA_XU_LY' | 'TAI_PHAT'` (union). Add `markResolved`, `markRecurred`, `getStatusHistory`, `getForTypeahead` API functions.
- [x] 8.2 Update `frontend/src/hooks/useFaultRecords.ts` to add `useMarkResolved`, `useMarkRecurred`, `useFaultRecordStatusHistory` mutation/query hooks with proper query key factory usage and invalidation.
- [x] 8.3 In `frontend/src/components/FaultRecordList.tsx`, replace inline badge helpers with `StatusBadge`, `SeverityBadge`, `PriorityBadge` from `@/components/shared`. Remove local badge helper functions.
- [x] 8.4 Replace inline stat cards in `FaultRecordList.tsx` with `StatCard` from `@/components/shared`. Preserve exact same labels, values, and subCounts.
- [x] 8.5 Replace inline collapsibles with `CollapsibleSection`. Preserve exact same section titles, icons, and default-open state.
- [x] 8.6 Change `trangThai` from a free-form `<select>` in create/edit form to readonly display. Remove the field from the create/edit form entirely; the server defaults new records to `DANG_THEO_DOI`.
- [x] 8.7 Add row action buttons "Đánh dấu đã xử lý" (visible when `trangThai !== 'DA_XU_LY'`, role ADMIN/DEPT_HEAD/TEAM_LEAD) and "Đánh dấu tái phát" (visible only when `trangThai === 'DA_XU_LY'`, role ADMIN/DEPT_HEAD). Both use `ResponsiveRowActions`.
- [x] 8.8 Map enum → Vietnamese label for display: `DANG_THEO_DOI → 'Đang theo dõi'`, `DA_XU_LY → 'Đã xử lý'`, `TAI_PHAT → 'Tái phát'`. Map enum → tone: `DANG_THEO_DOI → 'yellow'`, `DA_XU_LY → 'green'`, `TAI_PHAT → 'red'`. ← (verify: FaultRecordList renders identically to before pixel-wise on all three status states; row actions gate correctly by role; `cd frontend && npx tsc --noEmit` passes)

## 9. Frontend RepairRequestList dashboard

- [x] 9.1 Update `frontend/src/services/repairRequestService.ts` to add `getStats(filters)` API function matching backend response shape.
- [x] 9.2 In `frontend/src/hooks/useRepairRequests.ts` add `useRepairRequestStats(filters?)` TanStack Query hook with `repairRequestKeys.stats(filters)` factory entry. `staleTime: 60_000`.
- [x] 9.3 In `frontend/src/components/RepairRequestList.tsx`, above the existing search + table, render:
  - Date-range control (default last 90 days)
  - 4 `StatCard` primitives (Tổng / Chờ xử lý / Đang sửa / Hoàn thành) with delta arrows
  - 4 `CollapsibleSection` primitives (Máy hay yêu cầu sửa chữa nhất / Yêu cầu tái phát / Xu hướng theo tháng / Mới phát sinh)
- [x] 9.4 Wire stat card `onClick` to filter the list below by the corresponding status and scroll to it.
- [x] 9.5 Wire "Mới phát sinh" rows to open the RepairRequest detail modal on click.
- [x] 9.6 Show skeleton placeholders while `useRepairRequestStats` is loading; show compact error banner if the query fails.
- [x] 9.7 Replace any remaining inline badges/collapsibles/stat cards in `RepairRequestList.tsx` with the shared primitives from `@/components/shared`. ← (verify: dashboard renders correctly with real data, stat card clicks filter list, all 4 collapsible sections open on desktop and collapse on mobile; `cd frontend && npx tsc --noEmit` passes)

## 10. Frontend RepairRequest ↔ FaultRecord link UI

- [x] 10.1 In `frontend/src/components/AcceptanceHandoverForm.tsx` or `RepairRequestForm.tsx` (whichever creates items), add an optional FaultRecord typeahead field per item. Fetches via `faultRecordService.getForTypeahead({ trangThai: ['DANG_THEO_DOI', 'TAI_PHAT'], search })`.
- [x] 10.2 Persist selected `faultRecordId` on item submission.
- [x] 10.3 On RepairRequest detail view, if an item has a linked FaultRecord, render a small "Lỗi liên quan: [maSuCo]" chip that navigates to the fault detail on click. ← (verify: creating a RepairRequest with a linked FaultRecord successfully persists the FK; completing the RepairRequest auto-closes the linked FaultRecord end-to-end)

## 11. Verification and cleanup

- [x] 11.1 Run `cd backend && npx tsc --noEmit` — must pass.
- [x] 11.2 Run `cd backend && npm run lint`.
- [x] 11.3 Run `cd backend && npm test`.
- [x] 11.4 Run `cd frontend && npx tsc --noEmit` — must pass.
- [x] 11.5 Run `cd frontend && npm run lint`.
- [ ] 11.6 Run the migration on a fresh clone of dev DB, then run the post-migration audit query: `SELECT source, COUNT(*) FROM common."FaultRecordStatusLog" GROUP BY source;`. Confirm `legacy_migration_fallback` count matches the number of unknown pre-migration values.
- [ ] 11.7 Manual smoke: create RepairRequest → attach FaultRecord to an item → create AcceptanceHandover covering all items → verify RepairRequest becomes HOAN_THANH AND linked FaultRecord becomes DA_XU_LY with a status log row of `source = 'auto_from_repair'`.
- [ ] 11.8 Manual smoke: create a new FaultRecord with the same `machineSystemDetailId + loaiLoi` as an existing DA_XU_LY record within 90 days — confirm a `recurrence_detected` log row appears on the OLD record without changing its status. ← (verify: all end-to-end flows from all specs work in the browser against a dev backend)
