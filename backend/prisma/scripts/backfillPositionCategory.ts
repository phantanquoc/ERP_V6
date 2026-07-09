/**
 * backfillPositionCategory.ts
 *
 * Assigns Position.category based on Position.code seed patterns and keyword mapping (design D1).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillPositionCategory.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register backend/prisma/scripts/backfillPositionCategory.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

// D1 keyword mapping — order matters: MANAGEMENT checked first (superset of keywords)
const MANAGEMENT_KEYWORDS = ['trưởng', 'giám đốc', 'quản lý', 'phó', 'trưởng nhóm'];
const PRODUCTION_KEYWORDS = ['sản xuất', 'kho', 'qc', 'vận hành', 'kỹ sư sx', 'công nhân'];
const OFFICE_KEYWORDS = ['kế toán', 'nhân sự', 'marketing', 'it ', 'hành chính', 'kinh doanh', 'tài chính', 'mua hàng'];

// D1 explicit code mapping from seed data
const CODE_OVERRIDES: Record<string, 'PRODUCTION' | 'OFFICE' | 'MANAGEMENT'> = {
  'POS_003': 'PRODUCTION', // Nhân viên sản xuất
  'POS_008': 'PRODUCTION', // Kỹ sư sản xuất
};

type PositionCategory = 'PRODUCTION' | 'OFFICE' | 'MANAGEMENT';

function inferCategory(code: string, name: string): PositionCategory {
  if (CODE_OVERRIDES[code]) return CODE_OVERRIDES[code];

  const lower = name.toLowerCase();

  // Management check first — a "Trưởng bộ phận sản xuất" is MANAGEMENT, not PRODUCTION
  for (const kw of MANAGEMENT_KEYWORDS) {
    if (lower.includes(kw)) return 'MANAGEMENT';
  }
  for (const kw of PRODUCTION_KEYWORDS) {
    if (lower.includes(kw)) return 'PRODUCTION';
  }
  for (const kw of OFFICE_KEYWORDS) {
    if (lower.includes(kw)) return 'OFFICE';
  }

  return 'OFFICE'; // safe default per D1 decision
}

async function main() {
  console.log(`[backfillPositionCategory] ${isDryRun ? 'DRY RUN' : 'LIVE'} started`);

  const positions = await prisma.position.findMany({
    select: { id: true, code: true, name: true, category: true },
  });

  let changed = 0;
  let unchanged = 0;

  for (const pos of positions) {
    const inferred = inferCategory(pos.code, pos.name);

    if (pos.category === inferred) {
      console.log(`  [=] ${pos.code} "${pos.name}" → ${inferred} (already set)`);
      unchanged++;
      continue;
    }

    console.log(`  [*] ${pos.code} "${pos.name}" → ${pos.category} → ${inferred}`);
    changed++;

    if (!isDryRun) {
      await (prisma.position as any).update({
        where: { id: pos.id },
        data: { category: inferred },
      });
    }
  }

  console.log(`\n[backfillPositionCategory] Done. Changed: ${changed}, Unchanged: ${unchanged}`);

  if (isDryRun) {
    console.log('[backfillPositionCategory] DRY RUN — no changes written');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
