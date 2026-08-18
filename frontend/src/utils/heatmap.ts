export type FillLevel = 'empty' | 'partial' | 'full';

export const FILL_LEVELS: Record<FillLevel, { fill: string; stroke: string; label: string }> = {
  empty: { fill: 'rgba(59,130,246,0.18)', stroke: '#3b82f6', label: 'Trống (<40%)' },
  partial: { fill: 'rgba(234,179,8,0.30)', stroke: '#ca8a04', label: 'Có hàng (40–75%)' },
  full: { fill: 'rgba(239,68,68,0.38)', stroke: '#b91c1c', label: 'Đầy (≥75%)' },
};

// Colorblind-safe pattern for full (used as hatch overlay)
export const FILL_PATTERNS = {
  full: 'url(#heatmap-hatch-full)',
} as const;

export const classifyRatio = (ratio: number): FillLevel => {
  if (ratio >= 0.75) return 'full';
  if (ratio >= 0.4) return 'partial';
  return 'empty';
};

/**
 * Unit-aware slot ratio: sum quantities per unit group, compare to capacity * slotCount
 * For mixed units in same slot, take the max ratio across unit groups (worst-case)
 */
export const classifySlotRows = (
  rows: { soLuong: number; donViTinh?: string | null }[],
  capacityByUnit: (unit?: string | null) => number | null,
): FillLevel => {
  if (rows.length === 0) return 'empty';
  const total = rows.reduce((a, r) => a + r.soLuong, 0);
  if (total <= 0) return 'empty';

  // Group by unit to avoid cross-unit sum (e.g., Thùng 10 + Bao 10 = 20 vs cap 36)
  const byUnit = new Map<string, number>();
  rows.forEach((r) => {
    const u = (r.donViTinh ?? '').trim() || '__no_unit__';
    byUnit.set(u, (byUnit.get(u) ?? 0) + r.soLuong);
  });

  let maxRatio = 0;
  let hasCap = false;
  for (const [unit, qty] of byUnit.entries()) {
    const cap = capacityByUnit(unit === '__no_unit__' ? null : unit);
    if (cap && cap > 0) {
      hasCap = true;
      maxRatio = Math.max(maxRatio, qty / cap);
    }
  }

  if (hasCap) return classifyRatio(maxRatio);
  // No capacity defined for these units → fallback to row-count heuristic
  return rows.filter((r) => r.soLuong > 0).length >= 2 ? 'full' : 'partial';
};
