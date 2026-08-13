/**
 * Reassign product codes by reading directly from the database and normalizing
 * them to the LOAI-STT-TENVIETTAT format.
 *
 * What it does:
 *   - reads all InternationalProduct rows with reference counts
 *   - detects duplicate maSanPham (same code on 2+ rows)
 *   - merges duplicates when safe (repoints references, deletes duplicate)
 *   - reassigns codes using temporary codes to avoid unique-constraint collisions
 *   - upserts categories
 *
 * Usage:
 *   npx ts-node scripts/reassign-product-codes.ts              # dry run
 *   npx ts-node scripts/reassign-product-codes.ts --apply      # write to DB
 */

import { PrismaClient } from '@prisma/client';
import { categoryAbbr, abbreviateVietnamese, maxSequenceGlobal, UNCLASSIFIED_CATEGORY } from '../src/utils/productCode';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const NAME_ABBR_MAX = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  loaiSanPham: string | null;
  donViTinh: string | null;
  _count: {
    lotProducts: number;
    orderItems: number;
    quotationRequestItems: number;
    finishedProducts: number;
    materialStandardItems: number;
    materialStandardInputItems: number;
  };
  reorderRule: { id: string } | null;
}

/** Total reference count for a product (all relation types). */
function refCount(p: ProductRow): number {
  return (
    p._count.lotProducts +
    p._count.orderItems +
    p._count.quotationRequestItems +
    p._count.finishedProducts +
    p._count.materialStandardItems +
    p._count.materialStandardInputItems +
    (p.reorderRule ? 1 : 0)
  );
}

