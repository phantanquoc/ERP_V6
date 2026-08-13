/**
 * Product code rules for InternationalProduct (hàng hóa).
 *
 * Format: {CATEGORY_ABBR}-{SEQ:3}-{NAME_ABBR}   e.g. NLT-001-MTLB
 *   - CATEGORY_ABBR: first letter of each word in the category name (Nguyên liệu trái -> NLT)
 *   - SEQ:           3 digits, GLOBALLY UNIQUE across all categories (each product gets a permanent number)
 *   - NAME_ABBR:     first letter of each word in the product name, capped at 6 chars
 *
 * Diacritics are stripped (Đ -> D, Ư -> U) so codes stay in [A-Z0-9]: they end up in
 * spreadsheets, filenames and lookups where non-ASCII is a liability.
 *
 * These are SUGGESTIONS only. The user can overwrite any code by hand; the sole hard
 * constraint is the `@unique` on maSanPham. Nothing here parses a stored code to derive
 * meaning — a hand-edited code that ignores the format must keep working.
 */

const SEQ_PAD = 3;
/**
 * Cap on the name abbreviation.
 *
 * 10, not 6: at 6 the real catalogue collapses distinct SKUs onto the same tail — "Mít
 * sấy Lá Bàng loại vụn to" and "...loại vụn nhỏ" both became MSLBLV, as did several
 * B/B-dầu and A/A-logo pairs. The sequence number keeps codes unique either way, but a
 * tail that cannot tell two products apart defeats the point of putting the name in the
 * code. 10 removes every collision in the current 77 products.
 */
const NAME_ABBR_MAX = 10;

/**
 * The eight standard categories. Kept here so seeding, the migration script and the
 * fallback paths all agree on one list.
 *
 * Abbreviations are derived, not stored: renaming a category changes its abbreviation
 * and therefore the prefix of its products' codes.
 */
export const STANDARD_CATEGORIES = [
  'Nguyên liệu trái',
  'Nguyên liệu đông lạnh',
  'Phụ liệu',
  'Bao bì',
  'Công cụ dụng cụ',
  'Thành phẩm sấy',
  'Thành phẩm đông lạnh',
  'Nhiên liệu',
] as const;

/**
 * Used when a product is auto-created without a category. Deliberately not one of the
 * standard eight: an unclassified item should be visibly unclassified rather than
 * silently filed under a plausible-looking category.
 */
export const UNCLASSIFIED_CATEGORY = 'Chưa phân loại';

/** Matches a code produced by this module. Hand-edited codes need not match. */
export const PRODUCT_CODE_PATTERN = /^[A-Z0-9]+-\d{3}-[A-Z0-9]+$/;

/**
 * Strip Vietnamese diacritics, including đ/Đ which NFD does not decompose.
 */
