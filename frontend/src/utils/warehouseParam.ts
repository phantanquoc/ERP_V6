import type { Warehouse } from '../services/warehouseService';

/**
 * Resolve a `?warehouseId=` deep-link against an already-loaded warehouse list.
 *
 * The param is meant to carry `Warehouse.id` (a cuid) — that is what every writer
 * in the UI puts there (`WarehouseUnifiedView`, `WarehouseManagement`,
 * `WarehouseMap`, the overview cards). But links in circulation also carry
 * `maKho`, the human-readable code shown under every warehouse name
 * (`?warehouseId=KHOHH`), because that is the value people read off the screen
 * and type or paste by hand.
 *
 * Readers used to compare against `w.id` only, so a `maKho` link resolved to
 * nothing and was silently ignored: the page opened with no warehouse selected,
 * no error, and the dead param stayed on the URL forever. Accepting both keeps
 * those links working, and reporting which form matched lets the caller rewrite
 * the URL to the canonical cuid so the ambiguity does not propagate.
 */
export interface ResolvedWarehouseParam {
  /** The warehouse the param points at, or null when it points at nothing. */
  warehouse: Warehouse | null;
  /** `Warehouse.id` — the value that ought to sit on the URL. */
  canonicalId: string | null;
  /** True when the URL carries `maKho` instead of the cuid and should be rewritten. */
  needsNormalize: boolean;
}

const EMPTY: ResolvedWarehouseParam = { warehouse: null, canonicalId: null, needsNormalize: false };

export const resolveWarehouseParam = (
  warehouses: readonly Warehouse[] | undefined,
  param: string | null | undefined,
): ResolvedWarehouseParam => {
  const list = warehouses ?? [];
  // An empty list means "not loaded yet", NOT "no match" — callers must not drop
  // the param on that basis or a slow first fetch would erase a valid deep-link.
  if (!param || list.length === 0) return EMPTY;

  const byId = list.find((w) => w.id === param);
  if (byId) return { warehouse: byId, canonicalId: byId.id, needsNormalize: false };

  const byMaKho = list.find((w) => w.maKho === param);
  if (byMaKho) return { warehouse: byMaKho, canonicalId: byMaKho.id, needsNormalize: true };

  return EMPTY;
};

/**
 * True only when the list HAS loaded and the param still matched nothing — the
 * one case where deleting the param is safe.
 */
export const isDeadWarehouseParam = (
  warehouses: readonly Warehouse[] | undefined,
  param: string | null | undefined,
): boolean =>
  !!param && (warehouses?.length ?? 0) > 0 && resolveWarehouseParam(warehouses, param).warehouse === null;
