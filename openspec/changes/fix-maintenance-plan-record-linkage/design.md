# Design

## Context

Current linkage: `toggleMonth` creates `MaintenancePlanItemLog(hoanThanh=true)` + `MaintenanceRecord(sourceLogId=logId)` in one transaction (`maintenancePlanService.ts:289-332`). `MaintenanceRecord.create` (`maintenanceRecordService.ts:104-130`) never touches plans/logs (`maintenancePlanId` optional, `sourceLogId=null`). Progress `checkAndUpdatePlanStatus` (`maintenancePlanService.ts:342-378`) counts only `logs.filter(hoanThanh).length / totalExpected` — manual records are invisible. Deleting an auto-record (`sourceLogId!=null`) orphans a green cell.

No schema change is needed. Constraints: `MaintenanceRecord.sourceLogId @unique`, `MaintenancePlanItemLog(itemId,thang,lanThu) @unique`, `MaintenancePlan(machineSystemId,nam) @unique`.

## Goals / Non-Goals

**Goals:**
- Prevent orphan green cells (P0).
- Warn on likely-duplicate manual records (P1).
- Allow explicit opt-in manual->plan tick without ambiguity (P2).
- Reject out-of-cycle ticks (P3).

**Non-Goals:**
- Auto-ticking plans from manual records without user confirmation.
- Hard-blocking duplicate manual records (valid to do work outside plan / redo).
- Cross-year plan matching (year derived from `ngayThucHien`).
- Schema migration.

## Decisions

**P0 - Delete guard: block, not silent revert.**
- `maintenanceRecordService.delete(id)` checks `record.sourceLogId`. If non-null, throw `ValidationError("Biên bản tự sinh chỉ được xóa bằng cách bỏ tick trong kế hoạch")` -> 400. Controller maps to 400 JSON. Alternative (auto-revert log) rejected: silent state change from the Records tab violates principle of least surprise; user should untick explicitly in the plan view.

**P1 - Duplicate warning: soft, response-embedded.**
- After `maintenanceRecordService.create` succeeds, run a read-only check: find plan item(s) with same `machineSystemDetailId` + normalized `noiDung` (trim, NFC, case-insensitive) in plans where `machineSystemId == data.machineSystemId` and `nam == ngayThucHien.getFullYear()`. If any such item has a `hoanThanh` log (any thang/lanThu), return `{ warning: { code: "DUPLICATE_PLAN_LOG", message, planId, maKeHoach } }` alongside `data`. Frontend shows toast + link to plan. No extra DB write.

**P2 - Opt-in linkage: explicit (thang, lanThu) from user.**
- New service method `createWithOptionalPlanLink(data, linkPlan: { planId, itemId, thang, lanThu } | null, userId)` — when `linkPlan` provided, runs in one transaction: `findUnique log(itemId,thang,lanThu)` -> if exists and `hoanThanh=true` throw 409; else create/update log `hoanThanh=true` and create record with `sourceLogId=logId`. If `linkPlan==null`, plain create. Frontend: when `machineSystemId + machineSystemDetailId + noiDung` matches exactly one plan item in the current year, show checkbox "Đồng thời tick hoàn thành cho KHBD-xxx tháng N" (derived `N = ngayThucHien.getMonth()+1` editable). P1 warning and P2 checkbox are independent; P2 is not auto-checked.

**P3 - Cycle guard:**
- At top of `toggleMonth`, compute `applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau)` (requires fetching item before log lookup) and `maxLan = FREQUENCY_TIMES[tanSuat] ?? 1` (for `KHONG_CO_DINH` maxLan=0 -> reject if any tick). If `month not in applicableMonths` or `lanThu > maxLan`, throw `ValidationError`. Reuse existing `getApplicableMonths`/`FREQUENCY_TIMES`.

## Risks / Trade-offs

- **P0 UX:** Users who previously deleted auto-records to "fix" mistakes must now untick in plan. Mitigated by clear error message with navigation hint.
- **P1 false positives:** `noiDung` normalization may still mismatch if content differs by whitespace/punctuation. Acceptable for soft warning; no blocking.
- **P2 concurrency:** `sourceLogId @unique` + `log(itemId,thang,lanThu) @unique` enforce at-most-one; transaction handles race.
- **P3 Strictness:** Existing out-of-cycle logs remain; guard only blocks new ticks. No data migration needed.
