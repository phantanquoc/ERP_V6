/**
 * rescaleResponsibilityWeights.ts
 *
 * For every position whose PositionResponsibility weights don't sum to 100,
 * rescales proportionally (residual on largest weight). Backs up original
 * weights in weight_backup_before_rescale column added via raw SQL if needed.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/rescaleResponsibilityWeights.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/rescaleResponsibilityWeights.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
const EPSILON = 0.001;

async function ensureBackupColumn() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "common"."position_responsibilities"
      ADD COLUMN IF NOT EXISTS weight_backup_before_rescale DOUBLE PRECISION;
    `);
    console.log('[rescaleWeights] Backup column ensured.');
  } catch (e) {
    console.log('[rescaleWeights] Backup column already exists or error:', e);
  }
}

async function main() {
  console.log(`[rescaleWeights] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  if (!isDryRun) {
    await ensureBackupColumn();
  }

  const positions = await prisma.position.findMany({
    include: { responsibilities: { orderBy: { createdAt: 'asc' } } },
  });

  let positionsFixed = 0;
  let positionsOk = 0;

  for (const pos of positions) {
    const items = pos.responsibilities;
    if (items.length === 0) {
      console.log(`  [skip] ${pos.code} "${pos.name}" — no responsibilities`);
      continue;
    }

    const currentSum = items.reduce((s, r) => s + r.weight, 0);
    if (Math.abs(currentSum - 100) < EPSILON) {
      console.log(`  [=] ${pos.code} "${pos.name}" — sum=${currentSum.toFixed(3)} OK`);
      positionsOk++;
      continue;
    }

    console.log(`  [!] ${pos.code} "${pos.name}" — sum=${currentSum.toFixed(3)} → needs rescale`);
    positionsFixed++;

    if (isDryRun) {
      // Show what would happen
      const scaleFactor = 100 / currentSum;
      let rescaledSum = 0;
      let maxWeight = -Infinity;
      let maxIdx = 0;
      const rescaled: number[] = [];

      for (let i = 0; i < items.length; i++) {
        const r = Math.round(items[i].weight * scaleFactor * 100) / 100;
        rescaled.push(r);
        rescaledSum += r;
        if (r > maxWeight) { maxWeight = r; maxIdx = i; }
      }

      const residual = Math.round((100 - rescaledSum) * 100) / 100;
      rescaled[maxIdx] = Math.round((rescaled[maxIdx] + residual) * 100) / 100;

      for (let i = 0; i < items.length; i++) {
        console.log(`      [dry] ${items[i].title}: ${items[i].weight} → ${rescaled[i]}`);
      }
      continue;
    }

    // Live rescale
    const scaleFactor = 100 / currentSum;
    const rescaled: number[] = [];
    let rescaledSum = 0;
    let maxWeight = -Infinity;
    let maxIdx = 0;

    for (let i = 0; i < items.length; i++) {
      const r = Math.round(items[i].weight * scaleFactor * 100) / 100;
      rescaled.push(r);
      rescaledSum += r;
      if (r > maxWeight) { maxWeight = r; maxIdx = i; }
    }

    // Apply residual to largest weight to guarantee total = 100
    const residual = Math.round((100 - rescaledSum) * 100) / 100;
    rescaled[maxIdx] = Math.round((rescaled[maxIdx] + residual) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`      ${item.title}: ${item.weight} → ${rescaled[i]}`);

        // Backup original weight
        await tx.$executeRawUnsafe(
          `UPDATE "common"."position_responsibilities"
           SET weight_backup_before_rescale = $1, weight = $2
           WHERE id = $3`,
          item.weight,
          rescaled[i],
          item.id
        );
      }
    });
  }

  console.log(`\n[rescaleWeights] Done. Fixed: ${positionsFixed}, Already OK: ${positionsOk}`);
  if (isDryRun) console.log('[rescaleWeights] DRY RUN — no changes written');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
