/**
 * Category abbreviation for display only.
 *
 * This mirrors `backend/src/utils/productCode.ts` — keep the two in sync. The backend
 * remains the authority: every code that is actually stored is produced or validated
 * there. This copy exists so the settings screen can show a category's abbreviation
 * without a round-trip, and so the rename preview reads consistently.
 */

/** Strip Vietnamese diacritics, including d-with-stroke which NFD does not decompose. */
export function removeDiacritics(text: string): string {
  return (text || '')
    .normalize('NFD')
    // Combining diacritical marks U+0300-U+036F as escapes, not literal combining
    // chars, which are invisible in an editor and easy to break.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');
}

/**
 * First letter of each word, uppercased and de-accented. Digit groups and existing
 * acronyms survive whole — see the backend copy for the reasoning.
 */
export function abbreviateVietnamese(text: string, maxLen?: number): string {
  const tokens = removeDiacritics(text)
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return '';

  const parts = tokens.map((token) => {
    if (/^\d+$/.test(token)) return token;
    if (token.length >= 2 && token === token.toUpperCase() && /[A-Z]/.test(token)) return token;
    return token[0].toUpperCase();
  });

  const abbr = parts.join('');
  if (maxLen == null || abbr.length <= maxLen) return abbr;

  let out = '';
  for (const part of parts) {
    if (out.length + part.length > maxLen) break;
    out += part;
  }
  return out || abbr.slice(0, maxLen);
}

/** Abbreviation for a category name — the first segment of a product code. */
export function categoryAbbr(categoryName: string): string {
  return abbreviateVietnamese(categoryName);
}
