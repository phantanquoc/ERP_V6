import { PrismaClient } from '@prisma/client';

import { slugifyToUpperCode } from '../../src/utils/permissions';

/**
 * Seed data for the shared `Lookup` table (change: shared-lookup-table).
 *
 * SOURCE OF TRUTH: the distinct values below were queried directly from the dev
 * database across every column in LOOKUP_COLUMN_MAP (task 2.0), then unioned with
 * the frontend constants that feed the dropdowns
 * (`frontend/src/constants/units.ts` and `products/ProductFormModal.tsx`).
 *
 * DIRTY VALUES ARE SEEDED AS-IS AND DELIBERATELY NOT NORMALISED. The "sản suất"
 * typo, the trailing-space "sản xuất ", the case variants (kg / Kg / KG,
 * "Văn phòng phẩm" / "văn phòng phẩm") and free-text leakage such as
 * "thiết kế máy khuấy nha" are all real stored values. An admin merges them later
 * through the cascade-rename flow — that is the designed workflow, not a defect to
 * fix here. Normalising them at seed time would orphan the rows that hold them.
 *
 * Empty-string values are NOT seeded (e.g. the 3 machine_systems rows with an empty
 * khuVuc keep their empty value untouched).
 */

/** Lookup group identifiers. Keep in sync with LOOKUP_COLUMN_MAP in lookupService. */
export const LOOKUP_GROUPS = {
  DON_VI_TINH: 'DON_VI_TINH',
  PHAN_LOAI_VAT_TU: 'PHAN_LOAI_VAT_TU',
  LOAI_CHI_PHI: 'LOAI_CHI_PHI',
  LOAI_CHI_PHI_XUAT_KHAU: 'LOAI_CHI_PHI_XUAT_KHAU',
  KHU_VUC: 'KHU_VUC',
  MUC_DO_LOI: 'MUC_DO_LOI',
  LOAI_LOI: 'LOAI_LOI',
  LOAI_SAN_PHAM: 'LOAI_SAN_PHAM',
  LOAI_KHACH_HANG: 'LOAI_KHACH_HANG',
  VAI_TRO_DU_AN: 'VAI_TRO_DU_AN',
  DON_VI_TIEN: 'DON_VI_TIEN',
} as const;

export type LookupGroup = (typeof LOOKUP_GROUPS)[keyof typeof LOOKUP_GROUPS];

/**
 * Labels per group, in intended display order (index becomes sortOrder).
 * Values marked "(dirty)" are preserved intentionally — see the file header.
 */
