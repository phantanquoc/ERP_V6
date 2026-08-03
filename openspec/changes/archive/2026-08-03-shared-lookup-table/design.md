## Context

Classification labels (unit of measure, expense type, material category, etc.) are scattered across the codebase in multiple forms:
- Frontend constants (`constants/units.ts` with 13 values)
- Component-specific arrays (`ProductFormModal.tsx` with 10 different values)
- Enum types in some places, plain strings in others

This fragmentation has caused real bugs: 10 products in production have units (`Đôi`, `Can`, `Xe`, `Bịch`, `Xô`, `Miếng`) that exist in one constant but not the other, breaking auto-fill in warehouse forms. The current architecture prevents administrators from managing these values—adding a new unit requires code changes and deployment.

Production audit revealed 21 columns across 20 tables store unit-of-measure as string, and 4 more columns store material categories. Any attempt to standardize values (e.g., merge `"văn phòng phẩm"` into `"Văn phòng phẩm"`) requires manual SQL updates across multiple tables with risk of data loss.

**Stakeholders:** Admin users managing classification values, warehouse staff using forms, developers maintaining lookup constants.

**Constraints:**
- Zero data loss—no migration can drop or corrupt existing values
- No breaking changes to existing API contracts
- Backward compatibility for frontend components during migration window
- Cascade renames must be atomic (all-or-nothing)

## Goals / Non-Goals

**Goals:**
- Single source of truth for all classification labels in database
- Admin self-service for adding, renaming, hiding classification values
- Safe cascade rename that updates all referencing columns transactionally
- Audit trail for all modifications with rollback capability
- Fix the unit-of-measure auto-fill bug by unifying dropdown sources
- Preserve all existing data with zero loss guarantee

**Non-Goals:**
- Convert string columns to foreign keys (too high migration risk, out of scope)
- Modify Prisma enum types (enums are code-level, not database-dynamic)
- Merge `mucDoUuTien` inconsistency (separate bug, different solution needed)
- Create UI for rollback operations (admin can request rollback SQL from support)
- Support for nested/hierarchical classifications (flat list only)
- Internationalization of classification labels (Vietnamese only for now)

## Decisions

### Decision 1: Single polymorphic Lookup table vs separate tables per group

**Chosen:** Single `Lookup` table with `group` discriminator column.

**Rationale:**
- 11 groups share identical structure (code, label, sortOrder, isActive)
- Adding a new group requires only seed data, not new migration
- Service layer is unified—one set of CRUD methods serves all groups
- Simpler to query across groups for admin dashboards

**Alternative considered:** Separate tables (`UnitOfMeasure`, `ExpenseType`, etc.)
- **Rejected because:** Would require 11 nearly-identical services, 11 sets of routes, and 11 migrations for any structural change

**Trade-off:** Single table requires `group` in every query (handled by indexed composite key `[group, code]`).

### Decision 2: Hard-coded column mapping vs database-driven mapping table

**Chosen:** Hard-coded `LOOKUP_COLUMN_MAP` constant in service layer.

**Rationale:**
- Column mapping is structural knowledge that changes rarely (only when schema evolves)
- Hard-coding makes cascade logic explicit and auditable in code review
- No runtime query overhead to fetch mapping
- Type safety—TypeScript can validate table/column names at build time

**Alternative considered:** Store mappings in database table `LookupColumnMapping`
- **Rejected because:** Adds complexity without real benefit—mapping changes are infrequent and should go through code review like schema changes

**Trade-off:** Adding a new column requires code change. Acceptable because schema changes already require migration files.

### Decision 3: Cascade rename vs require manual cleanup

**Chosen:** Implement transactional cascade rename with user confirmation.

**Rationale:**
- Manual cleanup across 21 unit columns is error-prone and risky
- Admins need self-service standardization (merge case variants like `"kg"` / `"Kg"`)
- Transaction rollback provides safety net
- Audit trail enables rollback if issues discovered later

**Alternative considered:** Block renames when `usageCount > 0`, require manual SQL
- **Rejected because:** Defeats purpose of admin self-service, perpetuates data inconsistency

**Trade-off:** Cascade operations take longer and lock tables briefly. Acceptable because these are infrequent admin operations, not user-facing flows.

### Decision 4: Soft delete only vs hard delete

**Chosen:** Soft delete only (set `isActive=false`), hard delete explicitly forbidden.

