## Why

TechnicalQuality currently groups 7 domains into 4 tabs with nested pill controls (Sửa chữa & Lỗi holds 3 pill views, Linh kiện & Đơn hàng holds 2). Users must make two selections to reach a list, URL state mixes `tab` + `sub` + `type` params, and RepairRequestList fuses KIEM_TRA and SUA_CHUA logic in one 78k file via an inspection adapter. Flattening to 7 top-level tabs removes the extra navigation step and decouples the two request types.

## What Changes

- Replace the 4-entry `TabType` in `TechnicalQuality.tsx` with 7 entries: `heThongMay | kiemTra | suaChua | loi | baoDuong | linhKien | donHang`.
- Remove pill branching state (`repairTab`, `partsOrdersView`) and the `deriveRepairTab` / legacy `?tab=repairAndFault&sub=...&type=...` URL mapping. URL becomes `?tab=<one of the 7>` only (no `sub`/`type`).
- Split request lists per 3C: `RepairRequestList.tsx` shrinks to SUA_CHUA-only (remove inspection adapter, `isKiemTra` branching, KIEM_TRA status sets); `InspectionRequestList.tsx` becomes a standalone, full-feature component for KIEM_TRA (no shared adapter).
- Keep `MaintenanceTab` as a single tab with two internal pills (plans/records) per 2A.
- Embed `OrderManagement` directly in the `donHang` tab per 1A (no filtered view).
- Deep-link params for detail modals (`repairId`, `inspectionId`, `faultId`, `partId`) remain; tab values they sync to are the new 7 keys.
- No backend, Prisma, or ROUTE_MAP changes. Old `?tab=repairAndFault...` URLs are not redirected per 4C (they fall back to the default tab).

## Capabilities

### New Capabilities
- `technical-quality-tabs`: 7-tab navigation for the TechnicalQuality page — tab set, URL param, content mapping, and decoupled inspection/repair lists.

### Modified Capabilities
- None — no existing spec's requirements change at the spec level; this is a frontend navigation reorganization.

## Impact

- Affected code: `frontend/src/pages/technical/TechnicalQuality.tsx`, `frontend/src/components/RepairRequestList.tsx`, `frontend/src/components/InspectionRequestList.tsx`, `frontend/src/components/MaintenanceTab.tsx` (no-op, kept as-is), `frontend/src/components/FaultRecordList.tsx` / `SparePartList.tsx` / `OrderManagement.tsx` (hosted, not modified).
- No API or DB changes. Risk is limited to frontend routing and the inspection/repair split.
