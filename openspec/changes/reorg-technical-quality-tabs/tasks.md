## 1. TechnicalQuality — 4 to 7 tabs and URL cleanup

- [x] 1.1 Replace TabType with 7 keys `inspections | repairs | faults | machineSystems | maintenance | spareParts | orders`, update tabs array labels/order, and default tab handling
- [x] 1.2 Remove pill branching state (`repairTab`, `partsOrdersView`, `maintenanceView` where applicable) and helpers `deriveRepairTab`, `isPartsOrdersView`, `isMaintenanceView`; simplify URL sync to `?tab=<one of 7>` only (remove `sub`/`type`/`requestType` writes) per 4C
- [x] 1.3 Replace content mapping so each tab renders a single component: `machineSystems`→MachineSystemList, `inspections`→InspectionRequestList, `repairs`→RepairRequestList (SUA_CHUA-only), `faults`→FaultRecordList, `maintenance`→MaintenanceTab, `spareParts`→SparePartList, `orders`→OrderManagement (1A/2A)
- [x] 1.4 Update deep-link handling so `repairId`→`repairs`, `inspectionId`→`inspections`, `faultId`→`faults`, `partId`→`spareParts` (and their aliases `repairRequestId`, `inspectionRequestId`, `faultRecordId`) activate the correct new tab and open the detail modal ← (verify: 7-tab click + F5 + each deep-link modal)

## 2. RepairRequestList — SUA_CHUA-only (3C duplicate)

- [x] 2.1 Remove inspection adapter (`adaptInspection`, `UnifiedRequest`, `isKiemTra` branching) and inspection query/stats/history branches; keep only `useRepairRequests`/`useRepairRequestStats`/`useRepairStatusHistory` for SUA_CHUA
- [x] 2.2 Remove KIEM_TRA status sets and pill filter for request type; table shows only SUA_CHUA rows/columns/statuses

## 3. InspectionRequestList — standalone full-feature (3C duplicate)

- [x] 3.1 Remove legacy `type`/`sub`/`tab=repairAndFault` writes from modal open/close URL sync; ensure standalone query/stats/history and table remain self-contained per 4C

## 4. Verification

- [x] 4.1 Run `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — 0 errors; `npm run lint` — no new errors; manual: click all 7 tabs, F5 retains tab, deep-links `?tab=repairs&repairId=...`, `?tab=inspections&inspectionId=...`, `?tab=faults&faultId=...`, `?tab=spareParts&partId=...` open correct modals ← (verify: typecheck 0 errors, lint clean, all 7 tabs + deep-links)
