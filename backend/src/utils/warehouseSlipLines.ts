import { ValidationError } from '@utils/errors';

/**
 * Shared line engine for warehouse receipts and warehouse issues.
 *
 * Both slip types are a header plus N commodity lines. Two failure modes are
 * structural rather than incidental, so they are solved once here instead of
 * per service:
 *
 *  1. Stock validation must AGGREGATE by package before any write. Two lines of
 *     60 against a package holding 100 each pass an independent check but
 *     overdraw by 20 in total. Validating inside the write loop fails the same
 *     way, only later.
 *  2. Snapshots must be computed SEQUENTIALLY from a running in-transaction
 *     tally. Re-reading `lotProduct.soLuong` per line makes two lines on one
 *     package both claim the same opening balance — self-contradictory audit
 *     rows even when the closing balance happens to be right.
 *
 * Everything here is pure: no Prisma access, no I/O. Callers own the
 * transaction and feed in the balances they read inside it.
 */

/** Direction of stock movement a slip applies to its packages. */
export type StockDirection = 'IN' | 'OUT';

/** Minimum shape the engine needs from a slip line. */
export interface SlipLineQuantity {
  lotProductId: string;
  soLuongThucTe: number;
}

/** Current state of a package, as read inside the caller's transaction. */
export interface PackageBalance {
  soLuong: number;
  tenSanPham?: string;
  donViTinh?: string;
}

/** Per-package aggregate across all lines that target it. */
export interface PackageAggregate {
  lotProductId: string;
  /** Summed `soLuongThucTe` across every line targeting this package. */
  tongSoLuongThucTe: number;
  /** Positions of the contributing lines in the input array, in input order. */
  lineIndexes: number[];
}

/** Snapshot pair produced for one line, in the order the line was processed. */
export interface LineSnapshot {
  /** Position of this line in the input array. */
  lineIndex: number;
  lotProductId: string;
  soLuongTruoc: number;
  soLuongSau: number;
}

export interface SnapshotResult<T> {
  /** Input lines paired with their sequential snapshots, in processing order. */
  lines: Array<T & LineSnapshot>;
  /** Closing balance per package after every line has been applied. */
  closingBalances: Map<string, number>;
}

/** Header totals derived from a line set. */
export interface HeaderTotals {
  tongSoLuongThucTe: number;
  soDongHang: number;
}

/** One line classified as modified by the diff, with its stored counterpart. */
export interface ModifiedLinePair<TStored, TIncoming> {
  stored: TStored;
  incoming: TIncoming;
  /** True when the line was repointed to a different package. */
  lotProductChanged: boolean;
}

export interface LineDiff<TStored, TIncoming> {
  /** Stored lines with no incoming counterpart — reverse their stock effect. */
  removed: TStored[];
  /** Incoming lines with no stored counterpart — apply their stock effect. */
  added: TIncoming[];
  /** Matched pairs — reverse the stored effect, then apply the incoming one. */
  modified: Array<ModifiedLinePair<TStored, TIncoming>>;
  /** Subset of `modified` whose `lotProductId` changed. */
  repointed: Array<ModifiedLinePair<TStored, TIncoming>>;
}

function describePackage(lotProductId: string, balance?: PackageBalance): string {
  if (!balance) return `kiện ${lotProductId}`;
  const name = balance.tenSanPham?.trim();
  return name ? `"${name}"` : `kiện ${lotProductId}`;
}

function formatQuantity(value: number, balance?: PackageBalance): string {
  const unit = balance?.donViTinh?.trim();
  const rounded = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  return unit ? `${rounded} ${unit}` : rounded;
}

/**
 * Task 2.1 — group lines by package and sum actual quantity within each group.
 *
 * Group order follows the first appearance of each package in the input, so the
 * result is deterministic and independent of Map iteration quirks.
 */
export function groupLinesByPackage(lines: SlipLineQuantity[]): PackageAggregate[] {
  const groups = new Map<string, PackageAggregate>();

  lines.forEach((line, index) => {
    const existing = groups.get(line.lotProductId);
    if (existing) {
      existing.tongSoLuongThucTe += line.soLuongThucTe;
      existing.lineIndexes.push(index);
      return;
    }
    groups.set(line.lotProductId, {
      lotProductId: line.lotProductId,
      tongSoLuongThucTe: line.soLuongThucTe,
      lineIndexes: [index],
    });
  });

  return [...groups.values()];
}

/**
 * Same grouping as `groupLinesByPackage`, keyed for direct lookup.
 */
export function aggregateOutflowByPackage(lines: SlipLineQuantity[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.lotProductId, (totals.get(line.lotProductId) ?? 0) + line.soLuongThucTe);
  }
  return totals;
}

/**
 * Task 2.2 — assert every package can cover the demand placed on it.
 *
 * `demands` is net outflow per package: the summed `soLuongThucTe` of a create,
 * or the net of reversals and additions resolved by an update diff. Every group
 * is checked before anything is thrown, so a caller sees all shortfalls at once
 * rather than only the first — and, critically, no write has happened yet.
 *
 * A package absent from `balances` is a caller bug (it failed to load the row),
 * so it is reported rather than silently treated as zero stock.
 */
