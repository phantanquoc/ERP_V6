# Proposal: Fault Template by Detail Tree

## Why

Fault templates (`FaultTemplate`) are currently managed as a flat list disconnected from the machine detail tree (`MachineSystemDetail`: THIET_BI > CUM > LINH_KIEN > DIEM_KIEM_TRA). Creating a template requires picking a detail from a long flat dropdown, coverage gaps are invisible, and tree mutations (rename/move/deactivate/clone) leave templates orphaned, stale, or miscounted. The fault template page needs to be resilient to every tree change and guide users to attach templates to the right specific detail.

## What Changes

- **P0 — Resilience to tree mutations (must-have):**
  - Inactive-detail badge + filter: templates whose `machineSystemDetail.hoatDong=false` show a warning badge; list supports filtering to "only templates with inactive detail".
  - Orphan bucket: filter/tab "Unlinked" (`machineSystemDetailId IS NULL`) showing both intentional common templates (`tenDetailGoiY/loaiDetailGoiY`) and orphaned ones after deletion; hint columns displayed instead of "—".
  - Move `validateMachineDetail` inside `prisma.$transaction` to close create/update race.
  - Guard `MachineSystemDetail.update` when `machineSystemId` changes while templates still reference the detail — reject with `ValidationError` (or auto-sync `FaultTemplate.machineSystemId`).

- **P1 — Tree-bound UX (should-have):**
  - Detail tree in `MachineSummaryDrawer` shows per-node template counts (direct + subtree, e.g. `2 / 5`), inline "Add template" CTA prefilled with `machineSystemId/detailId`, and an expandable child panel listing that node's templates.
  - New query param `includeSubtree=true` on `GET /fault-templates?machineSystemDetailId=X` — server resolves descendant detail IDs and returns templates for the whole subtree.
  - Coverage view toggle "Group by detail" in the template tab — groups rows by `tenChiTiet`, including details with 0 templates for the filtered system so gaps are visible.
  - Clone system opt-in: checkbox "Also copy fault templates" in clone dialog; when checked, clones `FaultTemplate` + `RepairStep` rows remapping `machineSystemDetailId` via the existing `oldToNew` map, inside the same transaction.
  - Deactivate cascade suggestion: when deactivating a detail (especially a CUM/THIET_BI), dialog offers to bulk-deactivate related templates of the subtree (`updateMany` where `machineSystemDetailId IN subtreeIds`).

- No new Prisma models or migrations — all changes are service logic, query params, and frontend.

## Capabilities

### New Capabilities
- `fault-template-tree-binding`: Binding fault templates to the machine detail tree — per-node counts, subtree queries, orphan handling, inactive-detail awareness, clone-with-templates, and coverage grouping.

### Modified Capabilities
- `fault-records`: Add tree-aware filters (inactive-detail, unlinked), `includeSubtree` query semantics, transactional validation, and the tree+template UI contract. Existing fault-records requirements remain unchanged.

## Impact

- **Database:** No migration. Uses existing FK `onDelete: SetNull` and columns `tenDetailGoiY/loaiDetailGoiY`.
- **Backend:** `faultTemplateService` (includeSubtree, tx validation, orphan/inactive filters), `machineSystemDetailService` (move guard, deactivate helper for subtree), `machineSystemService.clone` (optional template clone), routes `GET /fault-templates` + `POST /machine-systems/:id/clone`.
- **Frontend:** `MachineSummaryDrawer` (tree badges + inline add + child panel), `FaultRecordList` template tab (badges, orphan filter, group-by toggle, prefill from tree), `MachineSystemList` clone dialog (checkbox), hooks `useFaultTemplates`/`useDetailTree`.
- **Breaking:** None — all new params/filters are optional, existing flat list keeps working.
