# Design: technical-supply-cost-tab

## Context

- `TechnicalQuality.tsx` currently has 7 tabs (`inspections|repairs|faults|machineSystems|maintenance|spareParts|orders`) with `ALL_TECH_PARAMS` cleanup, badge queries, and `?tab=` deep-link.
- `SupplyRequest` lives in `business` schema; `DEPT_TECHNICAL` membership is resolved via `User.departmentId` + `secondaryDepartments` (see `technicalAccess.ts:isTechnicalMember`). Existing `supplyRequestService.getAllSupplyRequests` filters by `departmentIds`/`subDepartmentIds` via `employee.user.departmentId`.
- `RepairSupplyLink` (common schema) bridges `RepairRequest` ↔ `SupplyRequest` via `supplyRequestId` (String) — no FK to `business.SupplyRequest`, just a string id.
- `GET /repair-requests/stats` already provides `costByMonth`/`costDetailByMonth`/`topExpensive`/`mttr`/`khongDatRate`; frontend has `RepairStatisticsDashboard.tsx` + `useRepairRequestStats`.
- See `proposal.md` for why; see `specs/technical-supply-cost/spec.md` + `specs/supply-request-multi-item/spec.md` for requirements.

## Goals / Non-Goals

**Goals:**
- Single tab that answers "what did Technical request" and "what did repairs cost" without leaving Technical page.
- Additive backend change — 3 new query params + one enriched field, no migration.
- Reuse existing chart/logic for repair cost; keep Block 2 dependency minimal.

**Non-Goals:**
- New `/supply-requests/stats` endpoint, `vatTuThucTe` aggregation (Purchasing → warehouse cost), or RBAC beyond filter.
- Design-system overhaul, new chart library, or i18n.

## Decisions

**1. `technicalOnly` resolution — DB lookup, not `boPhan` string.**
`boPhan` is denormalized and unreliable. On `technicalOnly=true`, resolve `DEPT_TECHNICAL` department id(s) → collect `User` ids whose `departmentId` or `secondaryDepartments.departmentId` matches → filter `SupplyRequest` via `employee.userId IN (…)`. This mirrors `isTechnicalMember` but batched. Alternative (filter by `boPhan = 'Kỹ thuật'`) rejected: breaks when department renamed or user has secondary assignment.

**2. `linkedToRepair` via `RepairSupplyLink` existence.**
`linkedToRepair=true` → `where: { id: { in: supplyIdsWithLink } }` via `prisma.repairSupplyLink.findMany({ distinct: ['supplyRequestId'] })` then filter; `false` → `notIn`. Alternative (Prisma relation filter) not viable — `RepairSupplyLink` is in `common` schema, `SupplyRequest` in `business`, no Prisma relation. Two-query approach is acceptable (YCCC volume modest). Optimize by caching distinct ids per year window if needed.

**3. `year` filter on `ngayYeuCau`.**
`year=2026` → `ngayYeuCau gte 2026-01-01T00:00:00, lte 2026-12-31T23:59:59.999`. Invalid → 400 (reuse `year` validation from `repairRequestController.getStats`).

**4. `supplyLinks` enrichment — batch fetch, not per-row N+1.**
After `findMany` for page, collect `supplyRequestIds`, fetch `RepairSupplyLink` + `RepairRequest` (`id, maYeuCau, trangThai`) in one query, group by `supplyRequestId`, attach to each row. Distinct by `repairRequestId`. Empty array when none.

**5. Frontend: single `TechnicalSupplyCostTab.tsx` with two blocks, shared URL filters.**
Proposed structure:
- Header filters: `year` (select), `dateFrom`/`dateTo` (date inputs, reuse `stats` pattern where `dateFrom/dateTo` overrides `year`), plus block-local `supplyStatus`/`supplyLoai`/`supplyLinked`.
- Block 1: KPI row (counts by status derived from fetched page or separate `count` query), toggle All/Linked, table (10/page) with pagination controls, click `maYeuCau` → supply detail (or toast if no detail modal yet), chip list for `supplyLinks` with `maYeuCau` clickable → `RepairRequestFormModal` view.
- Block 2: reuse `useRepairRequestStats({year, dateFrom, dateTo, phongBanId})` + chart/table/KPI rendering extracted or duplicated (keep duplication small; extracting `CostByMonthSection` is follow-up if needed).
- State: TanStack Query for both blocks independently so one error doesn't kill the other. `useSearchParams` for all filters.

**6. Tab wiring — additive, no pill removal.**
Add `supplyCost` to `TabType`, append to `tabs[]` (label "Vat tu & Chi phi"), extend `ALL_TECH_PARAMS` with `supplyStatus, supplyLinked, supplyLoai`, add `deepSupplyCost` check in deep-link resolver (optional), add render branch `{activeTab === 'supplyCost' && <SectionCard><TechnicalSupplyCostTab/></SectionCard>}`. Badge for supplyCost is optional (count Technical YCCC pending) — defer unless requested.

## Risks / Trade-offs

- **Cross-schema join cost** (`business` → `common`) → Mitigation: two-query batch + distinct; dataset is small (YCCC yearly volume low). Add pagination limit; no full scan.
- **DEPT_TECHNICAL code drift** → Mitigation: reuse `TECHNICAL_DEPARTMENT_CODE` constant if exported; otherwise query by `code = 'DEPT_TECHNICAL'` (canonical, not display name).
- **`RepairSupplyLink` without FK** (string id, no referential integrity) → Mitigation: enrichment tolerates orphan links (skip missing `RepairRequest`); no cascade delete assumption.
- **URL param sprawl** → Mitigation: all `supply*` params in `ALL_TECH_PARAMS` so tab switch cleans them; keep names consistent (`supplyStatus` not `trangThai` to avoid clash with other tabs).
- **Chart duplication** → Mitigation: v1 duplicates ~40 lines of cost chart; extraction is a refactor follow-up, not required for correctness.

## Migration Plan

- No DB migration. Deploy backend first (new query params ignored by old frontend), then frontend.
- Rollback: revert frontend tab addition; backend params are additive so old frontend continues to work.

## Open Questions

- None — `vatTuThucTe` aggregation deferred to follow-up; badge for supplyCost deferred.
