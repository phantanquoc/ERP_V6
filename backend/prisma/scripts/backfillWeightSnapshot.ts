/**
 * backfillWeightSnapshot.ts
 *
 * Backfill EvaluationDetail.weightSnapshot from PositionResponsibility.weight
 * where weightSnapshot IS NULL.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register prisma/scripts/backfillWeightSnapshot.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register prisma/scripts/backfillWeightSnapshot.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`[backfillWeightSnapshot] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  if (isDryRun) {
    const count: any[] = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "business"."evaluation_details" WHERE "weightSnapshot" IS NULL`;
    const n = Number(count[0]?.cnt ?? 0);
    console.log(`[backfillWeightSnapshot] Would backfill ${n} rows (dry run)`);
    // Show sample join check
    const sample: any[] = await prisma.$queryRaw`
      SELECT ed.id, ed."positionResponsibilityId", pr.weight as pr_weight
      FROM "business"."evaluation_details" ed
      JOIN "business"."position_responsibilities" pr ON pr.id = ed."positionResponsibilityId"
      WHERE ed."weightSnapshot" IS NULL
      LIMIT 5
    `;
    if (sample.length > 0) {
      console.log('[backfillWeightSnapshot] Sample rows that would be updated:');
      for (const r of sample) console.log(`  ${r.id} -> weight ${r.pr_weight}`);
    }
    return;
  }

  const result: any = await prisma.$executeRaw`
    UPDATE "business"."evaluation_details" ed
    SET "weightSnapshot" = pr.weight
    FROM "business"."position_responsibilities" pr
    WHERE ed."positionResponsibilityId" = pr.id
      AND ed."weightSnapshot" IS NULL
  `;
  // $executeRaw returns number of affected rows
  const affected = typeof result === 'number' ? result : Number(result);
  console.log(`[backfillWeightSnapshot] Done. Backfilled ${affected} rows.`);

  const remaining: any[] = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "business"."evaluation_details" WHERE "weightSnapshot" IS NULL`;
  console.log(`[backfillWeightSnapshot] Remaining NULL weightSnapshot: ${remaining[0]?.cnt}`);
}

main()
  .catch((e) => {
    console.error('[backfillWeightSnapshot] Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