/** Extract the numeric STT from a product code. Legacy codes without a number return Infinity. */
function extractSeq(code: string): number {
  const parts = code.split('-');
  if (parts.length >= 2) {
    const n = parseInt(parts[1], 10);
    if (!isNaN(n)) return n;
  }
  return Infinity;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(APPLY ? '⚠️  APPLY mode — will write to the database\n' : '🔍 Dry run — nothing will be written\n');

  // 1. Read all products with full reference counts
  const products: ProductRow[] = await prisma.internationalProduct.findMany({
    select: {
      id: true,
      maSanPham: true,
      tenSanPham: true,
      loaiSanPham: true,
      donViTinh: true,
      _count: {
        select: {
          lotProducts: true,
          orderItems: true,
          quotationRequestItems: true,
          finishedProducts: true,
          materialStandardItems: true,
          materialStandardInputItems: true,
        },
      },
      reorderRule: { select: { id: true } },
    },
  });

  // Read existing categories
  const existingCategories = await prisma.productCategory.findMany({ select: { name: true } });
  const existingCategoryNames = new Set(existingCategories.map((c) => c.name));

  console.log(`Existing products:  ${products.length}`);
  console.log(`Existing categories: ${existingCategoryNames.size}`);

  // ─── 2. Detect duplicate maSanPham pairs ──────────────────────────────────

  const byCode = new Map<string, ProductRow[]>();
  for (const p of products) {
    const list = byCode.get(p.maSanPham) ?? [];
    list.push(p);
    byCode.set(p.maSanPham, list);
  }

  const duplicateGroups = [...byCode.entries()].filter(([, rows]) => rows.length >= 2);
  console.log(`\nDuplicate code groups: ${duplicateGroups.length}`);
  for (const [code, rows] of duplicateGroups) {
    console.log(`  ${code} → ${rows.length} products: ${rows.map((r) => r.id.slice(0, 8)).join(', ')}`);
  }

  // ─── 3. Merge duplicates with safety checks ───────────────────────────────

  interface MergePlan {
    canonical: ProductRow;
    duplicate: ProductRow;
    canonicalCode: string; // will be reassigned later
    reason?: string; // if blocked
    blocked: boolean;
  }

  const mergePlans: MergePlan[] = [];
  const mergeIds = new Set<string>(); // IDs that will be deleted via merge

  for (const [, rows] of duplicateGroups) {
    // Pick the one with MORE references as canonical
    const sorted = [...rows].sort((a, b) => refCount(b) - refCount(a));
    const canonical = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i];
      const plan: MergePlan = { canonical, duplicate: dup, canonicalCode: '', blocked: false };

      // Safety: if duplicate has lotProducts or reorderRule → BLOCK
      if (dup._count.lotProducts > 0) {
        plan.blocked = true;
        plan.reason = `has ${dup._count.lotProducts} lot-product rows`;
      } else if (dup.reorderRule) {
        plan.blocked = true;
        plan.reason = 'has a reorder rule';
      }

      // Safety: if duplicate has finishedProducts where same (maChien, ngaySanXuat, machineSystemId)
      // exists on canonical → BLOCK
      if (!plan.blocked && dup._count.finishedProducts > 0) {
        const canonicalFPs = await prisma.finishedProduct.findMany({
          where: { internationalProductId: canonical.id },
          select: { maChien: true, ngaySanXuat: true, machineSystemId: true },
        });
        const canonicalKeys = new Set(
          canonicalFPs.map((fp) => `${fp.maChien}|${fp.ngaySanXuat?.toISOString() ?? ''}|${fp.machineSystemId ?? ''}`)
        );

        const dupFPs = await prisma.finishedProduct.findMany({
          where: { internationalProductId: dup.id },
          select: { maChien: true, ngaySanXuat: true, machineSystemId: true },
        });

        const conflict = dupFPs.find(
          (fp) => canonicalKeys.has(`${fp.maChien}|${fp.ngaySanXuat?.toISOString() ?? ''}|${fp.machineSystemId ?? ''}`)
        );
        if (conflict) {
          plan.blocked = true;
          plan.reason = `finishedProduct overlap: maChien=${conflict.maChien}, ngaySanXuat=${conflict.ngaySanXuat?.toISOString().slice(0, 10)}, machineSystemId=${conflict.machineSystemId ?? 'null'}`;
        }
      }

      mergePlans.push(plan);
      if (!plan.blocked) {
        mergeIds.add(dup.id);
      }
    }
  }

  const blockedMerges = mergePlans.filter((m) => m.blocked);
  const safeMerges = mergePlans.filter((m) => !m.blocked);

  // ─── 4. Plan code reassignment ────────────────────────────────────────────

  // Remaining products = all minus those being deleted via merge
  const remaining = products.filter((p) => !mergeIds.has(p.id));

  // Sort by existing STT in code (extract number from second segment of LOAI-STT-TEN format)
  // Legacy codes without a numeric STT go to the end
  remaining.sort((a, b) => {
    const seqA = extractSeq(a.maSanPham);
    const seqB = extractSeq(b.maSanPham);
    return seqA - seqB || a.maSanPham.localeCompare(b.maSanPham, 'vi');
  });

  // Start from 0 so the first product gets STT 001 (not continuing from old sequences).
  let globalSeq = 0;

  const nextCode = (loai: string, ten: string): string => {
    const prefix = categoryAbbr(loai);
    if (!prefix) return `UNC-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}-X`;
    globalSeq++;
    const tail = abbreviateVietnamese(ten, NAME_ABBR_MAX) || 'X';
    return `${prefix}-${String(globalSeq).padStart(3, '0')}-${tail}`;
  };

  // Assign new codes to remaining products
  interface ReassignRow {
    id: string;
    maCu: string;
    maMoi: string;
    tenSanPham: string;
    loaiSanPham: string; // normalized — never null in output
    donViTinh: string;
    changed: boolean;
  }

  const reassignRows: ReassignRow[] = [];
  for (const p of remaining) {
    const loai = p.loaiSanPham ?? UNCLASSIFIED_CATEGORY;
    const maMoi = nextCode(loai, p.tenSanPham);
    const donViTinh = p.donViTinh ?? '';
    const codeChanged = p.maSanPham !== maMoi;
    reassignRows.push({
      id: p.id,
      maCu: p.maSanPham,
      maMoi,
      tenSanPham: p.tenSanPham,
      loaiSanPham: loai,
      donViTinh,
      changed: codeChanged,
    });
  }

  // Update canonicalCode on merge plans (canonical's new code)
  const codeById = new Map(reassignRows.map((r) => [r.id, r.maMoi]));
  for (const m of mergePlans) {
    m.canonicalCode = codeById.get(m.canonical.id) ?? m.canonical.maSanPham;
  }

  // ─── 5. Print summary ─────────────────────────────────────────────────────

  console.log(`\n${'═'.repeat(80)}`);
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total products:          ${products.length}`);
  console.log(`Duplicate groups:        ${duplicateGroups.length}`);
  console.log(`Merges (safe):           ${safeMerges.length}`);
  console.log(`Merges (BLOCKED):        ${blockedMerges.length}`);
  console.log(`Remaining after merge:   ${remaining.length}`);
  console.log(`Codes changing:          ${reassignRows.filter((r) => r.changed).length}`);

  // Category summary
  const categories = new Set(reassignRows.map((r) => r.loaiSanPham));
  console.log(`\nCategories (${categories.size}):`);
  for (const c of [...categories].sort()) {
    const prefix = categoryAbbr(c);
    const count = reassignRows.filter((r) => r.loaiSanPham === c).length;
    console.log(`  ${prefix.padEnd(7)} ${String(count).padStart(3)}  ${c}`);
  }

  // Print blocked merges
  if (blockedMerges.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('BLOCKED MERGES (skipped):');
    console.log('─'.repeat(80));
    for (const m of blockedMerges) {
      console.log(`  ${m.duplicate.maSanPham} (refs: ${refCount(m.duplicate)}) → BLOCKED: ${m.reason}`);
    }
  }

  // Print safe merges
  if (safeMerges.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('SAFE MERGES:');
    console.log('─'.repeat(80));
    for (const m of safeMerges) {
      console.log(
        `  ${m.duplicate.maSanPham} (refs: ${refCount(m.duplicate)}) → repoint to ${m.canonical.maSanPham}, then delete`
      );
    }
  }

  // Print full code mapping
  console.log(`\n${'─'.repeat(80)}`);
  console.log('CODE MAPPING (maCu → maMoi):');
  console.log('─'.repeat(80));
  for (const r of reassignRows) {
    const flag = r.changed ? '  ✏️' : '  (unchanged)';
    console.log(`  ${r.maCu.padEnd(18)} → ${r.maMoi.padEnd(18)} ${r.loaiSanPham.padEnd(22)} ${r.tenSanPham}${flag}`);
  }

  // ─── 6. Sanity check: all resulting codes must be unique ──────────────────

  const allCodes = reassignRows.map((r) => r.maMoi);
  const codeSet = new Set(allCodes);
  const dupCodes = allCodes.filter((c, i) => allCodes.indexOf(c) !== i);
  console.log(`\nTotal codes after reassignment: ${allCodes.length}, unique: ${codeSet.size}, duplicates: ${dupCodes.length}`);
  if (dupCodes.length > 0) {
    throw new Error(`Duplicate codes planned: ${[...new Set(dupCodes)].join(', ')}`);
  }

  // ─── 7. Dry run exit ─────────────────────────────────────────────────────

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write.');
    return;
  }

  // ─── 8. Apply: write to database in one transaction ──────────────────────

  console.log('\nApplying changes...');

  await prisma.$transaction(
    async (tx) => {
      // 8a. Upsert categories
      const allCategories = new Set(reassignRows.map((r) => r.loaiSanPham));
      for (const cat of allCategories) {
        await tx.productCategory.upsert({ where: { name: cat }, create: { name: cat }, update: {} });
      }

      // 8b. Merge safe duplicates
      for (const m of safeMerges) {
        // Repoint quotation request items
        await tx.quotationRequestItem.updateMany({
          where: { productId: m.duplicate.id },
          data: { productId: m.canonical.id, maSanPham: m.canonicalCode },
        });
        // Repoint order items
        await tx.orderItem.updateMany({
          where: { productId: m.duplicate.id },
          data: { productId: m.canonical.id, maSanPham: m.canonicalCode },
        });
        // Repoint finished products
        await tx.finishedProduct.updateMany({
          where: { internationalProductId: m.duplicate.id },
          data: { internationalProductId: m.canonical.id },
        });
        // Repoint material standard items
        await tx.materialStandardItem.updateMany({
          where: { internationalProductId: m.duplicate.id },
          data: { internationalProductId: m.canonical.id },
        });
        // Repoint material standard input items
        await tx.materialStandardInputItem.updateMany({
          where: { internationalProductId: m.duplicate.id },
          data: { internationalProductId: m.canonical.id },
        });
        // Delete duplicate
        await tx.internationalProduct.delete({ where: { id: m.duplicate.id } });
      }

      // 8c. Park all changing rows on temporary codes to avoid unique-constraint collisions
      const changing = reassignRows.filter((r) => r.changed);
      for (const [i, r] of changing.entries()) {
        await tx.internationalProduct.update({
          where: { id: r.id },
          data: { maSanPham: `__TMP_${i}__` },
        });
      }

      // 8d. Update to final codes and metadata
      for (const r of reassignRows) {
        const original = products.find((p) => p.id === r.id);
        const data: Record<string, unknown> = { maSanPham: r.maMoi };
        // Update fields if they differ from current values
        if (original?.tenSanPham !== r.tenSanPham) data.tenSanPham = r.tenSanPham;
        if (original?.loaiSanPham !== r.loaiSanPham) data.loaiSanPham = r.loaiSanPham;
        if ((original?.donViTinh ?? '') !== r.donViTinh) data.donViTinh = r.donViTinh;
        await tx.internationalProduct.update({
          where: { id: r.id },
          data,
        });
      }

      console.log(`✅ Applied: ${safeMerges.length} merges, ${changing.length} code reassignments`);
    },
    { timeout: 180_000 }
  );

  // Verify
  const after = await prisma.internationalProduct.count();
  console.log(`\n✅ Done. Products now: ${after} (was ${products.length}, merged ${safeMerges.length})`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
