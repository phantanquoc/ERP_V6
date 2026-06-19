# Migration Notes — refactor_machine_as_physical_instance

## Overview

This migration drops the `machines` and `machine_activity_reports` tables, promotes
`MachineSystem` to represent one physical machine per row, and backfills downstream
FK columns across six tables.

## Pre-flight Backup (REQUIRED before running in production)

Run BEFORE applying the migration in any environment:

```bash
# Dump the three schemas (auth, business, common) to a single compressed file
pg_dump \
  --host=<DB_HOST> \
  --port=5432 \
  --username=<DB_USER> \
  --schema=auth \
  --schema=business \
  --schema=common \
  --format=custom \
  --compress=9 \
  --file=erp_db_backup_before_refactor_machine_$(date +%Y%m%d_%H%M%S).dump \
  erp_database
```

For Docker dev environment:

```bash
docker compose -f docker-compose.dev.yml exec postgres \
  pg_dump \
  -U erp_user \
  -n auth -n business -n common \
  -F c -Z 9 \
  -f /tmp/erp_backup_before_machine_refactor.dump \
  erp_database

# Copy dump out of container
docker compose -f docker-compose.dev.yml cp \
  postgres:/tmp/erp_backup_before_machine_refactor.dump \
  ./erp_backup_before_machine_refactor.dump
```

## Restore from Backup

```bash
# Restore the three schemas from the dump
pg_restore \
  --host=<DB_HOST> \
  --port=5432 \
  --username=<DB_USER> \
  --schema=auth \
  --schema=business \
  --schema=common \
  --format=custom \
  --clean \
  --if-exists \
  --no-acl \
  --no-owner \
  --dbname=erp_database \
  erp_db_backup_before_refactor_machine_<timestamp>.dump
```

Note: Rollback is not in-place. The migration drops tables (`machines`,
`machine_activity_reports`) and swaps unique constraints. Restore requires the
full dump. This is acceptable because the dataset is internal and small.

## Pre-flight Collision Note

The pre-flight check in the migration SQL detects rows in `finished_products` and
`quality_evaluations` where backfilling `machineSystemId` from
`Machine.machineSystemId` would produce duplicate `(maChien, machineSystemId)` pairs.

### Dev environment (seed data)

The current dev seed data has 8 machines (MAY-001 to MAY-008) all pointing to the
**same** `MachineSystem` (`HT-CCK-01`), with 128 rows in `finished_products`
(16 unique `maChien` × 8 machines). After backfill, all 8 rows per `maChien` would
map to the same `machineSystemId`, triggering the pre-flight check.

**Resolution for dev**: Truncate the seed tables that hold the duplicate data before
running the migration, then re-run the seed after the migration:

```sql
-- In dev only: wipe production-module seed data before migrating
TRUNCATE TABLE business.quality_evaluations CASCADE;
TRUNCATE TABLE business.finished_products CASCADE;
TRUNCATE TABLE business.system_operations CASCADE;
TRUNCATE TABLE business.fault_records CASCADE;
```

Then run migration, then re-seed:

```bash
docker compose -f docker-compose.dev.yml exec backend \
  npx ts-node --transpile-only prisma/seed-machine-system-chien.ts
```

### Production

If the production database shows collisions in the pre-flight check, the ops team
must de-duplicate the affected rows BEFORE running the migration. Typically this
means identifying which physical machine each record actually belongs to and updating
the `machineId` field accordingly.

## Apply the Migration (production)

```bash
# Inside the backend container or from the server:
npx prisma migrate deploy
```

Or manually apply the SQL:

```bash
psql -U <user> -d erp_database -f \
  backend/prisma/migrations/20260618000000_refactor_machine_as_physical_instance/migration.sql
```

Then mark it as applied in Prisma:

```bash
# Insert migration record if using manual_applied pattern:
psql -U erp_user -d erp_database -c "
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'manual_applied', NOW(), '20260618000000_refactor_machine_as_physical_instance', NULL, NULL, NOW(), 1);
"
```
