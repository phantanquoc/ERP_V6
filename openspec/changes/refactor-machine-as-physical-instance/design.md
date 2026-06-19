## Context

The QLHTM department currently sees one `MachineSystem` row standing in for an entire equipment family while the QLSX department creates one `Machine` row per physical unit. The two share `Machine.machineSystemId` but the relationship is loose and the detail tree (cụm / linh kiện / điểm kiểm tra) lives only on the `MachineSystem` side. As a result, eight physical vacuum fryers share one component tree, and downstream records (`FaultRecord`, `RepairRequestItem`, `AcceptanceHandoverItem`, `SystemOperation`, `FinishedProduct`, `QualityEvaluation`) hold redundant FKs (`machineId` + `machineSystemId` + `machineSystemDetailId`) which fan out the data model without disambiguating which physical machine the row belongs to.

Operations want one mental model: a "machine" is the row you see in the QLHTM "Hệ thống máy" tab, and that row owns everything about that physical unit — its tree of components, its faults, its repair requests, its operation log, its maintenance schedule and its status timeline. They also want fast onboarding for new physical units of the same kind: clone the template machine, edit, save.

Existing data already encodes the right grouping: every `Machine` row points to the `MachineSystem` it currently lives under. We can migrate without operator intervention by walking that pointer.

## Goals / Non-Goals

**Goals:**
- One `MachineSystem` row equals one physical machine, with its own detail tree, status, faults, repairs, operations, maintenance and status log.
- Cloning a template machine copies the entire detail tree (including parent/child links and component metadata) under the new machine.
- Status changes are first-class and recorded in `MachineStatusLog` (replaces `MachineActivityReport`).
- Zero data loss for existing fault records, repair requests, handover items, operations, finished products, quality evaluations during migration.
- The AI agent registry stays internally consistent (no orphan `machineId` parameters) and the registry test count is updated.

**Non-Goals:**
- No changes to maintenance plan / record schema or business logic — only seed data and FK semantics already match.
- No RBAC/ABAC role changes.
- No rework of production-module business logic (drying recipe, finished product calculations, quality scoring) — only the FK rename and unique-constraint updates.
- No migration UI for operators — the migration is automatic, run-once.
- Not introducing soft-delete on `MachineSystem`; existing `hoatDong` boolean stays.

## Decisions

### Decision 1: Drop `Machine`, expand `MachineSystem`, do not introduce a new `PhysicalMachine` model

**Choice:** Reuse `MachineSystem` as the single source of truth for a physical machine. Drop `Machine` entirely.

**Alternatives considered:**
- *Keep `Machine`, demote `MachineSystem` to a category enum.* Rejected — would lose the rich detail tree, fault templates, maintenance plans, repair items already hanging off `MachineSystem`. Migration cost would dwarf the rename.
- *Introduce a new `PhysicalMachine` table separate from `MachineSystem`.* Rejected — three entities (system, physical machine, detail) deepen the confusion the change is trying to remove. The user explicitly confirmed the recommended option "Giữ tên MachineSystem, mỗi record = 1 máy thực tế. Deprecate Machine".

**Implication:** All existing relations on `MachineSystem` (`details`, `faultTemplates`, `faultRecords`, `repairRequestItems`, `handoverItems`, `maintenancePlans`, `maintenanceRecords`) remain intact. Six FKs across five models migrate from `machineId` to `machineSystemId` with backfill via `Machine.machineSystemId`.

### Decision 2: Add `parentSystemId` and `trangThai` to `MachineSystem`; store status transitions in `MachineStatusLog`

**Choice:** Two new optional columns on `MachineSystem`:
- `parentSystemId String?` — points to the template machine this one was cloned from. Nullable for hand-built machines.
- `trangThai MachineStatus @default(HOAT_DONG)` — reuse the existing `MachineStatus` enum already defined for the old `Machine` model.

A new `MachineStatusLog` model captures every transition: `(id, machineSystemId, trangThaiCu, trangThaiMoi, nguyenNhan, nguoiCapNhat, ghiChu, thoiDiem, createdAt, updatedAt)`. Writing both the system row's `trangThai` and a log entry is wrapped in `prisma.$transaction`.

