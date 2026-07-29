/**
 * Rebuild the product catalogue from the official spreadsheet
 * ("DANH SÁCH HÀNG HÓA.xlsx"), assigning codes with the LOAI-STT-TENVIETTAT rule.
 *
 * What it does:
 *   - upserts the 7 categories from the file
 *   - for each row: matches an existing product by normalised name, then updates its
 *     name / category / unit / code, or creates it if absent
 *   - products absent from the file are deleted, EXCEPT those still referenced by lots,
 *     orders, quotations or finished-product rows — those are kept and reported, since
 *     deleting them would strip line items out of existing documents
 *
 * Usage:
 *   npx ts-node scripts/import-product-catalogue.ts --file <path.json>
 *   npx ts-node scripts/import-product-catalogue.ts --file <path.json> --apply
 *
 * Dry run is the default. The spreadsheet is passed in as JSON
 * ([{ ten, loai, dvt }]) so this script does not need an xlsx parser.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { abbreviateVietnamese, categoryAbbr } from '../src/utils/productCode';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const fileIdx = process.argv.indexOf('--file');
const FILE = fileIdx >= 0 ? process.argv[fileIdx + 1] : '';
const NAME_ABBR_MAX = 10;

interface SourceRow {
  ten: string;
  loai: string;
  dvt: string;
}

/** Compare names ignoring case, diacritics and punctuation. */
function normName(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Units are display text; capitalise so "xe" and "Xe" do not both appear. */
function normUnit(s: string): string {
  const t = (s || '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

async function main() {
  if (!FILE || !fs.existsSync(FILE)) {
    throw new Error(`Missing or unreadable --file (got: ${FILE || '(none)'})`);
  }

  const rows: SourceRow[] = JSON.parse(fs.readFileSync(FILE, 'utf-8')).map((r: SourceRow) => ({
    ten: (r.ten || '').split(/\s+/).join(' ').trim(),
    loai: (r.loai || '').split(/\s+/).join(' ').trim(),
    dvt: normUnit(r.dvt),
  }));

  console.log(APPLY ? '⚠️  APPLY mode — will write to the database\n' : '🔍 Dry run — nothing will be written\n');
  console.log(`Source rows: ${rows.length}`);

  const categories = [...new Set(rows.map((r) => r.loai))].filter(Boolean).sort();
  console.log(`Categories:  ${categories.length}`);
  for (const c of categories) {
    console.log(`  ${categoryAbbr(c).padEnd(7)} ${String(rows.filter((r) => r.loai === c).length).padStart(3)}  ${c}`);
  }

  // Two categories abbreviating to the same prefix would make their codes ambiguous.
  const byAbbr = new Map<string, string[]>();
  for (const c of categories) {
    const a = categoryAbbr(c);
    byAbbr.set(a, [...(byAbbr.get(a) ?? []), c]);
  }
  const abbrClash = [...byAbbr.entries()].filter(([, v]) => v.length > 1);
  if (abbrClash.length > 0) {
    throw new Error(`Category abbreviation clash: ${JSON.stringify(abbrClash)}`);
  }

  const existing = await prisma.internationalProduct.findMany({
    select: {
      id: true,
      maSanPham: true,
      tenSanPham: true,
      loaiSanPham: true,
      donViTinh: true,
      _count: {
        select: { lotProducts: true, orderItems: true, quotationRequestItems: true, finishedProducts: true },
      },
    },
  });
  console.log(`\nExisting products: ${existing.length}`);

  const byName = new Map<string, typeof existing>();
  for (const e of existing) {
    const k = normName(e.tenSanPham);
    byName.set(k, [...(byName.get(k) ?? []), e]);
  }

  // ─── Plan ──────────────────────────────────────────────────────────────────

  const seqByPrefix = new Map<string, number>();
  const nextCode = (loai: string, ten: string) => {
    const prefix = categoryAbbr(loai);
    const seq = (seqByPrefix.get(prefix) ?? 0) + 1;
    seqByPrefix.set(prefix, seq);
    const tail = abbreviateVietnamese(ten, NAME_ABBR_MAX) || 'X';
    return `${prefix}-${String(seq).padStart(3, '0')}-${tail}`;
  };

  const toUpdate: Array<{ id: string; maCu: string; maMoi: string; row: SourceRow; before: string }> = [];
  const toCreate: Array<{ maMoi: string; row: SourceRow }> = [];
  const matchedIds = new Set<string>();

  for (const row of rows) {
    const hits = byName.get(normName(row.ten)) ?? [];
    // Prefer a hit not already claimed by an earlier row.
    const hit = hits.find((h) => !matchedIds.has(h.id));
    const maMoi = nextCode(row.loai, row.ten);

    if (hit) {
      matchedIds.add(hit.id);
      toUpdate.push({
        id: hit.id,
        maCu: hit.maSanPham,
        maMoi,
        row,
        before: `${hit.tenSanPham} | ${hit.loaiSanPham || '-'} | ${hit.donViTinh || '-'}`,
      });
    } else {
      toCreate.push({ maMoi, row });
    }
  }

  const leftover = existing.filter((e) => !matchedIds.has(e.id));
  const refCount = (e: (typeof existing)[number]) =>
    e._count.lotProducts + e._count.orderItems + e._count.quotationRequestItems + e._count.finishedProducts;
  const toDelete = leftover.filter((e) => refCount(e) === 0);
  const toKeep = leftover.filter((e) => refCount(e) > 0);

  // A leftover row whose name also appears in the file is a duplicate record, not a
  // product missing from the catalogue: an earlier row already claimed the match. Worth
  // separating, because the fix is to repoint its documents at the canonical row and
  // delete it — which only the user can decide.
  const fileNames = new Set(rows.map((r) => normName(r.ten)));
  const duplicateKept = toKeep.filter((e) => fileNames.has(normName(e.tenSanPham)));

  // A duplicate record is merged into its canonical row rather than kept: its documents
  // are repointed and the row is deleted, so the catalogue holds one row per product.
  const toMerge = duplicateKept
    .map((dup) => {
      const canonical = toUpdate.find((u) => normName(u.row.ten) === normName(dup.tenSanPham));
      return canonical ? { dup, canonicalId: canonical.id, canonicalCode: canonical.maMoi } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const mergeIds = new Set(toMerge.map((m) => m.dup.id));

  // Kept-but-absent rows still need a code in the new scheme, and a category, so they do
  // not sit in the catalogue as the only rows following the old convention.
  const KEEP_CATEGORY = 'Thành phẩm';
  const toRecode = toKeep
    .filter((e) => !mergeIds.has(e.id))
    .map((e) => ({
      id: e.id,
      maCu: e.maSanPham,
      maMoi: nextCode(KEEP_CATEGORY, e.tenSanPham),
      tenSanPham: e.tenSanPham,
      refs: refCount(e),
    }));

  console.log(`\nPlan:`);
  console.log(`  update (matched by name): ${toUpdate.length}`);
  console.log(`  create (new in file):     ${toCreate.length}`);
  console.log(`  delete (absent, unused):  ${toDelete.length}`);
  console.log(`  keep   (absent, in use):  ${toKeep.length}`);

  if (toCreate.length > 0) {
    console.log(`\nCREATE:`);
    toCreate.forEach((c) => console.log(`  ${c.maMoi.padEnd(18)} ${c.row.loai.padEnd(28)} ${c.row.dvt.padEnd(7)} ${c.row.ten}`));
  }

  console.log(`\nUPDATE (ma cu -> ma moi):`);
  toUpdate.forEach((u) =>
    console.log(`  ${u.maCu.padEnd(14)} -> ${u.maMoi.padEnd(18)} ${u.row.loai.padEnd(28)} ${u.row.dvt.padEnd(7)} ${u.row.ten}`)
  );

  if (toDelete.length > 0) {
    console.log(`\nDELETE (khong co trong file, khong rang buoc):`);
    toDelete.forEach((d) => console.log(`  ${d.maSanPham.padEnd(14)} ${d.tenSanPham}`));
  }

  if (toRecode.length > 0) {
    console.log(`\nKEEP + RECODE (khong co trong file nhung dang duoc tham chieu):`);
    toRecode.forEach((k) =>
      console.log(`  ${k.maCu.padEnd(14)} -> ${k.maMoi.padEnd(18)} (${k.refs} tham chieu) ${k.tenSanPham}`)
    );
  }

  if (toMerge.length > 0) {
    console.log(`\nMERGE ban trung vao ban chinh (tro chung tu roi xoa ban trung):`);
    for (const m of toMerge) {
      console.log(
        `  ${m.dup.maSanPham.padEnd(14)} (${refCount(m.dup)} tham chieu) "${m.dup.tenSanPham}"\n` +
          `      -> tro sang ${m.canonicalCode}, roi xoa`
      );
    }
  }

  // Sanity: every resulting code must be unique.
  const allCodes = [...toUpdate.map((u) => u.maMoi), ...toCreate.map((c) => c.maMoi), ...toRecode.map((k) => k.maMoi)];
  const dupCodes = allCodes.filter((c, i) => allCodes.indexOf(c) !== i);
  console.log(`\nTotal codes after run: ${allCodes.length}, duplicates: ${dupCodes.length}`);
  if (dupCodes.length > 0) {
    throw new Error(`Duplicate codes planned: ${[...new Set(dupCodes)].join(', ')}`);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write.');
    return;
  }

  // ─── Apply ─────────────────────────────────────────────────────────────────

  await prisma.$transaction(
    async (tx) => {
      for (const name of categories) {
        await tx.productCategory.upsert({ where: { name }, create: { name }, update: {} });
      }
      // The kept rows are filed under this category, so it must exist too.
      if (toRecode.length > 0) {
        await tx.productCategory.upsert({
          where: { name: KEEP_CATEGORY },
          create: { name: KEEP_CATEGORY },
          update: {},
        });
      }

      // Merge duplicates before deleting anything: repoint their documents at the
      // canonical row, then remove the duplicate.
      for (const m of toMerge) {
        // Stock and reorder rules carry uniqueness per (lot, product) and per product, so
        // repointing them can violate a constraint. Refuse rather than guess: combining
        // stock figures is a business decision.
        const lotCount = await tx.lotProduct.count({ where: { internationalProductId: m.dup.id } });
        const reorderCount = await tx.productReorderRule.count({
          where: { internationalProductId: m.dup.id },
        });
        if (lotCount > 0 || reorderCount > 0) {
          throw new Error(
            `Cannot merge ${m.dup.maSanPham}: it has ${lotCount} lot-product and ${reorderCount} reorder-rule rows. ` +
              `Resolve stock manually first.`
          );
        }

        // Snapshot columns hold the code as it was at document time; update them too so
        // the document does not display a code that no longer exists.
        await tx.quotationRequestItem.updateMany({
          where: { productId: m.dup.id },
          data: { productId: m.canonicalId, maSanPham: m.canonicalCode },
        });
        await tx.orderItem.updateMany({
          where: { productId: m.dup.id },
          data: { productId: m.canonicalId, maSanPham: m.canonicalCode },
        });
        await tx.finishedProduct.updateMany({
          where: { internationalProductId: m.dup.id },
          data: { internationalProductId: m.canonicalId },
        });

        await tx.internationalProduct.delete({ where: { id: m.dup.id } });
      }

      // Delete next: it frees codes that a rename might otherwise collide with.
      for (const d of toDelete) {
        await tx.internationalProduct.delete({ where: { id: d.id } });
      }

      // Codes are unique, so park every changing row on a temporary code before
      // settling on the final ones.
      const changing = [...toUpdate, ...toRecode].filter((x) => x.maCu !== x.maMoi);
      for (const [i, x] of changing.entries()) {
        await tx.internationalProduct.update({
          where: { id: x.id },
          data: { maSanPham: `__TMP_${i}__` },
        });
      }

      for (const u of toUpdate) {
        await tx.internationalProduct.update({
          where: { id: u.id },
          data: {
            maSanPham: u.maMoi,
            tenSanPham: u.row.ten,
            loaiSanPham: u.row.loai,
            donViTinh: u.row.dvt,
          },
        });
      }

      for (const k of toRecode) {
        await tx.internationalProduct.update({
          where: { id: k.id },
          data: { maSanPham: k.maMoi, loaiSanPham: KEEP_CATEGORY },
        });
      }

      for (const c of toCreate) {
        await tx.internationalProduct.create({
          data: {
            maSanPham: c.maMoi,
            tenSanPham: c.row.ten,
            loaiSanPham: c.row.loai,
            donViTinh: c.row.dvt,
          },
        });
      }

      // Stale categories from the old taxonomy would otherwise linger in the dropdown.
      const keepNames = [...categories, KEEP_CATEGORY];
      await tx.productCategory.deleteMany({ where: { name: { notIn: keepNames } } });
    },
    { timeout: 180_000 }
  );

  const after = await prisma.internationalProduct.count();
  console.log(`\n✅ Applied. Products now: ${after}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
