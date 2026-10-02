## Context

`MaintenancePlanList` currently renders 5 plan cards per page (`PAGE_SIZE=5`), each with its own T1–T12 month grid (`PlanCard` + `PlanItemRow` + `MonthCell`). The log modal (`MaintenanceLogModal`) and the plan detail/create/edit form (`MaintenancePlanForm`) are independent `ModalForm`s mounted side-by-side; both can be open, so the log modal visually stacks over the form.

URL for the plans sub-view uses namespaced params: `planPage`, `planQ`, `nam`, `trangThai`, `machineSystemId`, `planId`, `planMonth`, `mode` inside `MaintenanceTab` (`mView=plans|records`). `TechnicalQuality` owns `?tab=maintenance` and hosts `MaintenanceTab`. Backend `maintenancePlanService.list` is already filterable and paginated; `getById` fetches a full plan with items/logs. No schema or route change is needed.

## Goals / Non-Goals

**Goals:**
- One plan per page: exactly one `MaintenancePlan` rendered as a single full-width T1–T12 grid, navigated via code dropdown + Prev/Next stepping through the *filtered* plan set.
- Single-modal invariant: at most one modal open; opening the log modal auto-closes the plan form.
- Keep filter toolbar (search `planQ`, year `nam`, system `machineSystemId`, status `trangThai`) and deep-link (`planId` + `planMonth`) behavior.
- Respect `lockedMachineSystemId` (MachineSystem detail embedding) unchanged.

**Non-Goals:**
- No backend/Prisma/ROUTE_MAP changes.
- No change to the `records` pill (`MaintenanceRecordList`) or to `MaintenanceRecordForm`/`useMaintenanceRecords`.
- No new backend endpoint for "list codes" — navigator is derived from the existing list query.
- No virtualized grid or new table component; reuse `PlanCard` table structure, just render one.

## Decisions

- **Single-plan source of truth: URL `planId` + filtered set.** `planId` in the URL is primary. If absent, select the first id from the filtered set after it loads. If the filtered set changes and the current `planId` is no longer in it, re-select first. If the set is empty, show empty state. Alternative considered: local state only — rejected because deep-links/bookmarks and back/forward would break.
- **Two queries locally: `list` for navigator + `detail` for the active plan.** Keep `useMaintenancePlans` with a capped `limit` (e.g., 200) to fetch the navigable set (ids/codes for dropdown + order for Prev/Next). Fetch the active plan via `useMaintenancePlan(planId)` (or reuse the entry from the list if it already contains `items/logs` — prefer `detail` for correctness after writes). Alternative: single detail fetch + backend "neighbors" endpoint — rejected (requires backend change).
- **Remove `planPage` pagination UI.** The plans view no longer pages 5 cards. `planPage` is ignored after this change (kept in URL parsing for backward compat, then stripped). Prev/Next now walks the *plan index*, not the page index.
- **Dropdown: searchable combobox over `maKeHoach` (+ system name).** Reuse existing list for options; filter client-side by substring of `maKeHoach` / `machineSystem.tenHeThong`. Alternative: native `<select>` — rejected for long lists.
- **Single-modal invariant via a small modal coordinator in `MaintenancePlanList`.** A helper `openLogModal(state)` first clears `modalMode`/`viewingPlan` if open, then sets `logModal`. `closeLogModal` does not auto-reopen the form. Z-index: log modal renders after the form in JSX and uses a higher backdrop layer — made explicit in `MaintenanceLogModal` with a prop or wrapper if needed. Alternative: global modal context — rejected as overkill.
- **Optimistic update compatibility.** Existing `useToggleMonth`/`useUpdateLogNote` optimistic handlers target `maintenancePlanKeys.lists()` and `details()`. After the change, both keyspaces remain invalidated, so no rewrite. If detail is the active plan, invalidation refreshes it.
- **Keep `MaintenancePlanForm` as a modal (view/edit/create) rather than inline panel.** Minimizes churn; the single-modal rule prevents stacking. Alternative: inline form under the grid — deferred.

## Risks / Trade-offs

- **Large filtered set (hundreds of plans) fetched with `limit: 200` may truncate navigator.** → Mitigation: cap documented, and "load more" / search narrows the set; for very large installs, show a note "Hiển thị 200 kế hoạch gần nhất — hãy lọc thêm".
- **Stale `planId` after filter change races.** → Mitigation: effect that re-selects first id whenever the fetched id list changes and current `planId` is missing.
- **Deep-link `planMonth` highlight timing.** Grid scrolls to month after detail query resolves; keep existing `requestAnimationFrame` scroll but target the single grid container.
- **URL churn from filter + navigator sync.** → Mitigation: single `updateParams` with `replace: true` and `syncingRef` guard already in place; keep it.

## Migration Plan

1. Update `MaintenancePlanList.tsx` to single-plan view + navigator + modal coordinator + empty state; remove card-map pagination.
2. Touch `useMaintenancePlans.ts` only if a small helper for capped filtered-list fetch is needed (otherwise no change).
3. Update `MaintenanceTab.tsx` URL param handling to deprecate `planPage` in plans view (strip on entry, ignore in sync).
4. Verify: `frontend npx tsc --noEmit -p tsconfig.app.json` 0 errors, `npm run lint` no new errors, manual 7-tab click + `maintenance` filter + Prev/Next + dropdown + deep-link `?tab=maintenance&mView=plans&planId=...&planMonth=...` + log modal vs form stacking.
5. Rollback: revert the frontend files; no migration or backend change.

## Open Questions

- None.