**Alternatives considered:**
- *Compute current status from the latest log entry.* Rejected — every list query would need a window function or N+1 lookups, and existing index on `MachineSystem.maHeThong` would not help. Denormalised status field + log is the standard pattern for forward-only status with an audit trail (matches `advanceStatus` convention in CLAUDE.md).
- *Keep `MachineActivityReport`.* Rejected — the report aggregates counts across an unstructured "tên hệ thống" string and cannot be lifted into a per-machine ledger without a schema rewrite anyway. Replacing it is cleaner than dual-running.

### Decision 3: Make `FaultTemplate.machineSystemDetailId` nullable, add free-text hints

**Choice:**
- `FaultTemplate.machineSystemId String?` (was required)
- `FaultTemplate.machineSystemDetailId String?` (was required)
- New text columns: `tenDetailGoiY String?`, `loaiDetailGoiY String?`

Templates become a free-form library: an operator authoring a fault record sees template suggestions, can pick one even when the exact detail row does not exist on this particular machine. The optional hint columns let the template say "this lives under a 'Heater' component" without forcing a hard FK.

**Alternatives considered:**
- *Per-machine fault templates.* Rejected — defeats reuse. Two identical fryers should share a "Phớt cơ khí trục bơm bị rò" template even if the underlying detail row IDs differ.
- *Drop FK columns entirely.* Rejected — when the operator picks a template *and* a real detail on a real machine, we still want both linked for analytics.

### Decision 4: Migrate data by following `Machine.machineSystemId`; create placeholder `MachineSystem` rows for orphan `Machine`s

**Choice:** A single migration runs in this order:
1. Add new `MachineStatus` columns / `parentSystemId` to `machine_systems`.
2. Create `machine_status_logs` table.
3. For each existing `Machine` row with `machineSystemId IS NULL`, insert a placeholder `MachineSystem` row preserving `maMay → maHeThong`, `tenMay → tenHeThong`, `trangThai`, default `khuVuc='Chưa phân loại'`, `viTri='Chưa xác định'`, `chucNang=''`, `loaiHeThong='KHAC'`.
4. Add nullable `machineSystemId` columns to the five downstream tables.
5. Backfill `<table>.machineSystemId = (machineId !== NULL ? Machine.machineSystemId OR placeholder : NULL)`.
6. Drop `<table>.machineId` columns and the FKs to `machines`.
7. Drop unique constraints `[maChien, machineId]` on `finished_products` / `quality_evaluations` and recreate them as `[maChien, machineSystemId]`.
8. Drop `machines` and `machine_activity_reports` tables.

**Alternatives considered:**
- *Squash to a single Prisma migration.* Adopted; Prisma's `migrate dev` will produce one SQL file. Steps above are the SQL contents, not separate migrations.
- *Two-phase migration (deprecate then remove later).* Rejected — there are no external consumers of the `machines` API, the schema is internal, and the user wants one clean refactor.

**Risk callout:** Backfill must run inside the same transaction as the column drop. We rely on Postgres' transactional DDL.

### Decision 5: `clone(sourceId, overrides)` re-creates the entire detail tree by walking `parentDetailId`

**Choice:** Top-down BFS:
1. Read all details for `sourceId`, ordered by depth (root first).
2. Build a map `oldDetailId → newDetailId`.
3. For each old detail, insert a new detail with `machineSystemId = newSystemId`, `parentDetailId = map[old.parentDetailId] || null`, identical `loaiChiTiet / tenChiTiet / viTri / moTa / thuTu / hoatDong / trangThai`. Generate new unique `maChiTiet` by appending the new system's suffix (e.g., `CCK-LK001` under `HT-CCK-MAU` becomes `CCK-LK001-01` under `HT-CCK-01`).
4. Set `newSystem.parentSystemId = sourceId`.

The whole clone runs inside one `prisma.$transaction`.

