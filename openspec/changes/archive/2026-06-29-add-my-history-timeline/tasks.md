## 1. Prisma schema + migration

- [x] 1.1 Add `createdById String?` + `@@index([createdById])` to `FaultRecord` in `backend/prisma/schema/business_machines.prisma`
- [x] 1.2 Add `createdById String?` + `@@index([createdById])` to `MaintenancePlan` in `backend/prisma/schema/business_machines.prisma`
- [x] 1.3 Add `createdById String?` + `@@index([createdById])` to `MaintenanceRecord` in `backend/prisma/schema/business_machines.prisma`
- [x] 1.4 Add `createdById String?` + `@@index([createdById])` to `RepairRequest` in `backend/prisma/schema/common.prisma`
- [x] 1.5 Add `createdById String?` + `@@index([createdById])` to `AcceptanceHandover` in `backend/prisma/schema/common.prisma`
- [x] 1.6 Add `createdById String?` + `@@index([createdById])` to `MaterialEvaluation` in `backend/prisma/schema/business_production.prisma`
- [x] 1.7 Add `createdById String?` + `@@index([createdById])` to `FinishedProduct` in `backend/prisma/schema/business_production.prisma`
- [x] 1.8 Add `createdById String?` + `@@index([createdById])` to `QualityEvaluation`, `ProductionReport`, `InternalInspection`, `CustomerFeedback`, `Invoice`, `TaxReport` in the appropriate schema files
- [x] 1.9 Run `npx prisma migrate dev --name add-created-by-tracking` and verify the migration is additive-only ← (verify: schema has new column + index on all 13 models, migration SQL contains only ADD COLUMN/CREATE INDEX, no existing data altered)

## 2. Backfill script

- [x] 2.1 Create `backend/prisma/scripts/backfillCreatedById.ts` with `--dry-run` flag support
- [x] 2.2 Implement `User.fullName` → `userId` map builder, handling duplicates (mark as ambiguous)
- [x] 2.3 Implement per-model backfill loop for the 11 Group-B models, preserving original text fields and only writing when exactly one user matches
- [x] 2.4 Add summary log output (per model: matched / ambiguous / no-match counts) ← (verify: dry-run prints the report and writes nothing; live run updates only unambiguous rows and never modifies the original text fields)

## 3. Backend service create-paths populate createdById

- [x] 3.1 Update `faultRecordService.create` to accept and persist `userId` → `createdById`; update controller to pass `req.user.id`
- [x] 3.2 Update `maintenancePlanService.create` and its controller
- [x] 3.3 Update `maintenanceRecordService.create` and its controller
- [x] 3.4 Update `acceptanceHandoverService.create` and its controller
- [x] 3.5 Update `materialEvaluationService.create` and its controller
- [x] 3.6 Update `finishedProductService.create` and its controller
- [x] 3.7 Update `qualityEvaluationService.create` and its controller
- [x] 3.8 Update `productionReportService.create` and its controller
- [x] 3.9 Update `internalInspectionService.create` and its controller
- [x] 3.10 Update `customerFeedbackService.create` and its controller
- [x] 3.11 Update `invoiceService.create` and its controller
- [x] 3.12 Update `repairRequestService.create` and its controller
- [x] 3.13 Update `taxReportService.create` and its controller ← (verify: every create-path passes req.user.id into the service and the new row persists createdById; existing text fields remain populated; no controller calls Prisma directly)

## 4. Backend my-history service

