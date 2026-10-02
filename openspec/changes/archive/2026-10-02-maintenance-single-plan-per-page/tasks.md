## 1. Single-plan view + plan navigator (MaintenancePlanList)

- [ ] 1.1 Replace the 5-card paginated list with a single-plan detail render: exactly one `PlanCard` full-width T1–T12 grid for the active `planId`; remove card-map `plans.map` and page-clamp effect for plans view
- [ ] 1.2 Add filtered-set fetch for navigator: call `useMaintenancePlans` with capped `limit: 200` (same filters except paging) to derive ordered `{ id, maKeHoach, tenHeThong }[]` for dropdown + Prev/Next indexing; show truncation note when `total > 200`
- [ ] 1.3 Fetch and render the active plan via `useMaintenancePlan(activePlanId)` (fallback to entry from filtered set if detail not yet loaded); wire `activePlanId` resolution from URL `planId` or first id in filtered set
- [ ] 1.4 Build plan navigator UI: searchable dropdown (filter by `maKeHoach` / system name substring) + Prev/Next buttons disabled at ends; navigator respects current filters (`planQ`, `nam`, `machineSystemId`, `trangThai`, `lockedMachineSystemId`)
- [ ] 1.5 Remove `planPage` pagination UI from plans view; keep parsing for backward compat but ignore/strip it on entry to plans view
- [ ] 1.6 Add empty/loading/error states for single-plan view: empty state with "Create plan" CTA when filtered set is 0; skeleton for grid while list/detail loading; inline retry on error ← (verify: empty filter → empty state with CTA; loading shows skeleton not empty flash; navigation Prev/Next and dropdown update `planId` and grid)

## 2. Single-modal invariant + stacking fix

- [ ] 2.1 Enforce single-modal invariant in `MaintenancePlanList`: `openLogModal` auto-closes `MaintenancePlanForm` (clear `modalMode`/`viewingPlan`) before setting `logModal`; `closeLogModal` does not auto-reopen form
- [ ] 2.2 Ensure log modal renders above with its own backdrop and focus trap: render `MaintenanceLogModal` after the form in JSX and make stacking explicit (higher z/backdrop); month cell click opens only the log modal
- [ ] 2.3 Keep tick/edit flow in `OccurrenceRow` unchanged (toggle + `nguoiThucHien`/`nguoiPhu`/`ghiChu`) and verify no overlay of plan form remains ← (verify: with detail form open, clicking month closes form and shows only log modal; closing log does not reopen form; tick updates grid after invalidation)

## 3. URL, deep-link, and filter sync (MaintenancePlanList + MaintenanceTab)

- [ ] 3.1 Make URL `planId` source of truth: on mount/load, if `planId` missing select first id in filtered set and `replace` URL; if `planId` not in filtered set after filter change, fall back to first; keep `planMonth` highlight/scroll after detail loads
- [ ] 3.2 Keep filter toolbar behavior (search `planQ`, year `nam`, system `machineSystemId`, status `trangThai`) and ensure filter change resets navigator to first plan and updates `planId` in URL (replace)
- [ ] 3.3 Preserve `MaintenanceTab` pills (`mView=plans|records`) and `TechnicalQuality` `?tab=maintenance` routing; deprecate `planPage` in plans view (strip on entry, ignore in sync); records pill unchanged ← (verify: `?tab=maintenance&mView=plans&planId=<id>&planMonth=5` highlights/scrolls T5; back/forward and filter change keep URL and grid in sync; records pill unaffected)

## 4. Verification

- [ ] 4.1 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` passes with 0 errors; `npm run lint` introduces no new errors in changed files ← (verify: typecheck 0 errors, lint no new errors)
- [ ] 4.2 Manual: `?tab=maintenance` filter + Prev/Next + dropdown + deep-link `planId`/`planMonth` + log modal vs form stacking + 7-tab click + F5 + records pill smoke test ← (verify: 7-tab nav, plans single-plan nav, deep-link, modal invariant, and records unchanged)
