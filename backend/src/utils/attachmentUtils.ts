export function normalizeAttachments(row: { tepDinhKem?: string[] | null; fileKemTheo?: string | null } | null | undefined): string[] {
  if (!row) return [];
  const arr = (row as { tepDinhKem?: string[] | null }).tepDinhKem;
  if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
  const legacy = (row as { fileKemTheo?: string | null }).fileKemTheo;
  return legacy ? [legacy] : [];
}

export function collectAttachments(...rows: Array<{ tepDinhKem?: string[] | null; fileKemTheo?: string | null } | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) for (const u of normalizeAttachments(r)) if (!seen.has(u)) { seen.add(u); out.push(u); }
  return out;
}

export function dedupOrdered(...groups: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) for (const u of g) if (u && !seen.has(u)) { seen.add(u); out.push(u); }
  return out;
}
