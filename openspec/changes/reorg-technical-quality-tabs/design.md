## Context

TechnicalQuality at `frontend/src/pages/technical/TechnicalQuality.tsx` currently exposes 4 tabs (`machineSystems | repairAndFault | maintenance | partsAndOrders`). Two of them host pill sub-navigation: `repairAndFault` branches into Kiểm tra / Sửa chữa / Lỗi via `repairTab` + `deriveRepairTab()` and `type`/`requestType` URL params; `partsAndOrders` branches into Linh kiện / Đơn hàng via `partsOrdersView` + `sub`. URL state is `?tab=<TabType>&sub=<...>&type=<...>` with bidirectional sync logic (~80 lines). `RepairRequestList.tsx` (78k) handles both KIEM_TRA (via inspection adapter + `useInspectionRequests`) and SUA_CHUA in one file with `isKiemTra` branching throughout table, stats, and row actions. Decisions 1A/2A/3C/4C were confirmed: OrderManagement chung, MaintenanceTab keeps pills, inspection/repair split into fully independent components, clean URL with no legacy redirect.

## Goals / Non-Goals

**Goals:**
- Flatten TechnicalQuality to 7 top-level tabs: `heThongMay | kiemTra | suaChua | loi | baoDuong | linhKien | donHang`.
- Make each tab a single, independent list (except Bao duong which keeps its two pills 2A).
- Remove shared inspection adapter from RepairRequestList so each request type owns its component (3C duplicate).
- Simplify URL to `?tab=<one of 7>` only (4C: no legacy redirect; old `?tab=repairAndFault&sub=...&type=...` falls back to default tab).

**Non-Goals:**
- No backend, Prisma, or ROUTE_MAP changes.
- No new filtered OrderManagement view (1A: reuse chung).
- No splitting MaintenanceTab into two tabs (2A).
- No redirect/migration for old bookmark URLs (4C).

## Decisions

- **Tab keys are camelCase Vietnamese abbreviations** (`heThongMay`, `kiemTra`, ...) to match existing codebase convention (`machineSystems` etc.) while reflecting the new labels. Alternative: English keys — rejected to keep labels and keys aligned for readability.
- **Duplicate (3C) over wrapper (B) or shared file (A) for inspection/repair split.** Duplication is intentional: each file owns its query hook, stats hook, columns, and row actions. Shared logic (statusBadgeClass, formatDate) can stay inline/duplicated; extracting a shared hook is deferred to avoid premature abstraction. Trade-off: more lines to maintain, but no cross-type branching bugs.
- **Clean URL cut (4C) — no legacy redirect.** Keeps `TechnicalQuality` URL sync small and avoids carrying `deriveRepairTab` forward. Trade-off: old shared links land on the default tab; acceptable per stakeholder confirmation.
- **OrderManagement reused as-is (1A).** No technical-scoped filter; avoids coupling purchasing domain to technical tab. If a scoped view is needed later, add a new `OrderManagementTechnical` wrapper rather than mutating the shared component.
- **MaintenanceTab unchanged (2A).** Its internal `plans | records` pill state already syncs via `mView`/`onViewChange`; TechnicalQuality just hosts it without adding another branching layer.

## Risks / Trade-offs

- **Duplicated table/filter logic between InspectionRequestList and RepairRequestList** → Mitigation: keep each file self-contained; consider extracting shared `ListToolbar` later if divergence proves small.
- **Deep-link params (`repairId`, `inspectionId`, `faultId`, `partId`) still honored** but tab they sync to changes to the new 7 keys; modal open logic must map each param to its new tab value. Missing mapping would break share links — must route `repairId` → `suaChua`, `inspectionId` → `kiemTra`, `faultId` → `loi`, `partId` → `linhKien`.
- **Old `?tab=repairAndFault...` URLs silently fall back** — users with bookmarks see default tab. Mitigation: none per 4C; could add a console warning if needed later.
- **Spec overlap with in-progress changes** `split-inspection-repair` and `fix-chung-kiem-tra-footer` touching the same files — implementer must rebase/merge carefully.

## Migration Plan

1. Update `TechnicalQuality.tsx` tab set + URL sync + content mapping.
2. Update `InspectionRequestList.tsx` to standalone full-feature (remove legacy type/sub tab writes) and `RepairRequestList.tsx` to SUA_CHUA-only (remove inspection adapter/isKiemTra).
3. Verify: `npx tsc --noEmit -p tsconfig.app.json` 0 errors, `npm run lint` no new errors, manual 7-tab click + F5 + each deep-link modal.
4. No DB migration or deploy flag. Rollback = revert the three frontend files.

## Open Questions

- None — all decisions (1A/2A/3C/4C) confirmed.
