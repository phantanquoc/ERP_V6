/**
 * backfillCreatedById.ts
 *
 * Best-effort backfill script: populates `createdById` on the 11 Group-B models
 * that have a free-text creator field but no machine-readable userId.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillCreatedById.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillCreatedById.ts
 *
 * RepairRequest and TaxReport are NOT backfilled (no source text data).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

interface BackfillStats {
  model: string;
  matched: number;
  ambiguous: number;
  noMatch: number;
  alreadySet: number;
}

/**
 * Build a Map<fullName, userId[]> from the User table.
 * fullName is constructed as `lastName firstName` (Vietnamese convention).
 */
async function buildNameToUserMap(): Promise<Map<string, string[]>> {
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true },
  });

  const map = new Map<string, string[]>();
  for (const u of users) {
    const fullName = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim();
    if (!fullName) continue;
    const existing = map.get(fullName) ?? [];
    existing.push(u.id);
    map.set(fullName, existing);
  }
  return map;
}

/**
 * Resolve a text name to a single userId, or null with a reason string.
 */
function resolveName(
  nameMap: Map<string, string[]>,
  name: string | null | undefined,
): { userId: string } | { skip: string } {
  if (!name || name.trim() === '') return { skip: 'empty name' };
  const name_trimmed = name.trim();
  const candidates = nameMap.get(name_trimmed);
  if (!candidates || candidates.length === 0) return { skip: `no match for "${name_trimmed}"` };
  if (candidates.length > 1) return { skip: `ambiguous: ${candidates.length} users named "${name_trimmed}"` };
  return { userId: candidates[0] };
}

/**
 * Generic backfill runner for a single model.
 */
async function backfillModel<T extends { id: string | number; createdById?: string | null }>(
  modelName: string,
  nameMap: Map<string, string[]>,
  findMany: () => Promise<Array<T & { textField: string | null }>>,
  updateOne: (id: string | number, userId: string) => Promise<void>,
): Promise<BackfillStats> {
  const stats: BackfillStats = { model: modelName, matched: 0, ambiguous: 0, noMatch: 0, alreadySet: 0 };
  const rows = await findMany();

  for (const row of rows) {
    if (row.createdById) {
      stats.alreadySet++;
      continue;
    }

    const result = resolveName(nameMap, row.textField);
    if ('userId' in result) {
      if (!isDryRun) {
        await updateOne(row.id, result.userId);
      }
      stats.matched++;
    } else if (result.skip.startsWith('ambiguous')) {
      console.log(`  [SKIP] ${modelName} id=${row.id}: ${result.skip}`);
      stats.ambiguous++;
    } else {
      stats.noMatch++;
    }
  }

  return stats;
}