- [x] 4.1 Create `backend/src/services/myHistoryService.ts` with the unified `HistoryItem` type, the 25-entity branch table, and helper `mapToHistoryItem` per entity
- [x] 4.2 Implement `getMyHistory(params)` that looks up `employeeId` from `userId`, runs all 25 Prisma `findMany` calls inside `Promise.all`, each wrapped in `.catch(err => { log; return []; })` so one branch can't 500 the response
- [x] 4.3 Apply `dateFrom`/`dateTo` + `types[]` server-side via `where` clauses; default `dateFrom = now - 90 days` when not supplied
- [x] 4.4 Map each result to `HistoryItem`, deduplicate the creator-vs-related collisions in favor of `creator`
- [x] 4.5 Apply post-merge filters (`statuses[]`, `roleFilter`, `search`), sort by `createdAt desc`, compute `groupCounts`, then paginate
- [x] 4.6 Return `{ items, total, page, totalPages, groupCounts }` and use `pagination` envelope helpers ← (verify: response shape matches spec, default 90-day window applied, groupCounts reflect post-filter pre-paginate counts, partial-failure scenario degrades gracefully)

## 5. Backend controller + routes

- [x] 5.1 Create `backend/src/controllers/myHistoryController.ts` exporting `getMyHistory` (self) and `getUserHistory` (others)
- [x] 5.2 Create `backend/src/routes/myHistoryRoutes.ts`: `GET /api/me/history` with `authenticate`; `GET /api/users/:userId/history` with `authenticate` + `checkAccess({ allowedRoles: ['DEPARTMENT_HEAD', 'ADMIN'], checkDepartment: true })`
- [x] 5.3 Add Zod validation for query params (`dateFrom`, `dateTo`, `types[]`, `statuses[]`, `roleFilter`, `search`, `page`, `limit` with clamps); throw `ValidationError` from `@utils/errors` on invalid input
- [x] 5.4 Register the new routes in `backend/src/routes/index.ts` `ROUTE_MAP` ← (verify: server logs show both endpoints registered; ADMIN can call /api/users/:userId/history for any user; DEPARTMENT_HEAD blocked for other departments; EMPLOYEE blocked entirely)

## 6. Frontend service + hook

- [x] 6.1 Create `frontend/src/services/myHistoryService.ts` exporting `fetchMyHistory(params)` and `fetchUserHistory(userId, params)` calling the backend endpoints via the shared `apiClient`
- [x] 6.2 Create `frontend/src/hooks/useMyHistory.ts` with `myHistoryKeys = { all, lists, list(params) }` and `useMyHistory(params)` wrapping `useQuery`

## 7. Frontend page + components

- [x] 7.1 Create `frontend/src/components/MyHistoryFilters.tsx`: date-range quick picker (30/90/365/all/custom), group checkboxes, status select, role toggle, search input
- [x] 7.2 Create `frontend/src/components/MyHistoryItem.tsx`: row item with group icon, role badge, status pill, click handler
- [x] 7.3 Create `frontend/src/components/MyHistoryTimeline.tsx`: list grouped by day (DD/MM/YYYY headers), empty state, loading skeleton, pagination
- [x] 7.4 Create `frontend/src/components/MyHistoryDetailModal.tsx`: read-only view of `HistoryItem`, "Mở ở trang gốc" button using `routeHint`
- [x] 7.5 Create `frontend/src/pages/MyHistory.tsx` that composes filters + timeline + modal and reads filter state into the `useMyHistory` hook
- [x] 7.6 Register `/my-history` route in the router config and lazy-load the page
- [x] 7.7 Add "Lịch sử của tôi" quick-action card to `frontend/src/pages/EmployeeDashboard.tsx` ← (verify: page loads, filters update results, click on an item opens modal, "Mở ở trang gốc" navigates to the entity's management page; dashboard quick action visible and links to /my-history)

## 8. Verification

- [x] 8.1 `cd backend && npx tsc --noEmit` passes with no errors
- [x] 8.2 `cd backend && npm run lint` passes
- [x] 8.3 `cd frontend && npx tsc --noEmit` passes with no errors
- [x] 8.4 `cd frontend && npm run lint` passes
- [ ] 8.5 Manual smoke test: log in as EMPLOYEE, navigate to `/my-history`, confirm data appears for last 90 days and filters work; log in as DEPARTMENT_HEAD, fetch `/api/users/:userId/history` for a same-department user (200) and a different-department user (403) ← (verify: all checks green; no console errors; partial-failure path tested by temporarily breaking one Prisma query and confirming response still 200)
