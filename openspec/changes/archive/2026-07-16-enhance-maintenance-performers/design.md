## Context

The Maintenance tab has two employee-picker surfaces: `MaintenanceLogModal` (completion ticks on a plan item, which auto-generate `MaintenanceRecord` via `createAutoRecord`) and `MaintenanceRecordForm` (standalone BD/SC records). Both store a single performer as a denormalized name string (`nguoiThucHien`). The log modal already uses `useEmployeesForAssignment` (returns `EmployeeOption { id, name, employeeCode, department }`, limit 100); the record form uses a free-text input. A `ProductCombobox` already exists as a dependency-free searchable-select pattern (client-side filter, keyboard nav, outside-click close).

## Goals / Non-Goals

**Goals:**
- Record a main performer plus multiple assistants on both completion logs and records.
- Name-searchable pickers everywhere in the Maintenance tab.
- Auto-generated records inherit the log's assistants.
- Assistants are searchable and exported for records.

**Non-Goals:**
- No RBAC changes (`technicalAccess` untouched).
- No changes to advisory lock / status transition mechanics.
- No changes outside the Maintenance tab.
- No per-assistant metadata (role, hours) — assistants are names only.

## Decisions

**Decision 1 — Store assistants as `nguoiPhu String[] @default([])` (native Postgres array).**
Rationale: consistent with the existing denormalized name-string design (`nguoiThucHien` is a name, not an FK), needs no new tables or nested writes, and Postgres arrays support the `has` query operator for search. AGENTS.md prefers child tables over JSON columns, but that rule targets related *entities* with their own lifecycle; here assistants are a flat list of display names with no child state. Alternatives: child table (rejected — heavyweight nested write + cascade for a name list, only justified if per-assistant fields are later needed); comma-joined string (rejected — breaks on names containing commas, awkward to query).

**Decision 2 — Names, not employee IDs.**
Rationale: matches the current storage (`nguoiThucHien` stores the display name) and survives employee record deletion. The combobox returns the chosen name.

**Decision 3 — Client-side filtering in new comboboxes.**
Rationale: `useEmployeesForAssignment` already returns up to 100 options with a 5-minute stale time; filtering in-memory (mirroring `ProductCombobox`) avoids new network round-trips and matches the existing pattern. Two new dependency-free components: `EmployeeCombobox` (single-select, value = name) and `EmployeeMultiCombobox` (multi-select chips, value = `string[]`).

**Decision 4 — Transport `nguoiPhu` as JSON on the FormData path.**
Rationale: `maintenanceRecordService` create/update use `formData.append(key, String(value))` when a file is attached, which would coerce an array into a broken string. `nguoiPhu` must be appended as `JSON.stringify(...)` and parsed back with `JSON.parse` in the controller when it arrives as a string; the JSON-body path (no file) and the log toggle/updateLogNote path (always JSON body) send the array directly.

## Risks / Trade-offs

- **[Array column requires a real migration]** → Use `prisma migrate dev --name add_nguoi_phu_maintenance` + `prisma generate`; never `db push`. If the DB is unavailable in this environment, hand-write the migration SQL and run `prisma generate` so `tsc` passes, and explicitly tell the user to apply the migration — do not claim it was applied.
- **[FormData array coercion]** → Explicit `JSON.stringify` on FE + `JSON.parse` on controller for the string case; covered by Decision 4.
- **[Signature changes ripple through the toggle/updateLogNote chain]** → `toggleMonth` and `useToggleMonth`/`useUpdateLogNote` gain an optional `nguoiPhu` param; existing callers omitting it stay valid (optional, defaults to `[]` on create). Impact analysis rated `toggleMonth` and `update` as LOW.
- **[Search on array uses `has`, not `contains`]** → Postgres string arrays require `{ nguoiPhu: { has: term } }`; `contains` is for scalar strings and would fail the query build.

## Migration Plan

1. Add `nguoiPhu String[] @default([])` to `MaintenancePlanItemLog` and `MaintenanceRecord`.
2. `prisma migrate dev --name add_nguoi_phu_maintenance` then `prisma generate`.
3. Existing rows default to `[]` (empty array) — no backfill needed.
4. Rollback: drop the two columns (data loss limited to assistant lists, which are additive/new).
