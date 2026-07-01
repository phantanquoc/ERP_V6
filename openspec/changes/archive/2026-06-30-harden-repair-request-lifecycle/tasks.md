## 1. Prisma schema & migration

- [x] 1.1 Add `RepairRequestStatus` enum (`CHO_XU_LY`, `DANG_SUA_CHUA`, `HOAN_THANH`, `DA_HUY`) in `backend/prisma/schema/common.prisma`
- [x] 1.2 Change `RepairRequest.trangThai` from `String @default("Chờ xử lý")` to `RepairRequestStatus @default(CHO_XU_LY)` in the same schema
- [x] 1.3 Add `RepairRequestStatusLog` model in `backend/prisma/schema/business_machines.prisma` (id cuid, repairRequestId Int FK cascade, oldStatus, newStatus, actorId String?, actorRole String?, reason String?, createdAt) with indexes on `repairRequestId` and `createdAt`, mapped to `repair_request_status_logs`, schema `business`
- [x] 1.4 Add `repairRequestStatusLogs RepairRequestStatusLog[]` back-relation on `RepairRequest`
- [x] 1.5 Run `npx prisma migrate dev --name harden_repair_request_lifecycle` and inspect the generated SQL
- [x] 1.6 Edit the migration SQL so the `ALTER COLUMN trangThai` step runs a `CASE` over current values: `'Chờ xử lý'→CHO_XU_LY`, `'Đang sửa chữa'→DANG_SUA_CHUA`, `'Hoàn thành'→HOAN_THANH`, else `CHO_XU_LY`
- [x] 1.7 Append an `INSERT INTO repair_request_status_logs` BEFORE the enum cast
- [x] 1.8 Re-apply the migration — verified no rows dropped, fallback log sane

## 2. Status transition helper

- [x] 2.1 In `backend/src/utils/statusTransitions.ts`, add `REPAIR_REQUEST_STATUS_ORDER`, `REPAIR_REQUEST_TERMINAL_STATUSES`, `REPAIR_REQUEST_CANCEL_TARGETS` constants
- [x] 2.2 Add `advanceRepairRequestStatus(current, next, opts?)` mirroring `advanceQuotationRequestStatus`
- [x] 2.3 Export the new helper and constants from the module
- [x] 2.4 Add unit tests under `backend/src/__tests__/statusTransitions.test.ts` covering: single-step, no-op, cancel from each non-terminal, all rejection cases, bypass — 10 new tests, all pass (60 total)

## 3. Notification registry wiring

- [x] 3.1 Add `REPAIR_REQUEST_COMPLETED: 'REPAIR_REQUEST_COMPLETED'` to `NotificationEvent` in `backend/src/types/notification.types.ts`
- [x] 3.2 Register the event in `backend/src/services/notificationRegistry.ts`
- [x] 3.3 Remove legacy `notificationService.createAcceptanceHandoverNotification` controller call in `backend/src/controllers/acceptanceHandoverController.ts`

## 4. Repair-request service

- [x] 4.1 Update `createRepairRequest` to seed `trangThai = 'CHO_XU_LY'` and ignore any client-supplied value (warn-log if present)
- [x] 4.2 Update `updateRepairRequest` to silently drop `data.trangThai` with a `logger.warn` line
- [x] 4.3 Implement `startRepair(id, actor)` — load, run helper, update, insert status-log, all inside `prisma.$transaction`; emit `REPAIR_REQUEST_UPDATED` after commit
- [x] 4.4 Implement `cancel(id, actor, { reason? })` — same shape as `startRepair`, target `DA_HUY`
- [x] 4.5 Implement `getStatusHistory(id)` — return `RepairRequestStatusLog[]` ordered ASC, hydrate `actor` display name from `User.firstName`/`lastName`
- [x] 4.6 Extend `getAllRepairRequests(page, limit, filters?)` to accept `{ search?, trangThai? }` and apply `where.trangThai` when set
- [x] 4.7 Extend `exportToExcel(filters)` to accept and apply the same filter shape
- [ ] 4.8 Add Jest tests for service helpers (start, cancel, getStatusHistory, filter application)

## 5. Repair-request controller & routes

