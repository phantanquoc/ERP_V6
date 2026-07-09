/**
 * backfillEvaluationMode.ts
 *
 * Sets Evaluation.mode = FULL for all existing rows (safe default per design D1/D6).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillEvaluationMode.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillEvaluationMode.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(`[backfillEvaluationMode] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  const count = await prisma.evaluation.count();
  console.log(`  Found ${count} evaluations to process`);

  if (isDryRun) {
    console.log(`  [dry] Would set mode=FULL on ${count} evaluations`);
    return;
  }

  const result = await (prisma.evaluation as any).updateMany({
    data: { mode: 'FULL' },
  });

  console.log(`\n[backfillEvaluationMode] Done. Updated: ${result.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
