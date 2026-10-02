## Why

The maintenance plan tab (`technical/quality?tab=maintenance&mView=plans`) currently renders a paginated list of 5 plan cards per page, each with its own T1–T12 month grid. As plan count grows, scanning across cards is inefficient and comparing months within a single plan is cramped. Users requested a dedicated "one plan per page" view so each `KHBD-YYYY-...` code gets its own full-width T1–T12 grid. Separately, ticking a maintenance occurrence (MaintenanceLogModal) can visually stack on top of the plan detail form (MaintenancePlanForm), making completion awkward.

## What Changes

- Replace the 5-card paginated list in `MaintenancePlanList` with a **single-plan detail view**: exactly one `MaintenancePlan` rendered per page as a full-width month grid (one T1–T12 table). The URL param `planId` is the source of truth when present; otherwise the first plan in the filtered set is selected.
- Add a **plan navigator** above the grid: a searchable code dropdown (`KHBD-YYYY-...` + system name) plus **Previous / Next** buttons stepping through the currently filtered plan set. The navigator respects active filters (year `nam`, `machineSystemId`, `trangThai`, search `planQ`).
- Keep the existing **filter toolbar** (search, year, system, status) — changing a filter recomputes the available plan set, selects the first plan, and syncs URL. When the filter yields zero plans, show an empty state with a "Create plan" CTA.
- Remove the 5-card pagination UI (`planPage` / Prev-Next page) from the plans view; `planPage` is no longer used for plans (kept only for backward compat — ignored, and eventually cleaned up).
- Enforce **single-modal invariant**: at most one of `MaintenancePlanForm` (create/view/edit) and `MaintenanceLogModal` may be open at a time. Opening the log modal auto-closes the plan form if open; the log modal always renders on top with its own backdrop and focus trap. Closing the log modal does not auto-reopen the form.
- Preserve deep-link behavior: `?planId=<id>&planMonth=<1..12>` still highlights/scrolls the month column and can open the log modal for that month.
- Keep the `records` pill (`MaintenanceRecordList`) unchanged — no list or modal changes there.
- No backend, Prisma, or ROUTE_MAP changes. The frontend continues to use `maintenancePlanService.list` (with a large `limit` to fetch the filtered set for navigation) and `getById` for the selected plan; if the filtered set is small, client-side navigation is sufficient.

## Capabilities

### New Capabilities
- `maintenance-single-plan-view`: One-plan-per-page view for maintenance plans — single full-width T1–T12 grid, code dropdown + Prev/Next navigator driven by filtered set, single-modal invariant between plan form and log modal, URL `planId` as source of truth, empty-state and deep-link behavior.

### Modified Capabilities
- `technical-quality-tabs`: The `maintenance` tab's `plans` sub-view changes from a 5-card paginated list to a single-plan detail view; URL contract for plans adds `planId` as primary param and deprecates `planPage` for this view. Existing 7-tab structure and `mView` pills are otherwise unchanged.

## Impact

- **Frontend**: `frontend/src/components/MaintenancePlanList.tsx` (main change — replace list+pagination with single-plan view + navigator), `frontend/src/components/MaintenanceLogModal.tsx` (minor — ensure z-index/backdrop stacking is explicit), `frontend/src/components/MaintenancePlanForm.tsx` (minor — no grid changes), `frontend/src/components/MaintenanceTab.tsx` (minor — plan URL param sync), `frontend/src/hooks/useMaintenancePlans.ts` (minor — query keys / fetch for selected plan + list for navigator), `frontend/src/services/maintenancePlanService.ts` (no API change, may add a small helper for listing codes if needed).
- **Backend**: None (no schema, service, or route changes).
- **URL contract**: `?tab=maintenance&mView=plans&planId=<id>&planMonth=<m>&mode=<create|view|edit>` remains; `planPage` is ignored in the plans view after this change (records view unaffected).
- **Risks**: Filtered set size — fetching a large list for the navigator could be heavy; mitigated by capping the navigator fetch (e.g., `limit: 200`) and documenting the cap.
