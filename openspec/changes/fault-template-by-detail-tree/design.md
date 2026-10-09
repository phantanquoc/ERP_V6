# Design — fault-template-by-detail-tree

## Context

See `proposal.md` for motivation. Current state:
- `FaultTemplate.machineSystemDetailId` FK `onDelete: SetNull` — deleting a detail orphans templates silently.
- `MachineSystemDetail.delete()` blocks when `faultTemplates > 0` or `childDetails > 0`, but `deactivate()` has no guard and `parentDetailId` move only validates cycle/same-system, not template refs.
- `FaultTemplateService.create/update` calls `validateMachineDetail` **outside** the `$transaction` — race window.
- `MachineSystemService.clone()` BFS-copies the detail tree with `oldToNew` map but does not copy templates.
- Frontend `FaultRecordList` template tab is a flat paginated table; `MachineSummaryDrawer` tree has no template awareness.

Constraints: no new Prisma models or migrations; `ROUTE_MAP` in `backend/src/routes/index.ts` must register any new route; status transitions stay server-side; follow `Prisma → service → controller → route → hook → component` order.

## Goals / Non-Goals

**Goals:**
- Make every template row explain its tree position (or lack thereof) and degrade visibly when that position goes stale.
- Make subtree queries and per-node counts cheap and correct for trees up to ~100 nodes/system.
- Close the validate-outside-tx race without changing the external API shape.

**Non-Goals:**
- New tables, enums, or FK changes.
- Drag-and-drop reordering of templates across nodes.
- Template versioning / snapshot of `tenChiTiet` at creation time (P2, deferred).
- Replacing the flat template table — it stays as default view; tree and grouped views are additive.

## Decisions

### 1. Subtree expansion — service-side BFS, not recursive SQL

`GET /fault-templates?machineSystemDetailId=X&includeSubtree=true` resolves descendant IDs by loading `machineSystemDetail` rows for the system once (`findMany where machineSystemId = detail.machineSystemId`) and BFS-traversing `parentDetailId` in memory. Result set is `WHERE machineSystemDetailId IN expandedIds`.

- *Why not recursive CTE:* trees are small (max ~100 nodes/system), DB round-trip for CTE adds complexity for no measurable gain; in-memory BFS is testable without raw SQL and reuses the same traversal as `MachineSummaryDrawer.buildTreeData`.
- *Alternative considered:* `$queryRaw` with `WITH RECURSIVE` — rejected for now; can swap later behind same service method if profiling shows need.

Count endpoint for tree badges reuses the same expansion: `countByDetailIds(ids)` or a single `groupBy machineSystemDetailId` for the whole system, then sums per subtree in memory.

### 2. Orphan & inactive-detail filters — query-level, not post-filter

- Orphan: `where.machineSystemDetailId = null` (Prisma `equals: null`). UI shows `tenDetailGoiY/loaiDetailGoiY` when present, else "—".
- Inactive-detail: `where.machineSystemDetail.hoatDong = false` via relation filter. Badge rendered when `template.machineSystemDetail?.hoatDong === false`; row not hidden by default.

*Alternative:* soft-delete flag on template — rejected, FK SetNull already covers orphaning.

### 3. Transactional validation — move `validateMachineDetail` inside `$transaction`

`create`/`update` will accept an optional `tx: Prisma.TransactionClient` in `validateMachineDetail` (already has the param, currently defaulting to `prisma`) and call it **inside** the `$transaction` callback, using `tx.machineSystemDetail.findUnique`. The outer pre-check is removed.

### 4. Move guard — reject cross-system moves when templates exist

`MachineSystemDetailService.update` checks `prisma.faultTemplate.count({ where: { machineSystemDetailId: id } })` when `machineSystemId` changes; if `> 0`, throws `ValidationError('Chi tiết đang được mẫu lỗi tham chiếu, không thể chuyển hệ thống')`. Keeps the fix minimal; no auto-sync of `FaultTemplate.machineSystemId` (would be surprising side-effect).

### 5. Tree counts — single aggregated query per system

New service method `getTemplateCountsBySystem(machineSystemId)` does one `groupBy` on `faultTemplate` by `machineSystemDetailId` for that system plus one `findMany` for the detail tree, then computes `directCount` and `subtreeCount` per node in memory. Frontend `MachineSummaryDrawer` calls this once per drawer open and caches via TanStack Query. Avoids N+1 per node.

### 6. Clone with templates — opt-in flag, same transaction

`POST /machine-systems/:id/clone` gains optional body field `includeFaultTemplates?: boolean`. When true, after the BFS detail clone builds `oldToNew`, iterate source `FaultTemplate` rows, create new rows with `maMauLoi = nextCode()`, `machineSystemId = newSystem.id`, `machineSystemDetailId = oldToNew.get(oldId) ?? null`, and bulk-copy `RepairStep`s per template. All inside the existing `$transaction`. Default `false` preserves current behavior.

### 7. Deactivate cascade — UI-driven, not automatic

Backend exposes helper `deactivateTemplatesForSubtree(subtreeIds)` (`updateMany`). Frontend `MachineSystemDetailFormModal` / drawer deactivate flow fetches subtree template count first; if `> 0`, shows confirm dialog "Có N mẫu liên quan — dừng luôn?". No automatic cascade on the service `deactivate()` itself — user explicitly opts in.

### 8. Coverage grouping — frontend-only

"Nhóm theo chi tiết" is a client-side grouping of the already-fetched template page plus a separate fetch of `machineSystemDetails` for the filtered system to render zero-template groups. No new backend endpoint; keeps pagination simple (grouping applies to current page, with note about full-system view).

## Risks / Trade-offs

- **Stale counts after tree mutation outside drawer** → Mitigation: invalidate `faultTemplateKeys` and `detailTree` queries on detail create/update/deactivate success.
- **Subtree expansion could miss deeply nested nodes if detail fetch is paginated** → Mitigation: use `getTree(machineSystemId, 2000)` (uncapped) for expansion, not the paginated `list`.
- **Clone with many templates may bloat transaction** → Mitigation: cap at ~200 templates/system (realistic); transaction timeout is acceptable for this admin operation.
- **Orphan templates lose discoverability** → Mitigation: orphan filter is prominent and `tenDetailGoiY` hints preserved; no auto-delete of orphans.

## Migration Plan

1. Deploy backend first (new query params are optional, old clients unaffected).
2. Deploy frontend second (new filters/badges/tree UI).
3. No data migration; existing orphans immediately appear in orphan bucket.
4. Rollback: revert backend — new params ignored; revert frontend — no orphan UI. No DB to roll back.

## Open Questions

- None blocking — P2 items (audit log, bulk reassign, versioning) intentionally deferred.