export function assertSufficientStock(
  demands: Map<string, number>,
  balances: Map<string, PackageBalance>
): void {
  const shortfalls: string[] = [];

  for (const [lotProductId, demand] of demands) {
    if (demand <= 0) continue;

    const balance = balances.get(lotProductId);
    if (!balance) {
      shortfalls.push(`Không tìm thấy kiện hàng ${lotProductId} trong kho`);
      continue;
    }

    if (balance.soLuong < demand) {
      shortfalls.push(
        `Số lượng tồn kho của ${describePackage(lotProductId, balance)} không đủ. ` +
          `Cần ${formatQuantity(demand, balance)}, tồn kho hiện tại ${formatQuantity(balance.soLuong, balance)}`
      );
    }
  }

  if (shortfalls.length > 0) {
    throw new ValidationError(shortfalls.join('; '));
  }
}

/**
 * Convenience wrapper for the create path: group the incoming lines, then run
 * the aggregate check across every group.
 */
export function assertLinesFitStock(
  lines: SlipLineQuantity[],
  balances: Map<string, PackageBalance>
): void {
  assertSufficientStock(aggregateOutflowByPackage(lines), balances);
}

/**
 * Task 2.3 — compute per-line snapshots sequentially.
 *
 * Lines are processed in input order. Each line's `soLuongTruoc` comes from a
 * running tally held in memory, never from a fresh read of the package row, so
 * two lines on one package chain: line 2 opens at line 1's closing balance.
 *
 * For `OUT`, a line driving a running balance below zero throws — this catches
 * the same overdraw `assertSufficientStock` catches, as a defence in depth for
 * callers that skipped the pre-check.
 */
export function computeSequentialSnapshots<T extends SlipLineQuantity>(
  lines: T[],
  balances: Map<string, PackageBalance>,
  direction: StockDirection
): SnapshotResult<T> {
  const running = new Map<string, number>();
  const snapshotted: Array<T & LineSnapshot> = [];

  lines.forEach((line, lineIndex) => {
    const balance = balances.get(line.lotProductId);
    if (!balance) {
      throw new ValidationError(`Không tìm thấy kiện hàng ${line.lotProductId} trong kho`);
    }

    const soLuongTruoc = running.get(line.lotProductId) ?? balance.soLuong;
    const soLuongSau =
      direction === 'IN' ? soLuongTruoc + line.soLuongThucTe : soLuongTruoc - line.soLuongThucTe;

    if (soLuongSau < 0) {
      throw new ValidationError(
        `Số lượng tồn kho của ${describePackage(line.lotProductId, balance)} không đủ. ` +
          `Tồn kho hiện tại ${formatQuantity(soLuongTruoc, balance)}`
      );
    }

    running.set(line.lotProductId, soLuongSau);
    snapshotted.push({ ...line, lineIndex, lotProductId: line.lotProductId, soLuongTruoc, soLuongSau });
  });

  return { lines: snapshotted, closingBalances: running };
}

/**
 * Task 2.4 — partition incoming lines against stored lines.
 *
 * Matching is by stored line id: an incoming line carrying an `id` that exists
 * in the stored set is a modification, one without is an addition, and a stored
 * line no incoming line claims is a removal. Modified pairs whose
 * `lotProductId` differs are flagged, since those must reverse against the old
 * package and apply against the new one.
 */
export function diffLines<TStored extends { id: string; lotProductId: string }, TIncoming extends { id?: string | null; lotProductId: string }>(
  stored: TStored[],
  incoming: TIncoming[]
): LineDiff<TStored, TIncoming> {
  const storedById = new Map(stored.map((line) => [line.id, line]));
  const claimedIds = new Set<string>();

  const added: TIncoming[] = [];
  const modified: Array<ModifiedLinePair<TStored, TIncoming>> = [];

  for (const line of incoming) {
    const storedLine = line.id ? storedById.get(line.id) : undefined;
    if (!storedLine) {
      added.push(line);
      continue;
    }
    if (claimedIds.has(storedLine.id)) {
      throw new ValidationError(`Dòng hàng bị trùng lặp trong dữ liệu gửi lên: ${storedLine.id}`);
    }
    claimedIds.add(storedLine.id);
    modified.push({
      stored: storedLine,
      incoming: line,
      lotProductChanged: storedLine.lotProductId !== line.lotProductId,
    });
  }

  const removed = stored.filter((line) => !claimedIds.has(line.id));

  return {
    removed,
    added,
    modified,
    repointed: modified.filter((pair) => pair.lotProductChanged),
  };
}

/**
 * Task 2.5 — recompute header totals from a line set. Must be called inside the
 * same transaction as any line create, update, or delete so the header never
 * disagrees with its lines.
 */
export function computeHeaderTotals(lines: SlipLineQuantity[]): HeaderTotals {
  return {
    tongSoLuongThucTe: lines.reduce((sum, line) => sum + line.soLuongThucTe, 0),
    soDongHang: lines.length,
  };
}

export function quantityDeviation(plan: number, actual: number): number {
  if (!plan || plan === 0) return actual === 0 ? 0 : 1;
  return Math.abs(actual - plan) / Math.abs(plan);
}

export function kienSetEquals(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const v of sa) if (!sb.has(v)) return false;
  return true;
}

export function isOverThreshold(plan: number, actual: number, threshold = 0.1): boolean {
  return quantityDeviation(plan, actual) > threshold;
}

export interface ProductGroupKey {
  tenSanPham: string;
  donViTinh: string;
  warehouseId: string;
}

export function productGroupKey(line: ProductGroupKey): string {
  return `${line.tenSanPham}__${line.donViTinh}__${line.warehouseId}`;
}

export function groupLinesByProduct<T extends ProductGroupKey & { soLuongThucTe: number; soLuongYeuCau: number; maKien?: string | null }>(lines: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const l of lines) {
    const k = productGroupKey(l);
    const arr = m.get(k);
    if (arr) arr.push(l);
    else m.set(k, [l]);
  }
  return m;
}
