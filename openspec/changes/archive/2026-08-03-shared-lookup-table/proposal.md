## Why

Classification labels (unit of measure, expense type, material category, etc.) are currently hardcoded in frontend constants, creating multiple sources of truth. The unit-of-measure dropdown has 13 values while the product form has 10 different ones, causing auto-fill failures for 10 products in production. Administrators cannot add, rename, or hide classification values without code deployment, and data cleanup requires manual SQL updates across 21 unit columns plus the other mapped groups.

This change creates a single database-backed lookup table that serves as the authoritative source for all classification labels, with admin UI for self-service management and safe cascade rename operations.

## What Changes

- Create `Lookup` table in common schema with audit trail support (`LookupChangeLog` table)
- Seed 11 classification groups (**74 values** as built; the original estimate of ~69 was superseded by a direct dev/prod query) from production audit data
- Add CRUD API with cascade rename for labels used across multiple tables
- Add admin UI section "Shared Classifications" with usage count display and rename confirmation dialogs
- Migrate `UnitSelect` component and 11 dependent forms from static constants to API-backed data
- Add comprehensive test coverage for cascade operations (mandatory before merge)

## Capabilities

### New Capabilities
- `lookup-crud`: CRUD operations for classification labels with soft delete, usage tracking, and cascade rename across 21 mapped unit columns (plus the other groups' columns)
- `lookup-admin-ui`: Admin interface for managing classification groups with usage counts and safe rename operations
- `lookup-audit-trail`: Change history tracking for all lookup modifications with rollback capability

### Modified Capabilities
<!-- No existing capabilities are being modified - this is net new functionality -->

## Impact

**Database:**
- New tables: `Lookup` (common schema), `LookupChangeLog` (common schema)
- Affected columns: **21** columns for DON_VI_TINH group (not the 26 originally estimated — `labor_norms`, `cost_standards`, `invoice_items` do not exist in this schema and were removed), 6 for LOAI_CHI_PHI, 4 for PHAN_LOAI_VAT_TU
- `business.tax_reports.donViTinh` is `@map("donVi")` — raw SQL must target the real column `"donVi"`
- Migration: Zero data loss, no column type changes, seed-only additions. Migration `20260803000000_create_lookup_tables` was **hand-written** and applied via `psql --single-transaction` (see "Follow-up" below)

**Backend:**
- New files: `lookupService.ts`, `lookupController.ts`, `lookupRoutes.ts`, `lookupService.test.ts`
- Modified: `backend/src/routes/index.ts` (add `/lookups` to ROUTE_MAP)
- Seed data: `backend/prisma/seed-data/lookups.ts`

**Frontend:**
- New files: `useLookups.ts`, `LookupManager.tsx`, `types/lookup.ts`
- Modified: `UnitSelect.tsx` + 11 components that use it, `CategoryManagementSection.tsx`
- Deprecated: `constants/units.ts` (kept for backward compatibility)

**Risk areas:**
- Cascade rename operations touch production data across multiple tables (mitigated by mandatory tests + audit trail)
- Frontend cache invalidation after rename (mitigated by TanStack Query auto-invalidation)

---

## As-Built Outcomes (verified 2026-08-03)

**Seed counts — final:** **74 lookups across 11 groups** (spec originally estimated 69).
- `DON_VI_TINH` = **23**, not 19. The extra 4 (`kg`, `KG`, `Container`, `Lô`) are real production data the original audit missed.
- `LOAI_CHI_PHI_XUAT_KHAU` = **1** value, not 4 — verified identical on dev and prod.
- Codes carry a numeric disambiguator where `slugifyToUpperCode` collides (`DON_VI_TINH_KG` / `_KG_2` / `_KG_3`). **Cascade rename matches on `label`, never on `code`.**
- `LOAI_CHI_PHI` contains a value with a **trailing space** (`'sản xuất '`); cascade WHERE clauses match exactly, untrimmed.

**Design questions resolved during implementation** (recorded in design.md → "Resolved Questions"):
1. Cascade rename is **synchronous**, inside one `prisma.$transaction` with a 30s timeout, fronted by a non-dismissible spinner modal.
2. Inactive lookups are **excluded from create-mode dropdowns but retained in edit mode** via `useLookups(group, { includeValue })`, so a hidden stored value is never silently blanked.

### Verification results

| Check | Result |
|---|---|
| backend `tsc --noEmit` | 0 errors |
| backend `npm run lint` | 4 errors — pre-existing baseline, unrelated |
| frontend `tsc --noEmit -p tsconfig.app.json` | 0 errors, 0 `TS2304` |
| frontend `npm run lint` | 0 errors |
| `lookupService.test.ts` | 50/50 pass |
| full backend suite | 804 passed / 10 failed across 6 suites |

All 10 backend failures are confirmed **pre-existing and unrelated**: those 6 test files contain zero references to lookup code, and the services they exercise are unmodified by this change. The only tracked backend edit outside new files is a single additive line in `src/routes/index.ts`.

### Tasks 13.8–13.10 — substituted, not performed as written

No synthetic `supply_request_item` was created. The same three behaviours — cascade 409 confirmation, confirmed cascade, blocked delete — were exercised against the **real in-use value `'sản xuất '`**, which carries a trailing space and is therefore a *stricter* test than the scripted one. These remain unchecked in `tasks.md` with annotations preserved deliberately; do not read them as complete-as-written.

### Known-remaining gaps (carried forward, not resolved)

- Live **multi-table** cascade was only unit-tested, never exercised end-to-end.
- Cascade **rollback-on-failure** is covered by a mocked unit test only.
- The `tax_reports.donVi` `@map` cascade path is **unit-test-only**.
- Mobile layout uses **progressive column hiding**, not the card layout the `lookup-admin-ui` spec scenario describes.

---

## Follow-up REQUIRED — separate pre-existing defect (not caused by this change)

**`prisma migrate dev` is unusable on this repo.** This is out of scope here and needs its own decision; it is recorded so it is not buried.

- The shadow DB fails to replay migration `20260605000000_complete_technical_department_batch_a`.
- `migrate diff` reveals drift that would emit **destructive statements unrelated to any current change**: `DROP COLUMN` on `business.invoices` for `createdById` / `khachHang` / `nhaCungCap`, `DROP COLUMN business.tax_reports.createdById`, plus `DROP CONSTRAINT` / `DROP INDEX`.
- Those columns were **verified EMPTY on both dev and prod**, so no data has been lost yet.
- Consequently this change's migration was hand-written and applied via `psql --single-transaction`.

Reconciling schema-vs-DB requires its own change proposal.
