import type { LotProduct, Warehouse, Lot } from '../services/warehouseService';

/**
 * Product-name matching cho đối chiếu Yêu cầu cung cấp ↔ tồn kho.
 *
 * tenGoi trong YC do nhân viên nhập tự do nên thường không khớp tuyệt đối
 * tenSanPham trong danh mục kho (khác dấu, viết tắt đ/d). Chuẩn hoá về chữ
 * thường không dấu rồi so substring cả 2 chiều.
 */
export const normalizeName = (s: string): string =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();

/** tenGoi của dòng yêu cầu có khớp kiện hàng này không. */
export const productMatchesName = (tenGoi: string, lp: LotProduct): boolean => {
  const name = normalizeName(tenGoi);
  const pname = normalizeName(lp.internationalProduct?.tenSanPham ?? '');
  if (!name || !pname) return false;
  return pname.includes(name) || name.includes(pname);
};

/** Tất cả lô của 1 kho chứa kiện khớp món hàng (kể cả kiện hết hàng). */
export const matchingLotsInWarehouse = (tenGoi: string, warehouse: Warehouse): Lot[] => {
  if (!tenGoi) return warehouse.lots ?? [];
  return (warehouse.lots ?? []).filter((l) =>
    (l.lotProducts ?? []).some((lp) => productMatchesName(tenGoi, lp))
  );
};

/** Các kiện khớp món trong 1 lô (kể cả kiện hết hàng). */
export const matchingLotProductsInLot = (tenGoi: string, lot: Lot | undefined): LotProduct[] => {
  if (!tenGoi || !lot) return lot?.lotProducts ?? [];
  return (lot.lotProducts ?? []).filter((lp) => productMatchesName(tenGoi, lp));
};

/** Tổng tồn của món này trên TẤT CẢ kho/lô/kiện. */
export const totalStockForName = (warehouses: Warehouse[], tenGoi: string): number =>
  warehouses.reduce(
    (acc, w) =>
      acc +
      (w.lots ?? []).reduce(
        (a, l) =>
          a +
          (l.lotProducts ?? []).reduce(
            (s, lp) => s + (productMatchesName(tenGoi, lp) ? lp.soLuong : 0),
            0
          ),
        0
      ),
    0
  );