**Rationale:**
- Protects against accidental deletion of in-use values
- Preserves audit trail for historical records
- Allows reactivation if admin changes mind
- Aligns with zero-data-loss requirement

**Alternative considered:** Allow hard delete after verifying `usageCount=0`
- **Rejected because:** Even unused values may have historical significance, and recovery from accidental hard delete is impossible

**Trade-off:** Lookup table grows over time with soft-deleted entries. Acceptable—these are small reference tables.

### Decision 5: Auto-generate code from label vs user-specified code

**Chosen:** Auto-generate `code` from `label` using existing `slugifyToUpperCode` utility.

**Rationale:**
- Enforces consistent naming convention (UPPER_SNAKE_CASE)
- Removes cognitive load from admin—they only think about display label
- Reuses proven utility already in codebase
- Code is for API/URL stability, not user-facing

**Alternative considered:** Let admin specify both label and code
- **Rejected because:** Increases chance of typos, inconsistent casing, and conflicts

**Trade-off:** Auto-generation may produce non-intuitive codes for complex labels. Acceptable because code is internal; label is what users see.

### Decision 6: Audit trail in separate table vs embedded JSON in Lookup

**Chosen:** Separate `LookupChangeLog` table with immutable rows.

**Rationale:**
- Unbounded history—doesn't bloat Lookup table
- Immutable pattern prevents tampering
- Easier to query/filter history by date range or action type
- Enables future features like "show all changes in last 7 days"

**Alternative considered:** Store history as JSONB array in `Lookup.changeHistory`
- **Rejected because:** Harder to query, no indexing on nested JSON, row size grows over time

**Trade-off:** Extra join to fetch history. Acceptable because history is only viewed on-demand in admin UI.

### Decision 7: Migration strategy - seed vs manual entry

**Chosen:** Seed 11 groups from production audit in migration. **As built: 74 values** (the 69 figure was a pre-implementation estimate; a direct dev/prod query superseded it — `DON_VI_TINH` came in at 23, `LOAI_CHI_PHI_XUAT_KHAU` at 1).

**Rationale:**
- Immediate value on deployment—dropdowns work from day one
- Preserves exact production values including case/diacritics
- Repeatable—can run seed script in dev/staging/prod consistently
- Idempotent—unique constraint prevents duplicates on re-run

**Alternative considered:** Empty seed, admins manually add all values via UI
- **Rejected because:** Too much manual work, risk of typos, dropdowns broken until complete

**Trade-off:** Seed data must be maintained in code. Acceptable—it's a one-time bootstrap.

### Decision 8: Frontend cache strategy

**Chosen:** TanStack Query with auto-invalidation on mutations.

**Rationale:**
- Already used throughout frontend for other resources
- Automatic cache invalidation after create/update/delete
- Optimistic updates for instant UI feedback
- Built-in retry and loading states

**Alternative considered:** Custom fetch layer with manual cache busting
- **Rejected because:** Reinventing what TanStack Query already does well

**Trade-off:** Dependency on TanStack Query patterns. Acceptable—it's already a core dependency.

## Risks / Trade-offs

### Risk: Cascade rename takes too long, locks tables

**Mitigation:**
- Run cascade operations in background transaction (user sees spinner)
- Timeout after 30 seconds with rollback
- Add database indexes on affected columns for faster WHERE clause evaluation
- Monitor query performance in production after deployment
- Document expected duration based on affected record count

### Risk: Transaction rollback leaves inconsistent state

**Mitigation:**
- Wrap entire cascade in `prisma.$transaction` with serializable isolation
- Audit log entry is written inside same transaction
- Test rollback scenarios explicitly in `lookupService.test.ts`
- Dry-run capability: admin can preview affected records before confirming

### Risk: Hard-coded LOOKUP_COLUMN_MAP gets out of sync with schema

**Mitigation:**
- Add comment in schema files pointing to LOOKUP_COLUMN_MAP
- CI check (future): script that parses schema and validates mapping completeness
- Test coverage: cascade tests cover all mapped groups
- Code review checklist: "Did you update LOOKUP_COLUMN_MAP?"

### Risk: Frontend components bypass useLookups and hardcode values

**Mitigation:**
- Deprecate `constants/units.ts` with clear comment directing to `useLookups`
- ESLint rule (future): warn on imports from deprecated constants
- Code review: check new PRs don't reintroduce hardcoded classification arrays