export function removeDiacritics(text: string): string {
  return (text || '')
    .normalize('NFD')
    // Combining diacritical marks U+0300-U+036F. Written as \u escapes rather than
    // literal combining chars, which are invisible in an editor and easy to break.
    .replace(/[\u0300-\u036f]/g, '')
    // NFD does not decompose d-with-stroke, so map it explicitly.
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

/**
 * Take the first letter of each word, uppercased and de-accented.
 *
 * Two kinds of token survive whole instead of being reduced to an initial:
 *   - digit groups: they are the distinguishing part of many names
 *     ("Mít sấy lá bàng B 7" -> "MSLBB7")
 *   - tokens already written in capitals in the source, i.e. acronyms
 *     ("Túi PE 60" -> "TPE60"); reducing PE to P would drop the material
 *
 * Both follow the convention already visible in the existing product codes
 * (BB02-TPE60, BB03-MPE50).
 */
export function abbreviateVietnamese(text: string, maxLen?: number): string {
  // Split before upper-casing so acronyms are still distinguishable from normal words.
  // Also split at letter/digit boundaries so "50cm" becomes ["50", "cm"] — otherwise the
  // whole thing is neither a pure number nor an acronym and collapses to "5".
  const tokens = removeDiacritics(text || '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return '';

  const parts = tokens.map((token) => {
    if (/^\d+$/.test(token)) return token;
    // An all-caps token of 2+ chars is an acronym (PE, PVC), keep it intact.
    if (token.length >= 2 && token === token.toUpperCase() && /[A-Z]/.test(token)) return token;
    return token[0].toUpperCase();
  });

  const abbr = parts.join('');
  if (maxLen == null || abbr.length <= maxLen) return abbr;

  // Truncate on a part boundary rather than mid-token: cutting "60" out of "TPE60" to
  // get "TPE6" invents a number that is not in the name. Keep whole parts while they
  // fit; if even the first part is too long, fall back to a hard slice.
  let out = '';
  for (const part of parts) {
    if (out.length + part.length > maxLen) break;
    out += part;
  }
  return out || abbr.slice(0, maxLen);
}

/** Abbreviation for a category name — the first segment of the product code. */
export function categoryAbbr(categoryName: string): string {
  return abbreviateVietnamese(categoryName);
}

/**
 * Highest sequence already used across ALL codes, regardless of prefix.
 * Sequences are globally unique — each product gets a permanent number that stays
 * with it regardless of category changes.
 *
 * @deprecated Use {@link maxSequenceGlobal} instead. This function kept for backward
 * compatibility but ignores the prefix parameter.
 */
export function maxSequenceForPrefix(_prefix: string, existingCodes: string[]): number {
  return maxSequenceGlobal(existingCodes);
}

/**
 * Highest sequence already used across ALL codes (any prefix).
 * Parses the second segment (STT) from codes matching the LOAI-STT-TEN format.
 */
export function maxSequenceGlobal(existingCodes: string[]): number {
  let max = 0;
  for (const code of existingCodes) {
    if (!code) continue;
    const parts = code.split('-');
    // Must have exactly 3 segments: PREFIX-SEQ-NAME
    if (parts.length !== 3) continue;
    const seq = parseInt(parts[1], 10);
    if (!isNaN(seq) && seq > max) max = seq;
  }
  return max;
}

/**
 * Build the suggested code for a product. Returns '' when the category is unknown —
 * the prefix is not derivable without it, and inventing a placeholder would produce
 * codes that silently disagree with the category later.
 */
export function suggestProductCode(params: {
  tenSanPham: string;
  loaiSanPham?: string | null;
  existingCodes: string[];
}): string {
  const { tenSanPham, loaiSanPham, existingCodes } = params;

  const prefix = categoryAbbr(loaiSanPham || '');
  if (!prefix) return '';

  const seq = maxSequenceGlobal(existingCodes) + 1;
  const nameAbbr = abbreviateVietnamese(tenSanPham, NAME_ABBR_MAX);

  // A product with no usable name still gets a valid, unique-able code; the name part
  // is what the user is most likely to refine by hand anyway.
  const tail = nameAbbr || 'X';

  return `${prefix}-${String(seq).padStart(SEQ_PAD, '0')}-${tail}`;
}

/**
 * Minimal shape needed to read existing codes — accepts both the Prisma client and a
 * transaction client, so callers inside $transaction can reuse this.
 */
interface ProductCodeReader {
  internationalProduct: {
    findMany(args: any): Promise<Array<{ maSanPham: string }>>;
  };
}

/**
 * Suggest a code by reading ALL existing codes to find the global max sequence.
 *
 * All codes are fetched so that the sequence is globally unique — each product gets a
 * permanent number that does not collide regardless of category.
 */
export async function suggestProductCodeFor(
  db: ProductCodeReader,
  params: { tenSanPham: string; loaiSanPham?: string | null }
): Promise<string> {
  const prefix = categoryAbbr(params.loaiSanPham || '');
  if (!prefix) return '';

  const allProducts = (await db.internationalProduct.findMany({
    select: { maSanPham: true },
  })) ?? [];

  return suggestProductCode({
    tenSanPham: params.tenSanPham,
    loaiSanPham: params.loaiSanPham,
    existingCodes: allProducts.map((s) => s.maSanPham),
  });
}

/**
 * Suggest a code and, if it is taken, walk the sequence forward until it is free.
 *
 * Reads ALL existing codes so the sequence is globally unique across all categories.
 * Needed because a concurrent insert can invalidate the snapshot.
 */
export async function suggestAvailableProductCodeFor(
  db: ProductCodeReader,
  params: { tenSanPham: string; loaiSanPham?: string | null }
): Promise<string> {
  const prefix = categoryAbbr(params.loaiSanPham || '');
  if (!prefix) return '';

  const allProducts = (await db.internationalProduct.findMany({
    select: { maSanPham: true },
  })) ?? [];
  const taken = new Set(allProducts.map((s) => s.maSanPham));

  const nameAbbr = abbreviateVietnamese(params.tenSanPham, NAME_ABBR_MAX) || 'X';
  let seq = maxSequenceGlobal([...taken]) + 1;

  // Bounded so a pathological data state cannot spin forever; 999 is the 3-digit ceiling.
  for (let i = 0; i < 1000; i++) {
    const candidate = `${prefix}-${String(seq).padStart(SEQ_PAD, '0')}-${nameAbbr}`;
    if (!taken.has(candidate)) return candidate;
    seq++;
  }
  return `${prefix}-${String(seq).padStart(SEQ_PAD, '0')}-${nameAbbr}`;
}

/**
 * Swap the category segment of an existing code, keeping its sequence and name parts.
 * Used when a category is renamed: NLT-001-MTLB + 'NLTT' -> NLTT-001-MTLB.
 *
 * Codes that do not follow the 3-segment format are returned unchanged — they were
 * hand-written and rewriting them would corrupt whatever convention the user chose.
 */
export function rewriteCodePrefix(oldCode: string, newPrefix: string): string {
  if (!oldCode || !newPrefix) return oldCode;
  const parts = oldCode.split('-');
  if (parts.length !== 3) return oldCode;
  return [newPrefix, parts[1], parts[2]].join('-');
}