**Alternatives considered:**
- *Recursive `INSERT ... SELECT`.* Rejected — Prisma's typed client does not expose recursive CTEs naturally; raw SQL would lose the `Prisma.MachineSystemDetailCreateManyInput` types and complicate maHeThong suffixing.
- *Lazy clone (point new system at old detail tree).* Rejected — operators must edit per-machine details independently; sharing breaks the whole point of the refactor.

### Decision 6: AI registry tool changes — remove machine tools entirely, no shim

**Choice:** Remove `list_machines`, `get_machine`, `create_machine`, `update_machine`, `delete_machine`. Update `create_repair_request` to take `machineSystemId` and drop `tenHeThong`. Add `list_machine_status_logs` and `update_machine_status` with `is_write: True`. Bump the registry test count by the net delta.

**Alternatives considered:**
- *Keep machine tools as aliases that delegate to system endpoints.* Rejected — the agent's intent classifier would route ambiguously between `list_machines` and `list_machine_systems`, wasting tokens. Clean removal beats a compatibility shim.

## Risks / Trade-offs

- **Risk: Existing `Machine` rows without `machineSystemId` get a placeholder system named after `maMay`** → Mitigation: the placeholder uses `loaiHeThong='KHAC'` and `khuVuc='Chưa phân loại'` so operators can spot and rename them; release notes flag the action item.
- **Risk: Frontend forms across both QLHTM and QLSX touch this refactor (RepairRequestForm, AcceptanceHandoverForm, SystemOperationForm, FinishedProductForm, QualityEvaluationForm)** → Mitigation: shared `MachineSystemSelect` component reused everywhere; add a single integration test per form to verify the dropdown loads from `/api/machine-systems`.
- **Risk: Maintenance fixtures and seeds reference detail IDs that change after clone** → Mitigation: re-run `seed-machine-system-chien.ts` after migration; existing maintenance plans link by `machineSystemDetailId` which will not be touched (only new clones get fresh IDs).
- **Risk: AI agent users on stale clients call removed tools** → Mitigation: registry change is internal; no external API surface. The intent classifier returns "tool not found" with a Vietnamese fallback message.
- **Risk: Unique constraint swap on `finished_products` and `quality_evaluations`** could fail if backfill produces duplicates → Mitigation: pre-migration check counts `(maChien, machineSystemId)` collisions; if any, the migration aborts and operations team de-duplicates manually.
- **Trade-off: Status field denormalised** → an operator can theoretically race-update `MachineSystem.trangThai` and bypass the log. Mitigation: only `MachineSystemService.updateStatus` writes the column; the controller never accepts `trangThai` in the create/update payload.
- **Trade-off: `parentSystemId` is informational only** → cloning copies the tree but doesn't keep it in sync if the template changes later. This matches operator expectations: "we cloned, then customised". Documented in proposal.

## Migration Plan

1. **Pre-flight check** — query for `(maChien, machineId)` duplicates that would collide on `(maChien, machineSystemId)` after backfill. If any, surface to ops and pause.
2. **Backup** — `pg_dump` the `business` schema before running the migration in production.
3. **Run migration** — `npx prisma migrate dev --name refactor_machine_as_physical_instance` in dev, `npx prisma migrate deploy` in prod.
4. **Run seed** — `npx ts-node --transpile-only prisma/seed-machine-system-chien.ts` to refresh the eight fryer machines.
5. **Smoke test** — open `/technical/quality?tab=machineSystems`, confirm the eight machines listed each with their own detail tree and a populated drawer (faults / repairs / operations / maintenance / status log).
6. **Rollback** — restore the `business` schema from the dump. Schema drops are destructive, so rollback is not in-place; this is acceptable because the dataset is internal and small.

## Open Questions

None blocking implementation. The user has confirmed:
- Q1 ★ Giữ tên MachineSystem, mỗi record = 1 máy thực tế. Deprecate Machine.
- Q2 ★ Vừa nhân bản, vừa cho phép tạo trắng.
- Q3 ★ Bỏ ràng buộc machineSystemDetailId bắt buộc, dùng template ở cấp 'tên detail / loại detail' tự do.
- Q4 ★ Refactor 'báo cáo hoạt động' thành 'nhật ký trạng thái máy'.