### Risk: Admin accidentally renames wrong value, no undo button

**Mitigation:**
- Confirmation dialog shows old/new label and affected record count
- Audit trail enables manual rollback via support ticket
- Future enhancement: add "Revert this change" button in UI that calls rollback SQL endpoint

### Risk: Seed data conflicts with manually-added values in production

**Mitigation:**
- Seed uses `upsert` with `(group, code)` unique constraint
- If conflict occurs, seed skips that row (idempotent)
- Deployment runbook: check for conflicts before running seed

### Risk: Soft-deleted values accumulate over time

**Mitigation:**
- Admin UI shows count of inactive entries
- Future enhancement: archive soft-deleted entries older than 1 year to separate table
- Acceptable trade-off: these tables are small (hundreds of rows, not millions)

## Migration Plan

### Phase 1: Database setup (backward compatible)
1. Run migration to create `Lookup` and `LookupChangeLog` tables. **As built:** `prisma migrate dev` is unusable on this repo (shadow-DB replay failure + pre-existing drift emitting unrelated `DROP COLUMN`s), so migration `20260803000000_create_lookup_tables` was hand-written and applied via `psql --single-transaction`. See proposal.md → "Follow-up REQUIRED".
2. Run seed script to populate 11 groups with **74** values
3. No existing code breaks—new tables are additive
4. Rollback: drop tables, no data loss elsewhere

### Phase 2: Backend API (backward compatible)
1. Deploy lookupService, lookupController, lookupRoutes
2. Register `/api/lookups` in ROUTE_MAP
3. No existing endpoints affected
4. Rollback: remove routes from ROUTE_MAP, existing endpoints unchanged

### Phase 3: Frontend admin UI (isolated)
1. Deploy LookupManager component and useLookups hook
2. Add "Shared Classifications" tab to settings page
3. No existing UI affected
4. Rollback: remove tab, existing admin pages unchanged

### Phase 4: Migrate UnitSelect (breaking for unit dropdown)
1. Change `UnitSelect` to use `useLookups('DON_VI_TINH')`
2. Update 11 components that use UnitSelect
3. Mark `constants/units.ts` as deprecated
4. **Breaking:** Dropdowns now pull from database—if seed failed, dropdowns empty
5. Rollback: revert UnitSelect to use constants, redeploy frontend

### Phase 5: Validation and monitoring
1. Smoke test: admin renames a test lookup, verify cascade works
2. Monitor API logs for 500 errors on `/api/lookups/*`
3. Check frontend errors in Sentry for `useLookups` failures
4. Validate all 11 groups have expected row counts (74 total)

**Rollback strategy:**
- Phase 1-3: Remove new tables/routes/components, no impact to existing features
- Phase 4: Redeploy frontend with reverted UnitSelect, dropdowns work again from constants
- Data rollback: Use audit trail to generate rollback SQL for any cascade operations

**Deployment order:** Backend first (Phase 1-2), then frontend (Phase 3-4) to avoid API 404s.

## Resolved Questions

**Q1: Should cascade rename be async (background job) or synchronous? — RESOLVED: Synchronous**
- Cascade runs inside a single request, wrapped in `prisma.$transaction`, with a 30s timeout
- Frontend shows a non-dismissible modal with spinner and "Updating N records..." until the request resolves
- Rationale: current data volumes are small (largest group touches ~130 rows), errors surface immediately, and no job queue infrastructure is needed
- If volumes grow enough to hit the timeout, revisit with a background job

**Q2: Should inactive lookups appear in dropdowns for editing old records? — RESOLVED: Yes, in edit mode only**
- Create/new-record forms list only `isActive=true` entries
- Edit forms for an existing record MUST additionally include the record's current value even when that lookup is `isActive=false`, rendered with an "(đã ẩn)" suffix
- Rationale: this is a zero-data-loss requirement. If a hidden value were omitted, opening and saving an existing record would silently blank out a valid stored value
- Implementation: `useLookups(group, { includeValue })` — when `includeValue` is supplied and not present in the active list, the hook fetches it via `all=true` and appends it
- The appended inactive entry MUST NOT be selectable for other records, only preserved for the one being edited

## Open Questions

**Q3: Should we add full-text search for lookup labels in admin UI?**
- **Current:** 74 values, easily scrollable
- **Future:** If groups grow to hundreds of values, search becomes necessary
- **Decision:** Defer until needed, add in future enhancement
