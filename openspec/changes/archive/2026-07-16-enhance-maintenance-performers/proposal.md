## Why

In the Maintenance tab (module "Đảm bảo và Cải tiến"), maintenance work is often carried out by a team, but the system only records a single "Người thực hiện" (performer) per completion log and per record. There is no way to capture the assistants who checked and helped perform the work. Additionally, employee pickers are plain dropdowns with no name search, making them slow to use as the employee list grows.

## What Changes

- Rename the single performer label from "Người thực hiện" to "Người thực hiện chính" (main performer) in both maintenance employee-picker locations.
- Add the ability to select MULTIPLE assistant performers ("người phụ" — checking & performing) alongside the main performer.
- Persist assistants as a native Postgres string array `nguoiPhu String[] @default([])` on both `MaintenancePlanItemLog` and `MaintenanceRecord`.
- Add name-search to EVERY employee picker inside the Maintenance tab (searchable combobox for the main performer, searchable multi-select for assistants).
- When ticking a completion in the plan auto-generates a maintenance record (`createAutoRecord`), copy the assistant list from the log to the record.
- Include assistants in the record list search (`has`) and Excel export ("Người phụ" column).

## Capabilities

### New Capabilities
- `maintenance-performers`: Recording a main performer plus multiple assistant performers on maintenance completion logs and maintenance records, with name-searchable employee pickers across the Maintenance tab and assistant propagation into auto-generated records.

### Modified Capabilities
<!-- None — no existing capability spec governs maintenance performer recording. -->

## Impact

- **Schema (migration required)**: `backend/prisma/schema/business_machines.prisma` — add `nguoiPhu String[] @default([])` to `MaintenancePlanItemLog` and `MaintenanceRecord`. Requires `prisma migrate dev` + `prisma generate` (NOT `db push`).
- **Backend**: `maintenancePlanService.ts` (`toggleMonth`, `updateLogNote`, `createAutoRecord`), `maintenancePlanController.ts`, `maintenanceRecordService.ts` (create/update/list-search/exportExcel), `maintenanceRecordController.ts`.
- **Frontend**: new `common/EmployeeCombobox.tsx` + `common/EmployeeMultiCombobox.tsx`; `MaintenanceLogModal.tsx`, `MaintenancePlanList.tsx`, `MaintenanceRecordForm.tsx`, `MaintenanceRecordList.tsx`; services `maintenancePlanService.ts` + `maintenanceRecordService.ts`; hook `useMaintenancePlans.ts`.
- **Data transport**: `nguoiPhu` must be JSON-serialized on the FormData (file) path and JSON-parsed in controllers when received as a string; JSON body path sends the array directly.
- **Out of scope**: RBAC (`technicalAccess`), advisory lock / status transition mechanics, anything outside the Maintenance tab.
