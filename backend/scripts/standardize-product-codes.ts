/**
 * Standardize product codes to LOAI-STT-TENVIETTAT.
 *
 * Existing codes are two-segment and their prefix already encodes a finer classification
 * than `loaiSanPham` does (NLT, BB01, SPK, MSLB...). This maps each legacy prefix onto one
 * of the eight standard categories, then rebuilds every code from that category plus the
 * product name.
 *
 * Usage:
 *   npx ts-node scripts/standardize-product-codes.ts            # dry run, writes a CSV
 *   npx ts-node scripts/standardize-product-codes.ts --apply    # writes to the database
 *
 * Dry run is the default on purpose: the mapping needs a human to check it before 77
 * product codes change. Nothing is written until --apply is passed.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  abbreviateVietnamese,
  categoryAbbr,
  STANDARD_CATEGORIES,
} from '../src/utils/productCode';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NAME_ABBR_MAX = 10;

/**
 * Legacy code prefix -> standard category.
 *
 * Longest prefix wins, so NLD02 is checked before NLD. Derived from the prefixes actually
 * present in production; anything unmatched is reported and left alone rather than guessed.
 */
const PREFIX_TO_CATEGORY: Array<[string, string]> = [
  ['NLT', 'Nguyên liệu trái'],
  ['NLD02', 'Nguyên liệu đông lạnh'],
  ['NLD', 'Nguyên liệu đông lạnh'],
  ['NLĐ', 'Nguyên liệu đông lạnh'],
  ['SPD', 'Nguyên liệu đông lạnh'],
  ['NL01', 'Nhiên liệu'],
  ['PL01', 'Phụ liệu'],
  ['PL02', 'Phụ liệu'],
  ['PL03', 'Phụ liệu'],
  ['BB01', 'Bao bì'],
  ['BB02', 'Bao bì'],
  ['BB03', 'Bao bì'],
  ['BB06', 'Bao bì'],
  ['BB04', 'Công cụ dụng cụ'],
  ['BB05', 'Công cụ dụng cụ'],
  ['SPK', 'Thành phẩm sấy'],
  ['MSLB', 'Thành phẩm sấy'],
  ['MSSS', 'Thành phẩm sấy'],
  ['SKD', 'Thành phẩm đông lạnh'],
];

interface Row {
  id: string;
  maCu: string;
  tenSanPham: string;
  loaiCu: string;
  loaiMoi: string;
  maMoi: string;
  note: string;
}

/** Resolve the legacy prefix of a code to a standard category, longest match first. */
function categoryForCode(maSanPham: string): string | null {
  const prefix = maSanPham.split('-')[0];
  const sorted = [...PREFIX_TO_CATEGORY].sort((a, b) => b[0].length - a[0].length);
  for (const [legacy, category] of sorted) {
    if (prefix === legacy) return category;
  }
  return null;
}

