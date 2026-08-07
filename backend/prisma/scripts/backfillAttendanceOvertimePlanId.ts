/**
 * backfillAttendanceOvertimePlanId.ts
 *
 * One-time backfill: link pre-existing overtime Attendance rows to the
 * OvertimePlan that materialized them (change: sync-overtime-attendance-on-plan-update).
 *
 * Matching strategy (design D7):
 *   1. Candidate plans = plans having an item whose ngayTangCa equals the row's
 *      attendanceDate AND whose nguoiThamGiaIds contains the row's employee userId.
 *   2. Several candidates → narrow by the plan noiDung embedded in the row's notes.
 *   3. Ambiguity surviving → link to the earliest-approved candidate and log a warning.
 *
 * Safety: rows already carrying a reference are skipped (re-runnable). The script
 * NEVER creates, deletes, or otherwise modifies attendance rows — it only sets
 * overtimePlanId on rows where it is null.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillAttendanceOvertimePlanId.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillAttendanceOvertimePlanId.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

interface PlanCandidate {
  id: string;
  noiDung: string;
  /** Earliest-approved ordering key; plans lack an approvedAt column, so ngayTao stands in. */
  ngayTao: Date;
}

async function main() {
  console.log(`[backfillAttendanceOvertimePlanId] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  const totalOvertime = await prisma.attendance.count({ where: { isOvertime: true } });
  console.log(`  Overtime attendance rows (before): ${totalOvertime}`);

  const rows = await prisma.attendance.findMany({
    where: { isOvertime: true, overtimePlanId: null },
    select: {
      id: true,
      employeeId: true,
      attendanceDate: true,
      notes: true,
      employee: { select: { userId: true, employeeCode: true } },
    },
  });
  console.log(`  Unlinked rows to resolve: ${rows.length}`);

  const plans = await prisma.overtimePlan.findMany({
    select: {
      id: true,
      noiDung: true,
      ngayTao: true,
      items: { select: { ngayTangCa: true, nguoiThamGiaIds: true } },
    },
  });

  let linked = 0;
  let ambiguous = 0;
  let unmatched = 0;

  for (const row of rows) {
    const userId = row.employee?.userId;
    if (!userId) {
      unmatched++;
      console.warn(`  [unmatched] row ${row.id}: employee has no linked user`);
      continue;
    }

    const rowDateKey = row.attendanceDate.getTime();
    let candidates: PlanCandidate[] = plans
      .filter(p =>
        p.items.some(
          item =>
            item.ngayTangCa.getTime() === rowDateKey &&
            item.nguoiThamGiaIds.includes(userId)
        )
      )
      .map(p => ({ id: p.id, noiDung: p.noiDung, ngayTao: p.ngayTao }));

    if (candidates.length === 0) {
      unmatched++;
      console.warn(
        `  [unmatched] row ${row.id}: employee ${row.employee?.employeeCode} on ` +
          `${row.attendanceDate.toISOString().slice(0, 10)} matches no plan`
      );
      continue;
    }

    // Tiebreaker: the row's notes embed the plan noiDung ("Tăng ca theo kế hoạch: <noiDung>").
    if (candidates.length > 1 && row.notes) {
      const notes = row.notes.toLowerCase();
      const narrowed = candidates.filter(c => notes.includes(c.noiDung.toLowerCase()));
      if (narrowed.length > 0) candidates = narrowed;
    }

    // Earliest-approved wins when ambiguity survives.
    candidates.sort((a, b) => a.ngayTao.getTime() - b.ngayTao.getTime());
    const chosen = candidates[0];

    if (candidates.length > 1) {
      ambiguous++;
      console.warn(
        `  [ambiguous] row ${row.id}: employee ${row.employee?.employeeCode} on ` +
          `${row.attendanceDate.toISOString().slice(0, 10)} claimed by ${candidates.length} plans ` +
          `[${candidates.map(c => `${c.id} (${c.noiDung})`).join(' | ')}] ` +
          `→ linking to earliest-approved ${chosen.id}`
      );
    }

    if (!isDryRun) {
      await prisma.attendance.update({
        where: { id: row.id },
        data: { overtimePlanId: chosen.id },
      });
    }
    linked++;
  }

  const totalAfter = await prisma.attendance.count({ where: { isOvertime: true } });

  console.log(`\n[backfillAttendanceOvertimePlanId] Done (${isDryRun ? 'DRY RUN' : 'LIVE'}).`);
  console.log(`  Linked:    ${linked}${isDryRun ? ' (would link)' : ''}`);
  console.log(`  Ambiguous: ${ambiguous}`);
  console.log(`  Unmatched: ${unmatched}`);
  console.log(`  Overtime attendance rows (after): ${totalAfter} (before: ${totalOvertime})`);

  if (totalAfter !== totalOvertime) {
    console.error('  ERROR: overtime row count changed — this script must never add or remove rows.');
    process.exitCode = 1;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