- [x] 5.1 Drop `trangThai: req.body.trangThai` from `createRepairRequest` and `updateRepairRequest` controller payloads; emit `logger.warn` if present in body
- [x] 5.2 Add `startRepair(req,res,next)` controller method
- [x] 5.3 Add `cancel(req,res,next)` controller method reading `req.body.reason`
- [x] 5.4 Add `getStatusHistory(req,res,next)` controller method
- [x] 5.5 Forward `req.query.trangThai` and `req.query.search` from `getAllRepairRequests` and `exportToExcel` to the service after validating `trangThai` against the enum
- [x] 5.6 In `backend/src/routes/repairRequestRoutes.ts`, register: `POST /:id/start-repair`, `POST /:id/cancel`, `GET /:id/status-history`
- [ ] 5.7 Verify new endpoints appear in server boot logs ← (manual smoke test)

## 6. Acceptance-handover service guards & auto-complete

- [x] 6.1 In `acceptanceHandoverService.createAcceptanceHandover`, load parent with `select: { id, maYeuCau, trangThai }` inside the transaction; throw `ValidationError` when not `DANG_SUA_CHUA` and actor is not ADMIN
- [x] 6.2 After inserting handover items in the same transaction, compute `total` and `covered`
- [x] 6.3 When `covered === total` and parent is `DANG_SUA_CHUA`, call `advanceRepairRequestStatus`, update parent, insert status-log with `reason = 'auto_complete_full_coverage'`
- [x] 6.4 After commit, emit `ACCEPTANCE_HANDOVER_CREATED` and (if auto-completed) `REPAIR_REQUEST_COMPLETED`, both wrapped in try/catch
- [x] 6.5 In `updateAcceptanceHandover` and `deleteAcceptanceHandover`, load parent `trangThai`; throw when `HOAN_THANH` unless ADMIN; on ADMIN override write status-log row with `reason = 'admin_override:edit'` / `'admin_override:delete'`
- [ ] 6.6 Add Jest tests for handover guards

## 7. Frontend service & hooks

- [x] 7.1 In `frontend/src/services/repairRequestService.ts`, export `RepairRequestStatus` type and `STATUS_LABELS` map (with `tone` for badge color)
- [x] 7.2 Add `startRepair(id)`, `cancel(id, reason?)`, `getStatusHistory(id)` to the service
- [x] 7.3 Strip `trangThai` from `CreateRepairRequestRequest` type and `update(id, body)` payload
- [x] 7.4 In `frontend/src/hooks/useRepairRequests.ts`, add `useStartRepair`, `useCancelRepair`, `useRepairStatusHistory`
- [x] 7.5 Wire cache invalidation on mutation success (`repairRequestKeys.lists()` + `detail(id)`)
- [x] 7.6 Invalidate on success (covered by 7.5)

## 8. Frontend RepairRequestList

- [x] 8.1 Replace the inline `<select>` for status with a coloured badge driven by `STATUS_LABELS`
- [x] 8.2 Remove the status field from the edit form
- [x] 8.3 Conditionally render the action menu items per state (View/Edit/Bắt đầu sửa chữa/Nghiệm thu/Hủy yêu cầu/Lịch sử/Delete)
- [x] 8.4 Wire "Bắt đầu sửa chữa" to `useStartRepair`, with a confirmation dialog
- [x] 8.5 Wire "Hủy yêu cầu" to `useCancelRepair`, prompting for an optional reason
- [x] 8.6 Add a "Lịch sử trạng thái" modal driven by `useRepairStatusHistory`

## 9. Frontend AcceptanceHandoverForm

- [x] 9.1 Filter parent-`RepairRequest` selector to only show `trangThai === 'DANG_SUA_CHUA'` (handled at call site — "Nghiệm thu" action only shown for DANG_SUA_CHUA rows)
- [x] 9.2 Compute `covered/total` from selected items in this form and render "X/Y hạng mục đã nghiệm thu"
- [x] 9.3 On submit, if full coverage, show confirmation hint before sending

## 10. End-to-end verification

- [x] 10.1 Run `cd backend && npx tsc --noEmit` — passes (0 errors)
- [x] 10.2 Run `cd backend && npm run lint` — 0 errors (1197 warnings, all pre-existing)
- [x] 10.3 Run `cd backend && npm test` — 355/358 tests pass; 3 failures are pre-existing unowned tests (departmentService, machineIntegration, technicalBatchB)
- [x] 10.4 Run `cd frontend && npx tsc --noEmit` — passes (0 errors)
- [x] 10.5 Run `cd frontend && npm run lint` — 0 errors in modified files
- [ ] 10.6 Manual smoke test
