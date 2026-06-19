# Rollback Procedure — refactor-machine-as-physical-instance

## Overview

This document describes how to roll back the `refactor_machine_as_physical_instance`
migration if a critical issue is discovered after deployment.

**Warning**: Rollback requires coordinated revert of DB, backend code, frontend
code, and AI registry. Partial rollback (DB only while keeping new code) will cause
the backend to crash on startup.

---

## Step 1 — Stop the backend service

```bash
docker compose -f docker-compose.dev.yml stop backend
# or in production:
docker compose stop backend
```

---

## Step 2 — Restore the business schema from pg_dump

The pre-flight dump was captured in task 1.2 (see `migration-notes.md` for the
exact dump command). Restore it:

```bash
pg_restore \
  --host=<DB_HOST> \
  --port=5432 \
  --username=<DB_USER> \
  --schema=business \
  --format=custom \
  --clean \
  --if-exists \
  --no-acl \
  --no-owner \
  --dbname=erp_database \
  erp_backup_before_machine_refactor.dump
```

For Docker dev environment:

```bash
# Copy dump back into container
docker compose -f docker-compose.dev.yml cp \
  ./erp_backup_before_machine_refactor.dump \
  postgres:/tmp/erp_backup_before_machine_refactor.dump

# Restore
docker compose -f docker-compose.dev.yml exec postgres \
  pg_restore \
  -U erp_user \
  --schema=business \
  -F c --clean --if-exists --no-acl --no-owner \
  -d erp_database \
  /tmp/erp_backup_before_machine_refactor.dump
```

---

## Step 3 — Mark both migrations as rolled back in Prisma

```bash
npx prisma migrate resolve \
  --rolled-back 20260618120000_normalize_machine_status_enum
npx prisma migrate resolve \
  --rolled-back 20260618000000_refactor_machine_as_physical_instance
```

This removes the migrations from `_prisma_migrations` so Prisma no longer considers
them applied.

> **Note**: With Prisma 6 multi-file schema (`schema = "prisma/schema"` in
> `package.json`), the CLI looks for migrations under
> `prisma/schema/migrations`. The repository keeps migrations at `prisma/migrations`
> with a symlink at `prisma/schema/migrations -> ../migrations` so both
> `prisma migrate deploy` and `prisma migrate dev` find them. If the symlink is
> missing in a fresh checkout, recreate it with
> `ln -s ../migrations backend/prisma/schema/migrations`.

---

## Step 4 — Revert backend + frontend + AI code

Check out the git commit immediately before this change was merged:

```bash
git revert --no-commit <merge-commit-sha>
# or reset the branch to the pre-change HEAD
```

Then rebuild and restart:

```bash
docker compose -f docker-compose.dev.yml up --build -d backend frontend ai-service
```

---

## Consistency Warning

**Never rollback DB while keeping new code deployed.** The new code references:
- `machine_status_logs` table (dropped on rollback)
- `MachineSystem.trangThai` column (reverted on rollback)
- `MachineSystem.parentSystemId` column (reverted on rollback)

If the DB is rolled back but the backend still runs the new code, every request
that touches machines will throw 500 errors.

---

## Release Notes / Breaking Changes

### UI Changes
- **QLHTM (Kỹ thuật)**: tab "Báo cáo hoạt động" has been renamed to
  "Nhật ký trạng thái máy"
- **Phòng QLSX (Sản xuất)**: tab "Quản lý máy móc" has been removed

### API Breaking Changes
- `POST /api/machines`, `GET /api/machines`, `GET /api/machines/:id`,
  `PATCH /api/machines/:id`, `DELETE /api/machines/:id` → all return **404**.
  Internal clients must migrate to `/api/machine-systems` and
  `/api/machine-status-logs`.
- `GET /api/machine-activity-reports` → **404**. Use
  `GET /api/machine-status-logs?machineSystemId=...` instead.
- New endpoints:
  - `POST /api/machine-systems/:id/clone`
  - `GET /api/machine-systems/:id/summary`
  - `POST /api/machine-systems/:id/status`

### DB Breaking Changes

#### Enum normalization (hotfix migration `20260618120000_normalize_machine_status_enum`)

The `business.MachineStatus` enum values were renamed from Vietnamese-diacritic
labels to ASCII to align with frontend types and the AI registry:

| Before | After |
|--------|-------|
| `HOAT_DONG` | `HOAT_DONG` (unchanged) |
| `BẢO_TRÌ` | `BAO_TRI` |
| `NGỪNG_HOẠT_ĐỘNG` | `NGUNG_HOAT_DONG` |

This is a metadata-only `ALTER TYPE ... RENAME VALUE` — no row scan, no data loss.
External clients sending the old diacritic strings must update their payloads.

#### Schema/structure changes
The following columns were dropped from their tables. Any direct SQL queries
against these columns will fail:

| Table | Dropped column |
|-------|----------------|
| `business.finished_products` | `machine_id` |
| `business.quality_evaluations` | `machine_id` |
| `business.system_operations` | `machine_id`, `ten_may` |
| `business.repair_request_items` | `machine_id` |
| `business.acceptance_handover_items` | `machine_id` |
| `business.fault_records` | `machine_id` |

The following tables were dropped entirely:
- `business.machines`
- `business.machine_activity_reports`

The following unique constraints were replaced:

| Table | Old constraint | New constraint |
|-------|----------------|----------------|
| `business.finished_products` | `(ma_chien, machine_id)` | `(ma_chien, machine_system_id)` |
| `business.quality_evaluations` | `(ma_chien, machine_id)` | `(ma_chien, machine_system_id)` |

New table added:
- `business.machine_status_logs`

New columns added to `business.machine_systems`:
- `parent_system_id` (nullable FK to `machine_systems.id`)
- `trang_thai` (enum `MachineStatus`, default `HOAT_DONG`)

### AI Agent Changes
- Removed tools: `list_machines`, `get_machine`, `create_machine`,
  `update_machine`, `delete_machine`
- Added tools: `list_machine_status_logs`, `update_machine_status`
- Changed tool: `create_repair_request` no longer accepts `tenHeThong` text;
  now requires `machineSystemId` (UUID)
- Changed tool: `list_machine_systems` now accepts optional `trangThai`,
  `khuVuc`, `loaiHeThong` filters

### Seed Data Changes
- `HT-CCK-MAU`: new template machine with full vacuum-fryer detail tree (97 details)
- `HT-CCK-01` through `HT-CCK-08`: 8 cloned machines, each with their own
  97 independent detail rows
- Old `MAY-001..MAY-008` seed rows: removed (table dropped)
