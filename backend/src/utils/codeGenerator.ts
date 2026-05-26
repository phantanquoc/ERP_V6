/**
 * Generates a sequential code in format: PREFIX-YEAR-SEQ
 * Used for transactional records (orders, requests, receipts, etc.)
 * Example: DH-2026-001, YCBG-2026-001
 */
export function nextYearlyCode(
  lastCode: string | null,
  prefix: string,
  year: number = new Date().getFullYear(),
  pad: number = 3
): string {
  const fullPrefix = `${prefix}-${year}-`;
  let sequence = 1;
  if (lastCode && lastCode.startsWith(fullPrefix)) {
    const parsed = parseInt(lastCode.slice(fullPrefix.length), 10);
    if (!isNaN(parsed)) sequence = parsed + 1;
  }
  return `${fullPrefix}${String(sequence).padStart(pad, '0')}`;
}

/**
 * Generates a sequential code in format: PREFIX-SEQ
 * Used for master data (machines, products, suppliers, etc.)
 * Example: MAY-001, SP-001, NCC-001
 */
export function nextStaticCode(
  lastCode: string | null,
  prefix: string,
  pad: number = 3
): string {
  const fullPrefix = `${prefix}-`;
  let sequence = 1;
  if (lastCode && lastCode.startsWith(fullPrefix)) {
    const parsed = parseInt(lastCode.slice(fullPrefix.length), 10);
    if (!isNaN(parsed)) sequence = parsed + 1;
  }
  return `${fullPrefix}${String(sequence).padStart(pad, '0')}`;
}

/**
 * Generates employee code in format: NV{SEQ} (no dash, pad 4)
 * Example: NV0001, NV0002
 */
export function nextEmployeeCode(lastCode: string | null): string {
  let sequence = 1;
  if (lastCode && lastCode.startsWith('NV')) {
    const parsed = parseInt(lastCode.slice(2), 10);
    if (!isNaN(parsed)) sequence = parsed + 1;
  }
  return `NV${String(sequence).padStart(4, '0')}`;
}

/** Prisma `where` filter for yearly codes: PREFIX-YEAR-xxx */
export function yearlyCodeWhere(prefix: string, year: number = new Date().getFullYear()) {
  return { startsWith: `${prefix}-${year}-` };
}

/** Prisma `where` filter for static codes: PREFIX-xxx */
export function staticCodeWhere(prefix: string) {
  return { startsWith: `${prefix}-` };
}

// Legacy aliases — kept so callers migrated in the first pass still compile.
// TODO: replace call sites with nextYearlyCode / nextStaticCode directly.
export const nextSequentialCode = nextYearlyCode;
export const lastCodeWhere = yearlyCodeWhere;
