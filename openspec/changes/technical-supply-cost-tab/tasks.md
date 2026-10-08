# Tasks: technical-supply-cost-tab

## 1. Backend — SupplyRequest filtering & enrichment

- [ ] 1.1 Extend `backend/src/services/supplyRequestService.ts:getAllSupplyRequests` to accept `opts?: { technicalOnly?: boolean; linkedToRepair?: boolean; year?: number }`, resolve `DEPT_TECHNICAL` → User IDs via DB (primary + secondary departments) and apply year range on `ngayYeuCau`; validate `year` 1900–2100 or throw `ValidationError`; apply `linkedToRepair` via distinct `RepairSupplyLink.supplyRequestId` set — verify `npx tsc --noEmit` passes and manual call `getAllSupplyRequests(1,10,undefined,undefined,undefined,undefined,undefined,{technicalOnly:true, year:2026})` filters correctly
- [ ] 1.2 Batch-enrich returned rows with `supplyLinks: Array<{ repairRequestId: number; maYeuCau: string; trangThai: string }>` by collecting page `supplyRequestIds`, fetching `RepairSupplyLink` + `RepairRequest` (`maYeuCau`, `trangThai`) in one query, grouping by `supplyRequestId` (empty array when none, distinct by `repairRequestId`) — verify `npx tsc --noEmit` and that unlinked rows return `[]`
- [ ] 1.3 Update `backend/src/controllers/supplyRequestController.ts:getAllSupplyRequests` to parse `technicalOnly`, `linkedToRepair`, `year` from query (truthy string → boolean, 4-digit year → number, invalid → 400), pass through to service while preserving existing data-permission `departmentIds`/`subDepartmentIds` logic — verify `npx tsc --noEmit` and that `GET /api/supply-requests?year=abc` returns 400 ← (verify: new filters AND-ed with existing filters and permissions, supplyLinks enriched, invalid year 400)

## 2. Frontend — Services & hooks

- [ ] 2.1 Extend `frontend/src/services/supplyRequestService.ts` with `SupplyCostFilters` (`technicalOnly?`, `linkedToRepair?`, `year?`) and have `getAllSupplyRequests(page, limit, filters)` append them to `params` alongside existing `search`/`trangThai`/etc., typing enriched `supplyLinks` on `SupplyRequest` — verify `npx tsc --noEmit -p tsconfig.app.json` passes
- [ ] 2.2 Add `useSupplyCostList` (or extend `useSupplyRequests`) in `frontend/src/hooks/useSupplyRequests.ts` with queryKey including `{ technicalOnly, linkedToRepair, year, trangThai, loaiYeuCau, page, limit }`, wiring to the extended service method, URL-synced via caller — verify `npx tsc --noEmit -p tsconfig.app.json` passes ← (verify: hook fetches with new filters, queryKey stable, typing includes supplyLinks)

## 3. Frontend — TechnicalSupplyCostTab component

- [ ] 3.1 Create `frontend/src/components/TechnicalSupplyCostTab.tsx` Block 1 — header filters (year select, dateFrom/dateTo, supplyStatus, supplyLoai), toggle All / Only linked to repairs, KPI row by `trangThai` (derived from fetched data), paginated table (10/page) showing `maYeuCau`, `ngayYeuCau`, `tenNhanVien`, `mucDichYeuCau`, `trangThai`, `loaiYeuCau`, `supplyLinks` chips (clickable → `RepairRequestFormModal` view), loading skeleton and error+retry states — verify `npx tsc --noEmit -p tsconfig.app.json` and that filter changes update URL and refetch
- [ ] 3.2 Add Block 2 — repair cost overview reusing `useRepairRequestStats({ year, dateFrom, dateTo, phongBanId })` and rendering `ComposedChart` (stacked `thucTe`+`incidental`, line `duKien`, Y in VND), expandable per-month detail table (click `maYeuCau` → `RepairRequestFormModal` view), KPI cards for MTTR / KHONG_DAT rate / Top expensive; both blocks independently handle loading/error/empty so one failure does not block the other, all shared filters URL-synced — verify `npx tsc --noEmit -p tsconfig.app.json` and that Block 2 renders from `costByMonth`/`costDetailByMonth` ← (verify: both blocks render with real API, URL filters survive refresh, error in one block does not kill the other)

## 4. Frontend — Tab wiring & deep-link

- [ ] 4.1 Update `frontend/src/pages/technical/TechnicalQuality.tsx` to add `supplyCost` to `TabType`, append tab entry `{ key: 'supplyCost', label: 'Vat tu & Chi phi' }` at end of `tabs[]`, extend `ALL_TECH_PARAMS` with `supplyStatus`, `supplyLinked`, `supplyLoai`, add render branch `{activeTab === 'supplyCost' && <SectionCard><TechnicalSupplyCostTab/></SectionCard>}` and deep-link resolver for `?tab=supplyCost` — verify `npx tsc --noEmit -p tsconfig.app.json` and that `?tab=supplyCost` resolves to the new tab and F5 preserves it ← (verify: tab appears last, deep-link + refresh + tab-switch cleanup all work)

## 5. Verification

- [ ] 5.1 Run `cd backend && npx tsc --noEmit` (0 errors), `cd frontend && npx tsc --noEmit -p tsconfig.app.json` (0 errors), `cd backend && npm run lint` (no new errors), and `openspec validate --change technical-supply-cost-tab --strict`; manually verify `GET /supply-requests?technicalOnly=true&year=2026` and tab deep-link `?tab=supplyCost&year=2026&supplyLinked=1` end-to-end — verify all checks pass and both blocks display correctly
