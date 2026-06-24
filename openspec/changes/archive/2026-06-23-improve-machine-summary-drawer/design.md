## Context

MachineSummaryDrawer is the central profile view for machine systems in the ERP. Currently, `getSummary` returns 7 data sources via Promise.all but omits 3 existing MachineSystem relations (maintenancePlans, finishedProducts, qualityEvaluations) and doesn't expose parentSystem/clonedSystems lineage. The frontend MachineSystemSummary type mirrors this limited shape. The general tab omits several fields from the MachineSystem model (loaiHeThong, maThietBi, tenThietBi, fileDinhKem, timestamps). The faults tab ignores handoverItems despite the backend already returning them.

## Goals / Non-Goals

**Goals:**
- Surface all MachineSystem schema fields in the general tab
- Display AcceptanceHandover items in the faults tab (data already returned)
- Extend getSummary with maintenancePlans, finishedProducts, qualityEvaluations, parentSystem, clonedSystems count
- Add "Nghiệm thu" metric to the summary metrics row
- Keep API backward compatible (additive only)

**Non-Goals:**
- No Prisma schema changes or migrations
- No new tabs (production data tab deferred)
- No audit trail for MachineSystemDetail changes
- No changes to MachineStatusLog model or toggle behavior

## Decisions

**1. Additive API shape (no schema migration)**
- Rationale: All data already exists in Prisma relations. We only need to include them in the query. No new tables, columns, or migrations needed.
- Alternative: Create a separate `/summary-v2` endpoint → rejected, unnecessary fragmentation since existing shape is additive.

**2. Promise.all pattern for new data sources**
- Rationale: getSummary already uses Promise.all for parallel fetching. Adding 3 more queries follows the established pattern and keeps latency minimal.
- Alternative: Nested include on the main machine query → rejected, would make the single query very heavy and harder to limit independently.

**3. parentSystem via select (not full include)**
- Rationale: Only need id, maHeThong, tenHeThong for the lineage display. Full include would pull unnecessary data.
- clonedSystems: return count only via `_count` to avoid N+1.

**4. Frontend: inline sections in existing tabs (not new tabs)**
- Rationale: The drawer already has 6 well-organized tabs. Adding fields to general tab and a section to faults tab is lower cognitive load than adding a 7th tab for what amounts to a few data points.

**5. Grid adjustment from 6 to 7 columns**
- Rationale: Adding "Nghiệm thu" as the 7th metric. Use responsive `lg:grid-cols-7` (with sm fallback as-is).

## Risks / Trade-offs

- [Performance] Adding 3 more parallel queries to getSummary → Mitigated by SummaryLimits (default 5 each) and Promise.all parallelism.
- [Backward compat] Old frontends won't break since new fields are additive → No risk, undefined fields are simply unused.
- [7-column grid] On smaller screens, 7 items may wrap oddly → Mitigated by existing responsive breakpoints (grid-cols-2 sm, grid-cols-3 md).
