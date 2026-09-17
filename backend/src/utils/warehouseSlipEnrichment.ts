/**
 * BM01/BM03 columns B and C are master-data references, not slip data:
 *
 *  - "Mã hàng hóa" is `InternationalProduct.maSanPham` (SP-…, VT-…), reachable only
 *    through the line's package: item → lotProduct → internationalProduct.
 *  - "Loại Kho" is `warehouses.maKho` (KHONL, KHOTP, HD1…). `warehouses.loaiKho`
 *    exists in the schema but is empty for every warehouse in production, and the
 *    warehouse code is what the site actually uses to name a warehouse class.
 *    Reached via item → lotProduct → lot → warehouse, because the item rows store a
 *    bare `warehouseId` with no relation to `warehouses`.
 *
 * Neither is denormalized onto the item, so a reader that only does `include: { items }`
 * has no way to render these two columns and falls back to `maKien` / `tenKho` — which
 * is the bug this module exists to close. Apply `slipItemInclude` to any query feeding
 * the BM01/BM03 grid, then flatten the result with `resolveSlipItemRefs`.
 */

/**
 * Prisma `items` args for a receipt/issue list query — carries the master refs
 * ordered by `stt`. Typed as `WarehouseReceipt$itemsArgs` so `orderBy` is allowed
 * (it is not part of `WarehouseReceiptItemInclude`).
 */
export const slipItemInclude = {
  orderBy: { stt: 'asc' as const },
  include: {
    lotProduct: {
      select: {
        internationalProduct: { select: { maSanPham: true } },
        lot: { select: { warehouse: { select: { maKho: true } } } },
      },
    },
  },
} as const;

/** The nested shape `slipItemInclude` produces, before flattening. */
type SlipItemWithRefs = {
  lotProduct?: {
    internationalProduct?: { maSanPham?: string | null } | null;
    lot?: { warehouse?: { maKho?: string | null } | null } | null;
  } | null;
};

/**
 * Flatten the joined master refs onto the line so the frontend reads them as plain
 * fields. `lotProduct` is stripped: it exists only to carry the join, and shipping
 * the nested object duplicates data the grid never reads.
 *
 * A line whose package was deleted (or has no product linked yet) resolves to null
 * fields; the renderers fall back to `maKien`/`tenKho` for those rows rather than
 * showing a blank, since those snapshots are still the best available clue.
 */
export function resolveSlipItemRefs<T extends SlipItemWithRefs>(item: T): Omit<T, 'lotProduct'> & { maSanPham: string | null; maKho: string | null } {
  const { lotProduct, ...rest } = item;
  return {
    ...rest,
    maSanPham: lotProduct?.internationalProduct?.maSanPham ?? null,
    maKho: lotProduct?.lot?.warehouse?.maKho ?? null,
  };
}

/** List variant of `resolveSlipItemRefs`, preserving input order. */
export function resolveSlipItems<T extends SlipItemWithRefs>(items: T[] | undefined) {
  return (items ?? []).map((item) => resolveSlipItemRefs(item));
}
