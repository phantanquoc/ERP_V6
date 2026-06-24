## Context

The fault record system (Phase A/B/C) provides CRUD, recurrence detection, stats, and heatmap for the "Cơ điện → Lỗi cơ điện" module. The current template selection uses a basic dropdown that doesn't scale as the template library grows. There is no structured way to capture repair procedures — technicians rely on tribal knowledge or external docs.

The existing Prisma schema uses split files under `backend/prisma/schema/`. The `FaultTemplate` and `FaultRecord` models live in `business_machines.prisma` within the `business` schema. The frontend uses TanStack Query hooks with key factories, and the backend follows the service → controller → route pattern with path aliases.

Key constraints:
- Multi-schema Prisma with `@@schema("business")` on all business models
- CUID IDs via `@id @default(cuid())`
- Child tables with cascade delete — no JSON columns
- Update children via delete-then-recreate pattern
- Permission split: `canCreate` (production users) vs `canMutate` (technical/admin)

## Goals / Non-Goals

**Goals:**
- Improve template discoverability via typeahead search (debounce 300ms)
- Enable auto-creation of templates when technical/admin users submit fault records without selecting one
- Introduce structured repair procedures (`RepairStep` model) tied to fault templates
- Provide a template detail summary view with occurrence count, recent records, timeline, and repair steps
- Allow CRUD of repair steps in template create/edit forms

**Non-Goals:**
- Drag-and-drop reorder for repair steps (use up/down buttons)
- AI-powered repair suggestions
- Photo/media attachments per repair step
- Modifying existing Phase A/B/C behavior
- Changing the status flow or recurrence detection logic

## Decisions

### 1. RepairStep as a child table of FaultTemplate

**Choice:** Separate `RepairStep` model with foreign key to `FaultTemplate`, cascade delete.

**Alternatives considered:**
- JSON array column on FaultTemplate → rejected (violates project rule: no JSON columns for structured data)
- Separate RepairProcedure parent entity → over-engineered for current needs

**Rationale:** Follows existing pattern (e.g., SupplyRequestItem, OrderItem). Enables querying, sorting, and future extension without JSON parsing.

### 2. Auto-create template in same transaction

**Choice:** When a `canMutate` user submits a fault record without `faultTemplateId`, the service creates both `FaultTemplate` and `FaultRecord` in a single `prisma.$transaction`.

**Alternatives considered:**
- Two-step flow (create template first, then record) → worse UX, user must leave modal
- Always auto-create for all users → risky, production users may create low-quality templates

**Rationale:** Single transaction ensures atomicity. Permission gate (`canMutate`) prevents template pollution from production floor users who just need to log faults quickly.

### 3. Typeahead via existing search endpoint

**Choice:** Reuse `GET /api/fault-templates?search=...` with a frontend debounced combobox (300ms). No new backend endpoint needed for search.

**Alternatives considered:**
- Dedicated autocomplete endpoint with different response shape → unnecessary, existing list endpoint already searches on `tenMauLoi`/`moTa`
- Client-side filtering of all templates → doesn't scale

**Rationale:** Backend search already filters on relevant fields. Frontend just needs a combobox UI that calls the existing hook with a search param.

### 4. Template summary as a new endpoint

**Choice:** `GET /api/fault-templates/:id/summary` returns aggregated data (count, recent 5, monthly timeline, repair steps).

**Alternatives considered:**
- Extend existing GET /:id with query param `?include=summary` → conflates detail with aggregate, harder to cache
- Multiple frontend requests → more round-trips, worse UX for drawer

**Rationale:** Single purpose endpoint with clear caching semantics. Frontend can use a dedicated TanStack Query hook with `detail(id)` key pattern.

### 5. Repair steps CRUD via delete-then-recreate

**Choice:** When updating a template's repair steps, delete all existing steps and recreate from the submitted array.

**Alternatives considered:**
- Individual step update/delete/create → complex diffing logic, conflict-prone

**Rationale:** Project convention (same as order items, supply request items). Simple, atomic, no stale-step bugs.

### 6. RepairStep ordering via stepNumber field

**Choice:** Integer `stepNumber` field (1-based) with up/down buttons for reorder in the UI. No drag-and-drop.

**Alternatives considered:**
- Float ordering (1.5 between 1 and 2) → over-engineered
- Linked list → complex queries for ordered retrieval

**Rationale:** Simple integer ordering. On reorder, frontend recalculates stepNumber for the full list before submission. Delete-then-recreate means no gaps to manage.

## Risks / Trade-offs

- **Template pollution from auto-create** → Mitigated by `canMutate` gate. Only technical/admin users trigger auto-creation. Production users create free-text records without generating templates.
- **Typeahead performance with large template set** → Mitigated by backend pagination (existing list endpoint uses limit). Debounce 300ms prevents excessive requests.
- **Migration on existing data** → Low risk. `RepairStep` is additive-only (new table, no modification to existing columns). Existing templates will simply have zero repair steps.
- **Summary endpoint N+1 queries** → Mitigated by using Prisma aggregate/count in a single query with `_count` and `groupBy` for timeline.
