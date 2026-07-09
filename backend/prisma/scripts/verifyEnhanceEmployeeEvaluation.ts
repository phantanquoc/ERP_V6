/**
 * verifyEnhanceEmployeeEvaluation.ts
 *
 * Post-migration sanity check. Verifies:
 *   1. Every Position has a non-null category
 *   2. Every position's responsibilities sum to 100 (within epsilon)
 *   3. Every Evaluation has non-null mode
 *   4. No evaluation_details.comment column remains
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/verifyEnhanceEmployeeEvaluation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EPSILON = 0.001;

async function main() {
  console.log('[verify] Running post-migration verification...\n');

  let failures = 0;

  // 1. Every Position has a category
  const positionsNullCategory = await (prisma.position as any).count({
    where: { category: null },
  });
  if (positionsNullCategory > 0) {
    console.error(`[FAIL] ${positionsNullCategory} positions have null category`);
    failures++;
  } else {
    console.log('[OK] All positions have a category');
  }

  // 2. Responsibility weight sums = 100 per position
  const allPositions = await prisma.position.findMany({
    include: { responsibilities: true },
  });
  let weightViolations = 0;
  for (const pos of allPositions) {
    if (pos.responsibilities.length === 0) continue;
    const sum = pos.responsibilities.reduce((s, r) => s + r.weight, 0);
    if (Math.abs(sum - 100) > EPSILON) {
      console.error(`[FAIL] Position ${pos.code} "${pos.name}" weight sum = ${sum.toFixed(4)}`);
      weightViolations++;
      failures++;
    }
  }
  if (weightViolations === 0) {
    console.log('[OK] All position responsibility weights sum to 100');
  }

  // 3. Every Evaluation has non-null mode
  const evaluationsNullMode = await (prisma.evaluation as any).count({
    where: { mode: null },
  });
  if (evaluationsNullMode > 0) {
    console.error(`[FAIL] ${evaluationsNullMode} evaluations have null mode`);
    failures++;
  } else {
    console.log('[OK] All evaluations have a non-null mode');
  }

  // 4. No comment column on evaluation_details
  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'common'
      AND table_name = 'evaluation_details'
      AND column_name = 'comment'
  `;
  if (cols.length > 0) {
    console.error('[FAIL] evaluation_details.comment column still exists (should have been renamed to commentSup1)');
    failures++;
  } else {
    console.log('[OK] evaluation_details.comment column does not exist');
  }

  // 5. New columns exist on evaluation_details
  const newCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'common'
      AND table_name = 'evaluation_details'
      AND column_name IN ('commentSup1', 'commentEmployee', 'commentSup2', 'notApplicable')
  `;
  if (newCols.length < 4) {
    console.error(`[FAIL] Missing new columns on evaluation_details — found: ${newCols.map(c => c.column_name).join(', ')}`);
    failures++;
  } else {
    console.log('[OK] evaluation_details has all new columns (commentSup1, commentEmployee, commentSup2, notApplicable)');
  }

  // 6. New tables exist
  const newTables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'common'
      AND tablename IN (
        'evaluation_evidences', 'evaluation_goals', 'evaluation_idp_items',
        'evaluation_audit_logs', 'peer_feedback_invites', 'evaluation_peer_feedbacks'
      )
  `;
  if (newTables.length < 6) {
    const found = newTables.map(t => t.tablename).join(', ');
    console.error(`[FAIL] Only found ${newTables.length}/6 new tables: ${found}`);
    failures++;
  } else {
    console.log('[OK] All 6 new evaluation tables exist');
  }

  console.log(`\n[verify] ${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);

  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .catch(err => {
    console.error('[verify] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
