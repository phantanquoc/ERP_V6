## 1. Schema & Migration

- [x] 1.1 Add `nguoiPhu String[] @default([])` to `MaintenancePlanItemLog` in `backend/prisma/schema/business_machines.prisma`
- [x] 1.2 Add `nguoiPhu String[] @default([])` to `MaintenanceRecord` in the same schema file
- [x] 1.3 Run `npx prisma migrate dev --name add_nguoi_phu_maintenance` + `npx prisma generate`; if DB unavailable, hand-write migration SQL under `backend/prisma/migrations` + run `prisma generate` and flag the user to apply it ← (verify: both models have nguoiPhu String[] default [], migration exists, prisma client regenerated, NO db push)

## 2. Backend — Plan service & controller

- [x] 2.1 `maintenancePlanService.toggleMonth` — add `nguoiPhu?: string[]` param; write it on both the create-log and update-log branches (default `[]` on create when undefined); keep advisory lock/status logic intact
- [x] 2.2 `maintenancePlanService.updateLogNote` — accept `nguoiPhu?` and set it only when `!== undefined`
- [x] 2.3 `maintenancePlanService.createAutoRecord` — copy `nguoiPhu: log.nguoiPhu ?? []` into the generated record; ensure the log object it reads includes `nguoiPhu`
- [x] 2.4 `maintenancePlanController.toggleMonth` + `updateLogNote` — read `req.body.nguoiPhu`, `JSON.parse` when string, pass array through, else undefined ← (verify: ticking with assistants persists nguoiPhu on log AND auto-record inherits it)

## 3. Backend — Record service & controller

- [x] 3.1 `maintenanceRecordService` — add `nguoiPhu?: string[]` to `CreateMaintenanceRecordData`; write `nguoiPhu: data.nguoiPhu ?? []` on create and `data.nguoiPhu` on update
- [x] 3.2 `maintenanceRecordService.list` — add `{ nguoiPhu: { has: filters.search } }` to the search OR (array uses `has`, not `contains`)
- [x] 3.3 `maintenanceRecordService.exportExcel` — add "Người phụ" column, value `(r.nguoiPhu ?? []).join(', ')`
- [x] 3.4 `maintenanceRecordController.create` + `update` — parse `req.body.nguoiPhu` (`JSON.parse` when string, array as-is, else undefined) and merge into service data ← (verify: record create/update with file (FormData) correctly stores nguoiPhu array; search by assistant name returns the record)

## 4. Frontend — Reusable pickers

- [x] 4.1 Create `frontend/src/components/common/EmployeeCombobox.tsx` — single-select searchable (pattern from `ProductCombobox`), value = employee name, filter by name/employeeCode/department, props `{ value, onChange, employees, placeholder?, disabled? }`
- [x] 4.2 Create `frontend/src/components/common/EmployeeMultiCombobox.tsx` — multi-select chips, `onChange: (names: string[]) => void`, dedupe, same filter ← (verify: both filter case-insensitively; multi handles add/remove without duplicates)

## 5. Frontend — Log modal chain

- [x] 5.1 `maintenancePlanService.ts` — add `nguoiPhu: string[]` to `MaintenancePlanItemLog` type; pass `nguoiPhu` in `toggleMonth`/`updateLogNote` bodies (JSON, array direct)
- [x] 5.2 `useMaintenancePlans.ts` — `useToggleMonth` vars + mutationFn add `nguoiPhu?: string[]`; optimistic update sets `nguoiPhu` on new/changed log; `useUpdateLogNote` data adds `nguoiPhu?`
- [x] 5.3 `MaintenanceLogModal.tsx` — relabel to "Người thực hiện chính" + use `EmployeeCombobox`; add `nguoiPhu` state (init `log?.nguoiPhu ?? []`) + `EmployeeMultiCombobox` ("Người phụ (kiểm tra & thực hiện)"); dirty tracking; pass `nguoiPhu` through save + toggle
- [x] 5.4 `MaintenancePlanList.tsx` — thread `nguoiPhu` through `handleToggle`/`handleUpdateNote` prop chain and mutations; update `LogModalState`/prop signatures as needed ← (verify: log modal saves main + assistants, optimistic UI keeps assistants, no signature mismatch)

## 6. Frontend — Record form & list

- [x] 6.1 `maintenanceRecordService.ts` — add `nguoiPhu?: string[]` to `MaintenanceRecord` + `CreateMaintenanceRecordRequest`; on FormData path append `nguoiPhu` as `JSON.stringify(data.nguoiPhu ?? [])` (handled separately, NOT via the `String(value)` loop); JSON path sends array direct
- [x] 6.2 `MaintenanceRecordForm.tsx` — replace text input with `EmployeeCombobox` labeled "Người thực hiện chính"; add `nguoiPhu` state (init `record?.nguoiPhu ?? []`) + `EmployeeMultiCombobox`; include `nguoiPhu` in payload
- [x] 6.3 `MaintenanceRecordList.tsx` — display assistants compactly (e.g. "+N người phụ" or name list) under the performer without breaking table layout ← (verify: record form create/edit round-trips assistants through FormData; list shows assistants)

## 7. Verification

- [x] 7.1 `cd backend && npx prisma generate` then `cd backend && npx tsc --noEmit` — must pass
- [x] 7.2 `cd frontend && npx tsc --noEmit` — must pass
- [x] 7.3 `cd backend && npm run lint` — report; fix only in-scope files ← (verify: all checks green, no new lint errors in changed files)
