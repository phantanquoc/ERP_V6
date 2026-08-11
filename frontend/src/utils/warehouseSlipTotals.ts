import type { WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssueLine } from '../services/warehouseIssueService';

export type WarehouseSlipLine = WarehouseReceiptLine | WarehouseIssueLine;

/**
 * Sum requested/actual quantity per unit of measure — never across units.
 * A slip holding 1 Cái and 1 Cuộn has no single "2" total; each unit keeps
 * its own running total so the caller can label every number.
 */
export function totalsByUnit(
  lines: WarehouseSlipLine[]
): [string, { requested: number; actual: number }][] {
  const totals = new Map<string, { requested: number; actual: number }>();
  for (const line of lines) {
    const unit = line.donViTinh || '';
    const entry = totals.get(unit) ?? { requested: 0, actual: 0 };
    entry.requested += line.soLuongYeuCau ?? line.soLuongThucTe ?? 0;
    entry.actual += line.soLuongThucTe || 0;
    totals.set(unit, entry);
  }
  return [...totals.entries()];
}

/**
 * Actual-quantity total formatted per unit of measure, e.g. "1 Cái, 1 Cuộn".
 * A single-unit slip reads as "2 Cái". Never emits a cross-unit sum, and never
 * uses the header's derived `tongSoLuongThucTe`, which is itself cross-unit.
 */
export function formatActualTotalByUnit(lines: WarehouseSlipLine[]): string {
  return totalsByUnit(lines)
    .map(([unit, totals]) => `${totals.actual}${unit ? ` ${unit}` : ''}`)
    .join(', ');
}
