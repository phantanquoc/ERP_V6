/**
 * backfillEvaluationPercentages.ts
 *
 * For every existing Evaluation, computes and persists selfScorePercentage,
 * sup1Percentage, and sup2Percentage from its EvaluationDetail rows.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillEvaluationPercentages.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillEvaluationPercentages.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

/** Mirrors computeWeightedScoreForField from employeeEvaluationService */
function computeWeightedScoreForField(
  details: Array<{
    selfScore: number | null;
    supervisorScore1: number | null;
    supervisorScore2: number | null;
    positionResponsibility: { weight: number } | null;
  }>,
  field: 'selfScore' | 'supervisorScore1' | 'supervisorScore2'
): number | null {
  if (details.length === 0) return null;
  const allFilled = details.every(d => d[field] !== null);
  if (!allFilled) return null;

  const totalWeight = details.reduce((s, d) => s + (d.positionResponsibility?.weight ?? 0), 0);
  if (totalWeight === 0) return null;

  const score = details.reduce((s, d) => {
    const v = (d[field] as number | null) ?? 0;
    return s + v * (d.positionResponsibility?.weight ?? 0);
  }, 0) / totalWeight;

  return score;
}

async function main() {
  console.log(`[backfillEvaluationPercentages] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  const evaluations = await prisma.evaluation.findMany({
    include: {
      details: { include: { positionResponsibility: true } },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const ev of evaluations) {
    const selfScorePercentage = computeWeightedScoreForField(
      ev.details as any,
      'selfScore'
    );
    const sup1Percentage = computeWeightedScoreForField(
      ev.details as any,
      'supervisorScore1'
    );
    const sup2Percentage = computeWeightedScoreForField(
      ev.details as any,
      'supervisorScore2'
    );

    console.log(
      `  [*] ${ev.id} (${ev.period}) → self=${selfScorePercentage?.toFixed(2) ?? 'null'}, sup1=${sup1Percentage?.toFixed(2) ?? 'null'}, sup2=${sup2Percentage?.toFixed(2) ?? 'null'}`
    );

    if (isDryRun) {
      skipped++;
      continue;
    }

    await (prisma.evaluation as any).update({
      where: { id: ev.id },
      data: { selfScorePercentage, sup1Percentage, sup2Percentage },
    });
    updated++;
  }

  console.log(`\n[backfillEvaluationPercentages] Done. Updated: ${updated}, Skipped (dry): ${skipped}`);
  if (isDryRun) console.log('[backfillEvaluationPercentages] DRY RUN — no changes written');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