async function main() {
  console.log(APPLY ? '⚠️  APPLY mode — will write to the database\n' : '🔍 Dry run — nothing will be written\n');

  const products = await prisma.internationalProduct.findMany({
    orderBy: { maSanPham: 'asc' },
    select: { id: true, maSanPham: true, tenSanPham: true, loaiSanPham: true },
  });

  console.log(`Found ${products.length} products\n`);

  const rows: Row[] = [];
  const unmapped: string[] = [];
  // Sequence counter per category, so each category numbers from 001 independently.
  const seqByCategory = new Map<string, number>();
  const usedCodes = new Set<string>();

  for (const p of products) {
    const loaiMoi = categoryForCode(p.maSanPham);

    if (!loaiMoi) {
      unmapped.push(`${p.maSanPham} (${p.tenSanPham})`);
      rows.push({
        id: p.id,
        maCu: p.maSanPham,
        tenSanPham: p.tenSanPham,
        loaiCu: p.loaiSanPham || '',
        loaiMoi: '',
        maMoi: p.maSanPham,
        note: 'KHONG MAP DUOC PREFIX - giu nguyen, can xu ly tay',
      });
      continue;
    }

    const prefix = categoryAbbr(loaiMoi);
    const seq = (seqByCategory.get(prefix) ?? 0) + 1;
    seqByCategory.set(prefix, seq);

    const nameAbbr = abbreviateVietnamese(p.tenSanPham, NAME_ABBR_MAX) || 'X';
    let maMoi = `${prefix}-${String(seq).padStart(3, '0')}-${nameAbbr}`;

    // Two products can abbreviate to the same tail within a category; the sequence
    // already differs, so a plain collision here means a genuine duplicate code.
    let note = p.loaiSanPham !== loaiMoi ? `loai doi: "${p.loaiSanPham || '(trong)'}" -> "${loaiMoi}"` : '';
    if (usedCodes.has(maMoi)) {
      note = `${note} | TRUNG MA - can xu ly tay`.trim();
    }
    usedCodes.add(maMoi);

    rows.push({
      id: p.id,
      maCu: p.maSanPham,
      tenSanPham: p.tenSanPham,
      loaiCu: p.loaiSanPham || '',
      loaiMoi,
      maMoi,
      note,
    });
  }

  // Duplicate product names: two rows may describe the same physical item under
  // different codes. Merging them is a business decision (each may already have stock
  // or documents attached), so this only reports.
  const byName = new Map<string, string[]>();
  for (const p of products) {
    const key = p.tenSanPham.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), p.maSanPham]);
  }
  const duplicateNames = [...byName.entries()].filter(([, codes]) => codes.length > 1);

  // ─── Report ────────────────────────────────────────────────────────────────

  const changed = rows.filter((r) => r.maMoi !== r.maCu);
  const categoryChanged = rows.filter((r) => r.loaiMoi && r.loaiCu !== r.loaiMoi);

  console.log(`Codes to change:      ${changed.length}`);
  console.log(`Categories to change: ${categoryChanged.length}`);
  console.log(`Unmapped prefixes:    ${unmapped.length}`);
  console.log(`Duplicate names:      ${duplicateNames.length}\n`);

  console.log('Per category:');
  for (const category of STANDARD_CATEGORIES) {
    const n = rows.filter((r) => r.loaiMoi === category).length;
    if (n > 0) console.log(`  ${categoryAbbr(category).padEnd(5)} ${String(n).padStart(3)}  ${category}`);
  }
  console.log();

  if (unmapped.length > 0) {
    console.log('⚠️  Prefixes with no mapping (left unchanged):');
    unmapped.forEach((u) => console.log(`  ${u}`));
    console.log();
  }

  if (duplicateNames.length > 0) {
    console.log('⚠️  Duplicate product names (NOT merged — decide manually):');
    duplicateNames.forEach(([name, codes]) => console.log(`  "${name}" -> ${codes.join(', ')}`));
    console.log();
  }

  const csvPath = path.join(__dirname, 'product-code-mapping.csv');
  const csv = [
    'maCu,tenSanPham,loaiCu,loaiMoi,maMoi,note',
    ...rows.map((r) =>
      [r.maCu, r.tenSanPham, r.loaiCu, r.loaiMoi, r.maMoi, r.note]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf-8');
  console.log(`📄 Mapping written to ${csvPath}\n`);

  if (!APPLY) {
    console.log('Dry run complete. Review the CSV, then re-run with --apply.');
    return;
  }

  // ─── Apply ─────────────────────────────────────────────────────────────────

  // Codes are unique, so renames can collide with a code that has not been rewritten
  // yet. Writing in one transaction keeps the catalogue consistent, and a two-phase
  // rename via temporary codes avoids transient collisions.
  await prisma.$transaction(async (tx) => {
    for (const category of STANDARD_CATEGORIES) {
      await tx.productCategory.upsert({
        where: { name: category },
        create: { name: category },
        update: {},
      });
    }

    const toChange = rows.filter((r) => r.maMoi !== r.maCu);

    // Phase 1: park every changing row on a code nothing else can hold.
    for (const [i, r] of toChange.entries()) {
      await tx.internationalProduct.update({
        where: { id: r.id },
        data: { maSanPham: `__TMP_${i}__` },
      });
    }

    // Phase 2: settle on the final codes and categories.
    for (const r of toChange) {
      await tx.internationalProduct.update({
        where: { id: r.id },
        data: { maSanPham: r.maMoi, ...(r.loaiMoi ? { loaiSanPham: r.loaiMoi } : {}) },
      });
    }

    // Rows whose code is unchanged may still need their category corrected.
    for (const r of rows.filter((x) => x.maMoi === x.maCu && x.loaiMoi && x.loaiCu !== x.loaiMoi)) {
      await tx.internationalProduct.update({
        where: { id: r.id },
        data: { loaiSanPham: r.loaiMoi },
      });
    }
  }, { timeout: 120_000 });

  console.log(`✅ Applied: ${changed.length} codes, ${categoryChanged.length} categories, ${STANDARD_CATEGORIES.length} categories upserted`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
