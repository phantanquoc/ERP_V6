# Rollback Procedure — refactor-overtime-plan-multi-item

## Before migration (backup command)

Run this before applying the migration to dev or staging:

```bash
pg_dump $DATABASE_URL \
  --schema=common \
  --table="common.overtime_plans" \
  --table="common.overtime_plan_items" \
  --no-owner \
  --no-acl \
  -Fc \
  -f /tmp/common_overtime_backup_$(date +%Y%m%d%H%M%S).dump
```

## Rollback command

```bash
pg_restore \
  --dbname=$DATABASE_URL \
  --schema=common \
  --clean \
  --if-exists \
  /tmp/common_overtime_backup_<timestamp>.dump
```

Then revert to the previous migration state:

```bash
cd backend && npx prisma migrate resolve --rolled-back 20260619104629_overtime_plan_multi_item
```

## Release notes

### Breaking changes (per-item acceptPlan / updateActualTime payload)

The `PATCH /api/overtime-plans/:id/accept` and `PATCH /api/overtime-plans/:id/actual-time`
endpoints now require an additional `itemId` field in the request body.

**Before:**
```json
PATCH /api/overtime-plans/:id/accept
{ "trangThai": "DA_TIEP_NHAN" }
```

**After:**
```json
PATCH /api/overtime-plans/:id/accept
{ "itemId": "<overtimePlanItemId>", "trangThai": "DA_TIEP_NHAN" }
```

```json
PATCH /api/overtime-plans/:id/actual-time
{ "itemId": "<overtimePlanItemId>", "actualTimes": { "<userId>": { "gioVao": "17:00", "gioRa": "20:00" } } }
```

No external clients are affected — this is an internal application.