async function main() {
  console.log(`\n=== backfillCreatedById ${isDryRun ? '[DRY RUN]' : '[LIVE]'} ===\n`);

  const nameMap = await buildNameToUserMap();
  console.log(`Built name map: ${nameMap.size} unique fullNames from User table\n`);

  const allStats: BackfillStats[] = [];

  // FaultRecord — text field: nguoiPhatHien
  allStats.push(await backfillModel(
    'FaultRecord',
    nameMap,
    async () => {
      const rows = await prisma.faultRecord.findMany({
        where: { nguoiPhatHien: { not: '' } },
        select: { id: true, createdById: true, nguoiPhatHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiPhatHien }));
    },
    async (id, userId) => {
      await prisma.faultRecord.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // MaintenancePlan — text field: nguoiLap
  allStats.push(await backfillModel(
    'MaintenancePlan',
    nameMap,
    async () => {
      const rows = await prisma.maintenancePlan.findMany({
        where: { nguoiLap: { not: '' } },
        select: { id: true, createdById: true, nguoiLap: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiLap }));
    },
    async (id, userId) => {
      await prisma.maintenancePlan.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // MaintenanceRecord — text field: nguoiThucHien
  allStats.push(await backfillModel(
    'MaintenanceRecord',
    nameMap,
    async () => {
      const rows = await prisma.maintenanceRecord.findMany({
        where: { nguoiThucHien: { not: '' } },
        select: { id: true, createdById: true, nguoiThucHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiThucHien }));
    },
    async (id, userId) => {
      await prisma.maintenanceRecord.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // AcceptanceHandover — text field: nguoiBanGiao
  allStats.push(await backfillModel(
    'AcceptanceHandover',
    nameMap,
    async () => {
      const rows = await prisma.acceptanceHandover.findMany({
        where: { nguoiBanGiao: { not: '' } },
        select: { id: true, createdById: true, nguoiBanGiao: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiBanGiao }));
    },
    async (id, userId) => {
      await prisma.acceptanceHandover.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // MaterialEvaluation — text field: nguoiThucHien
  allStats.push(await backfillModel(
    'MaterialEvaluation',
    nameMap,
    async () => {
      const rows = await prisma.materialEvaluation.findMany({
        where: { nguoiThucHien: { not: '' } },
        select: { id: true, createdById: true, nguoiThucHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiThucHien }));
    },
    async (id, userId) => {
      await prisma.materialEvaluation.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // FinishedProduct — text field: nguoiThucHien
  allStats.push(await backfillModel(
    'FinishedProduct',
    nameMap,
    async () => {
      const rows = await prisma.finishedProduct.findMany({
        where: { nguoiThucHien: { not: '' } },
        select: { id: true, createdById: true, nguoiThucHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiThucHien }));
    },
    async (id, userId) => {
      await prisma.finishedProduct.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // QualityEvaluation — text field: nguoiThucHien
  allStats.push(await backfillModel(
    'QualityEvaluation',
    nameMap,
    async () => {
      const rows = await prisma.qualityEvaluation.findMany({
        where: { nguoiThucHien: { not: '' } },
        select: { id: true, createdById: true, nguoiThucHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiThucHien }));
    },
    async (id, userId) => {
      await prisma.qualityEvaluation.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // ProductionReport — text field: nguoiThucHien
  allStats.push(await backfillModel(
    'ProductionReport',
    nameMap,
    async () => {
      const rows = await prisma.productionReport.findMany({
        where: { nguoiThucHien: { not: '' } },
        select: { id: true, createdById: true, nguoiThucHien: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiThucHien }));
    },
    async (id, userId) => {
      await prisma.productionReport.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // InternalInspection — text field: inspectedBy
  allStats.push(await backfillModel(
    'InternalInspection',
    nameMap,
    async () => {
      const rows = await prisma.internalInspection.findMany({
        where: { inspectedBy: { not: '' } },
        select: { id: true, createdById: true, inspectedBy: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.inspectedBy }));
    },
    async (id, userId) => {
      await prisma.internalInspection.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // CustomerFeedback — text field: nguoiTiepNhan
  allStats.push(await backfillModel(
    'CustomerFeedback',
    nameMap,
    async () => {
      const rows = await prisma.customerFeedback.findMany({
        where: { nguoiTiepNhan: { not: null } },
        select: { id: true, createdById: true, nguoiTiepNhan: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nguoiTiepNhan ?? null }));
    },
    async (id, userId) => {
      await prisma.customerFeedback.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // Invoice — text field: nhanVienLap
  allStats.push(await backfillModel(
    'Invoice',
    nameMap,
    async () => {
      const rows = await prisma.invoice.findMany({
        where: { nhanVienLap: { not: null } },
        select: { id: true, createdById: true, nhanVienLap: true },
      });
      return rows.map(r => ({ id: r.id, createdById: r.createdById, textField: r.nhanVienLap ?? null }));
    },
    async (id, userId) => {
      await prisma.invoice.update({ where: { id: id as string }, data: { createdById: userId } });
    },
  ));

  // Summary report
  console.log('\n=== Summary ===\n');
  console.log('Model                  | Matched | Ambiguous | No Match | Already Set');
  console.log('---------------------- | ------- | --------- | -------- | -----------');
  let totalMatched = 0, totalAmbiguous = 0, totalNoMatch = 0;
  for (const s of allStats) {
    console.log(
      `${s.model.padEnd(22)} | ${String(s.matched).padEnd(7)} | ${String(s.ambiguous).padEnd(9)} | ${String(s.noMatch).padEnd(8)} | ${s.alreadySet}`,
    );
    totalMatched += s.matched;
    totalAmbiguous += s.ambiguous;
    totalNoMatch += s.noMatch;
  }
  console.log('---------------------- | ------- | --------- | -------- | -----------');
  console.log(`${'TOTAL'.padEnd(22)} | ${String(totalMatched).padEnd(7)} | ${String(totalAmbiguous).padEnd(9)} | ${totalNoMatch}`);

  if (isDryRun) {
    console.log('\n[DRY RUN] No rows were updated. Re-run without --dry-run to apply.\n');
  } else {
    console.log(`\n[LIVE] ${totalMatched} rows updated.\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