const SEED: Record<LookupGroup, string[]> = {
  // 13 from constants/units.ts, unioned with ProductFormModal's COMMON_UNITS
  // (adds Đôi, Can, Xô, Bịch, Miếng, Xe) and with values found only in the DB
  // (Container, Lô, and the case variants kg / KG).
  DON_VI_TINH: [
    'Kg',
    'Tấn',
    'Gram',
    'Cái',
    'Bộ',
    'Hộp',
    'Thùng',
    'Bao',
    'Gói',
    'Lít',
    'Mét',
    'Cuộn',
    'Người',
    'Đôi',
    'Can',
    'Miếng',
    'Xô',
    'Bịch',
    'Xe',
    'Container',
    'Lô',
    'kg', // (dirty) case variant, 3 rows
    'KG', // (dirty) case variant, 1 row
  ],

  PHAN_LOAI_VAT_TU: [
    'Nguyên vật liệu',
    'Vật tư',
    'Công cụ dụng cụ',
    'Văn phòng phẩm',
    'Thiết bị sản xuất',
    'Sơ đồ nhà máy',
    'dụng cụ sản xuất', // (dirty) lowercase free text, 5 rows
    'công cụ, dụng cụ phục vụ sản xuất', // (dirty) free text, 1 row
    'thiết kế máy khuấy nha', // (dirty) free text leak, 1 row
    'văn phòng phẩm', // (dirty) case variant of "Văn phòng phẩm", 1 row
  ],

  LOAI_CHI_PHI: [
    'Vật tư',
    'Nhân công',
    'Phụ liệu',
    'Chi phí xuất khẩu',
    'chi phí sản xuất', // (dirty) 1 row
    'sản suất', // (dirty) typo of "sản xuất", 1 row
    'sản xuất ', // (dirty) trailing space, 1 row
  ],

  // The prior production audit reported 4 values here, but export_costs is populated
  // in dev (19 rows) and holds exactly ONE distinct loaiChiPhi. The other 3 audit
  // values are not reproducible from any available data, so they are NOT invented
  // here — an admin adds them through the UI if prod really needs them.
  LOAI_CHI_PHI_XUAT_KHAU: ['Chi phí xuất khẩu'],

  KHU_VUC: [
    'Xưởng sản xuất',
    'Khu vực tiếp nhận nguyên liệu',
    'Khu vực sơ chế',
    'Khu vực cắt gọt',
    'Khu vực ngâm',
    'Khu vực Sấy',
    'Khu vực Phân Loại',
    'Khu vực đóng thùng',
    'Khu vực đóng hàng',
    'Khu vực kho thành phẩm',
    'Khu vực kho bao bì',
    'Khu vực kho dụng cụ',
    'Kho trữ đông 2',
    'Khu vực thay đồ bảo hộ lao động nam',
    'Khu vực thay đồ bảo hộ lao động nữ',
    'Khu vực văn phòng',
    'Khu phụ trợ',
  ],

  MUC_DO_LOI: ['Nhẹ', 'Trung bình', 'Nghiêm trọng'],

  LOAI_LOI: ['Lỗi mới', 'Lỗi lặp lại'],

  LOAI_SAN_PHAM: [
    'Nguyên liệu trái',
    'Nguyên liệu tươi đã sơ chế',
    'Nguyên liệu đông',
    'Phụ liệu',
    'Vật tư',
    'Thành phẩm',
    'Nhiên liệu',
  ],

  LOAI_KHACH_HANG: ['Nhà nhập khẩu', 'Đại lý'],

  VAI_TRO_DU_AN: ['Quản lý'],

  DON_VI_TIEN: ['VND'],
};

/**
 * Builds the stable `code` for a label.
 *
 * `slugifyToUpperCode` strips diacritics and case, so pure case variants
 * ("Kg" / "kg" / "KG") and diacritic-only differences collide on the same slug.
 * Those variants MUST all survive as distinct rows (each is referenced by real
 * data), so a numeric suffix disambiguates any collision within the group while
 * keeping the first/canonical spelling on the clean code.
 */
function buildCodes(group: LookupGroup, labels: string[]): { label: string; code: string }[] {
  const used = new Set<string>();

  return labels.map((label) => {
    const base = slugifyToUpperCode(label, group);
    let code = base;
    let suffix = 2;
    while (used.has(code)) {
      code = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(code);
    return { label, code };
  });
}

export interface SeedLookupsResult {
  /** Rows seeded per group. */
  perGroup: Record<string, number>;
  total: number;
}

/**
 * Idempotently seeds all lookup groups.
 *
 * Only ever INSERTs/updates rows in `common.lookups` — it never reads, updates or
 * deletes business data. Re-running is safe: the (group, code) unique constraint
 * turns every repeat into a no-op update of the same label.
 *
 * NOTE: deliberately NOT wired into `prisma/seed.ts` — the full seed overwrites
 * real employees with demo data, so this is exported as a standalone callable only.
 */
export async function seedLookups(client?: PrismaClient): Promise<SeedLookupsResult> {
  const prisma = client ?? new PrismaClient();
  const ownsClient = !client;
  const perGroup: Record<string, number> = {};

  try {
    for (const [group, labels] of Object.entries(SEED) as [LookupGroup, string[]][]) {
      const entries = buildCodes(group, labels);

      for (const [index, { label, code }] of entries.entries()) {
        await prisma.lookup.upsert({
          where: { group_code: { group, code } },
          // Keep the canonical label/order in sync on re-run, but never reactivate
          // an entry an admin has intentionally hidden.
          update: { label, sortOrder: index },
          create: { group, code, label, sortOrder: index, isActive: true },
        });
      }

      perGroup[group] = entries.length;
    }

    const total = Object.values(perGroup).reduce((sum, n) => sum + n, 0);
    return { perGroup, total };
  } finally {
    if (ownsClient) {
      await prisma.$disconnect();
    }
  }
}
