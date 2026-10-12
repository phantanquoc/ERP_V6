# Tasks — fault-template-by-detail-tree

## 1. Backend — faultTemplateService resilience

- [x] 1.1 Add `includeSubtree` support to `list()` — when `machineSystemDetailId` + `includeSubtree=true`, resolve descendant detail IDs via in-memory BFS over `machineSystemDetail` rows for that system and filter `machineSystemDetailId IN expandedIds`
- [x] 1.2 Add orphan filter — when `machineSystemDetailId` is explicitly null / `orphan=true`, filter `machineSystemDetailId IS NULL`; ensure `tenDetailGoiY/loaiDetailGoiY` are returned for display
- [x] 1.3 Add inactive-detail filter/badge support — relation filter `machineSystemDetail.hoatDong = false` when requested; ensure `machineSystemDetail` is included so frontend can render the warning badge
- [x] 1.4 Move `validateMachineDetail` inside `prisma.$transaction` for `create` and `update` — pass `tx` and re-read detail inside the transaction to close the race window
- [x] 1.5 Add `getTemplateCountsBySystem(machineSystemId)` — single `groupBy machineSystemDetailId` + detail tree fetch, returns `{ detailId, directCount, subtreeCount }` per node for the drawer badges ← (verify: counts match direct vs subtree semantics, leaf `direct==subtree`, CUM sums children)

## 2. Backend — machineSystemDetailService guards

- [x] 2.1 Guard cross-system move — in `update()`, when `machineSystemId` changes and `faultTemplate.count({ where: { machineSystemDetailId: id } }) > 0`, throw `ValidationError` (Vietnamese message)
- [x] 2.2 Add `getSubtreeIds(detailId)` helper — BFS over `parentDetailId` to collect all descendant IDs (used by deactivate cascade and subtree queries)
- [x] 2.3 Add `deactivateTemplatesForSubtree(subtreeIds)` helper — `updateMany` setting `hoatDong=false, trangThai='Ngừng hoạt động'` for templates in subtree; called only when UI opts in

## 3. Backend — machineSystemService clone with templates

- [x] 3.1 Extend `POST /machine-systems/:id/clone` body with optional `includeFaultTemplates?: boolean`
- [x] 3.2 When `includeFaultTemplates=true`, inside the existing `$transaction` after detail BFS builds `oldToNew`, clone each `FaultTemplate` (regenerate `maMauLoi`, remap `machineSystemId/detailId`, copy `tenDetailGoiY/loaiDetailGoiY`) and bulk-copy `RepairStep`s per template ← (verify: remapped detail IDs are correct, `maMauLoi` unique, detail-less templates also cloned, transaction rolls back on collision)

## 4. Backend — controllers & routes

- [x] 4.1 Update `faultTemplateController` to parse `includeSubtree`, `orphan`/`hoatDongDetail` query params and forward to service
- [x] 4.2 Add `GET /fault-templates/counts/by-system?machineSystemId=X` or extend summary — endpoint for `getTemplateCountsBySystem` (reuse existing auth gate `requireTechnicalAccess` for writes, open for reads)
- [x] 4.3 Update `machineSystemDetailController` deactivate flow to return `relatedTemplateCount` for the subtree so frontend can show the suggestion dialog
- [x] 4.4 Register any new route in `ROUTE_MAP` (`backend/src/routes/index.ts`) and verify server log "Registered X routes" ← (verify: new routes appear in startup log and respond with correct status codes)

## 5. Frontend — hooks & services

- [x] 5.1 Extend `faultTemplateService.ts` types and `getAll` params with `includeSubtree`, `orphan`, `hoatDongDetail`
- [x] 5.2 Add `useTemplateCountsBySystem(machineSystemId)` hook (TanStack Query, key includes system id)
- [x] 5.3 Extend `machineSystemService.ts` clone API with `includeFaultTemplates` param

## 6. Frontend — FaultRecordList template tab

- [x] 6.1 Render inactive-detail badge ("Chi tiết đã dừng") on rows where `template.machineSystemDetail?.hoatDong === false`
- [x] 6.2 Add orphan filter/tab "Chưa gắn chi tiết" and inactive-detail filter; show `tenDetailGoiY/loaiDetailGoiY` hint columns for orphan rows
- [x] 6.3 Add "Nhóm theo chi tiết" toggle — group current page by `tenChiTiet`, fetch system details to render zero-template groups with "Chưa có mẫu" + CTA
- [x] 6.4 Support prefilled create from tree — when opened with `machineSystemId/detailId` from drawer, lock selectors and invalidate counts on success

## 7. Frontend — MachineSummaryDrawer tree integration

- [x] 7.1 Show per-node badges `direct / subtree` (e.g. `2 / 5`) using `useTemplateCountsBySystem`
- [x] 7.2 Add inline "Thêm mẫu lỗi" CTA per node → opens template form prefilled for that node
- [x] 7.3 Expandable child panel per node listing direct templates (name, severity, status) with edit/deactivate actions
- [x] 7.4 Invalidate template counts and detail tree queries on template create/update/deactivate and on detail mutations ← (verify: badge counts update without full reload after each mutation)

## 8. Frontend — Clone dialog & deactivate cascade

- [x] 8.1 Add "Sao chép cả mẫu lỗi" checkbox to `MachineSystemList` clone dialog; forward `includeFaultTemplates` to API
- [x] 8.2 Deactivate detail flow — when deactivating a non-leaf detail, fetch `relatedTemplateCount` and show "Có N mẫu liên quan — dừng luôn?" confirm; on confirm call bulk deactivate

## 9. Verification

- [x] 9.1 Backend `npx tsc --noEmit` and frontend `npx tsc --noEmit -p tsconfig.app.json` pass with 0 errors
- [ ] 9.2 Manual QA matrix: create template on active detail, try on inactive detail (rejected), orphan bucket shows hints, subtree query returns descendant templates, move detail with templates rejected, clone with/without templates, deactivate CUM suggests bulk deactivate, group-by shows zero-template details ← (verify: all 11 audit cases from design behave as specified)
