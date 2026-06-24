## 1. Database Schema

- [x] 1.1 Add RepairStep model to `backend/prisma/schema/business_machines.prisma` with fields: id (cuid), faultTemplateId (FK), stepNumber (Int), moTa (String), thoiGianUocTinh (Int?), dungCu (String?), ghiChu (String?), createdAt, updatedAt. Add relation on FaultTemplate: repairSteps RepairStep[] with onDelete: Cascade. Schema: business.
- [x] 1.2 Run `npx prisma migrate dev --name add-repair-step-model` to generate migration ← (verify: migration file exists, schema matches design.md)

## 2. Backend Service — FaultTemplate

- [x] 2.1 Update `faultTemplateService.ts`: add `repairSteps` to the include object (ordered by stepNumber asc) in list/getById queries
- [x] 2.2 Add `getSummary(id)` method to `faultTemplateService.ts`: returns template basic fields, totalRecords (count), recentRecords (5 most recent fault records), monthlyTimeline (groupBy month), repairSteps (ordered)
- [x] 2.3 Update `createFaultTemplate` to accept and create repairSteps via `createMany` in the same transaction
- [x] 2.4 Update `updateFaultTemplate` to delete-then-recreate repairSteps in the same transaction ← (verify: all faultTemplateService methods compile, repairSteps included correctly)

## 3. Backend Service — FaultRecord

- [x] 3.1 Update `createFaultRecord` in `faultRecordService.ts`: accept `userRole` param. When no `faultTemplateId` provided AND user has canMutate role (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD), auto-create FaultTemplate + FaultRecord in single transaction with generated maMauLoi code
- [x] 3.2 Accept optional `repairSteps` array in create payload for auto-create scenario — create RepairSteps on the auto-created template ← (verify: auto-create logic works for canMutate, skips for EMPLOYEE role)

## 4. Backend Controller & Routes

- [x] 4.1 Add `getSummary` method to `faultTemplateController.ts` — call service getSummary, return standard response shape
- [x] 4.2 Add route `GET /:id/summary` to `faultTemplateRoutes.ts` with authenticate middleware
- [x] 4.3 Update `faultRecordController.ts` create method to pass `req.user.role` to the service createFaultRecord call ← (verify: route registered, tsc --noEmit passes for backend)

## 5. Frontend Hooks

- [x] 5.1 Add `useTemplateSearch(search, options)` hook to `useFaultTemplates.ts` — debounced TanStack Query calling existing list endpoint with search param, enabled when search length >= 2
- [x] 5.2 Add `useTemplateSummary(id)` hook — fetches `GET /api/fault-templates/:id/summary`, enabled when id is truthy
- [x] 5.3 Update existing `useCreateFaultTemplate` and `useUpdateFaultTemplate` mutations to include repairSteps in payload ← (verify: hooks compile, query key factory pattern followed)

## 6. Frontend — Typeahead Combobox

- [x] 6.1 Replace FaultTemplate dropdown in create/edit fault record modal (in `FaultRecordList.tsx`) with a typeahead combobox component — debounce 300ms, show suggestions with template name + severity badge + record count, allow "Không chọn mẫu" option
- [x] 6.2 When template selected, set faultTemplateId and display linked RepairSteps read-only below the combobox

## 7. Frontend — Repair Steps Display & Form

- [x] 7.1 Create `RepairStepForm.tsx` component — dynamic list with add/remove/reorder (up/down buttons), fields: moTa (required), thoiGianUocTinh, dungCu, ghiChu
- [x] 7.2 Integrate RepairStepForm into fault record create modal — show when auto-creating template (no template selected + canMutate user)
- [x] 7.3 Integrate RepairStepForm into FaultTemplate create/edit form (in the "Mẫu lỗi" tab)
- [x] 7.4 Display repair steps read-only in fault record view modal when linked template has steps ← (verify: RepairStepForm renders, add/remove/reorder works, tsc --noEmit passes for frontend)

## 8. Frontend — Template Detail Drawer

- [x] 8.1 Create `FaultTemplateDetail.tsx` — drawer/modal showing template summary: occurrence count, 5 recent records, monthly timeline chart/list, repair steps section
- [x] 8.2 Wire drawer open on template row click in "Mẫu lỗi" tab, fetch data via useTemplateSummary hook ← (verify: drawer opens with correct data, all frontend type checks pass, lint passes)
