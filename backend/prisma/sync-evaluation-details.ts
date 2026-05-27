/**
 * Script đồng bộ evaluation_details từ position_responsibilities cho kỳ hiện tại
 * Chạy: npx ts-node --transpile-only prisma/sync-evaluation-details.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const period = '2026-05';
  console.log(`🔄 Syncing evaluation details for period ${period}...`);

  const evaluations = await prisma.evaluation.findMany({
    where: { period },
    include: {
      details: { select: { positionResponsibilityId: true } },
      employee: {
        include: {
          position: {
            include: { responsibilities: true },
          },
        },
      },
    },
  });

  console.log(`Found ${evaluations.length} evaluations`);

  let synced = 0;
  let skipped = 0;

  for (const evaluation of evaluations) {
    const responsibilities = evaluation.employee.position?.responsibilities ?? [];
    const existingIds = new Set(evaluation.details.map(d => d.positionResponsibilityId));
    const missing = responsibilities.filter(r => !existingIds.has(r.id));

    if (missing.length === 0) {
      skipped++;
      continue;
    }

    await prisma.evaluationDetail.createMany({
      data: missing.map(r => ({
        evaluationId: evaluation.id,
        positionResponsibilityId: r.id,
      })),
    });
    synced++;
    console.log(`  ✅ ${evaluation.employee.employeeCode}: added ${missing.length} details`);
  }

  console.log(`\n✅ Done: ${synced} evaluations synced, ${skipped} already complete`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
