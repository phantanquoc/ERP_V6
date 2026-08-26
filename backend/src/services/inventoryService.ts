import prisma from '@config/database';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';

export interface InventoryFilters {
  search?: string;
  loaiSanPham?: string;
  warehouseId?: string;
  donViTinh?: string;
  hasStock?: boolean;
  stockStatus?: 'all' | 'low' | 'normal';
  sortBy?: 'maSanPham' | 'tenSanPham' | 'loaiSanPham' | 'tongTonKho' | 'giaThanhTB' | 'giaTriTon';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface WarehouseStockDetail {
  warehouseId: string;
  tenKho: string;
  soLuong: number;
  /** Giá thành TB gia quyền của hàng trong kho này (VND/đơn vị); null nếu kiện nào cũng chưa có giá. */
  giaThanhTB: number | null;
  /** soLuong × giaThanhTB; null khi chưa có giá. */
  giaTriTon: number | null;
}

export interface InventoryItem {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  loaiSanPham: string | null;
  donViTinh: string | null;
  tongTonKho: number;
  /** Giá thành TB gia quyền trên các kiện còn hàng (VND/đơn vị).
   *  Fallback theo kiện: kiện.giaThanh → giá chuẩn hàng hóa → null. */
  giaThanhTB: number | null;
  /** tongTonKho × giaThanhTB; null khi chưa có giá. */
  giaTriTon: number | null;
  chiTietTheoKho: WarehouseStockDetail[];
}

export interface InventoryOverviewResult {
  data: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LOW_STOCK_THRESHOLD = 10;

export class InventoryService {
  async getInventoryOverview(params: InventoryFilters): Promise<InventoryOverviewResult> {
    const { page, limit } = getPaginationParams(params.page, params.limit);

    // 1. Build product filter
    const where: any = {};
    if (params.search) {
      where.OR = [
        { maSanPham: { contains: params.search, mode: 'insensitive' as const } },
        { tenSanPham: { contains: params.search, mode: 'insensitive' as const } },
      ];
    }
    if (params.loaiSanPham) {
      where.loaiSanPham = params.loaiSanPham;
    }
    if (params.donViTinh) {
      where.donViTinh = { contains: params.donViTinh, mode: 'insensitive' as const };
    }
    if (params.hasStock) {
      where.lotProducts = {
        some: {
          soLuong: { gt: 0 },
          ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
        },
      };
    }

    // 2. Fetch ALL matching products (no pagination yet — need stock for sorting/filtering)
    const allProducts = await prisma.internationalProduct.findMany({
      where,
      orderBy: { maSanPham: 'asc' },
    });

    if (allProducts.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const allIds = allProducts.map((p) => p.id);

    // 3. Aggregate stock for ALL products
    const stockWhere: any = {
      internationalProductId: { in: allIds },
      soLuong: { gt: 0 },
      ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
    };

    const stockRows = await prisma.lotProduct.groupBy({
      by: ['internationalProductId'],
      where: stockWhere,
      _sum: { soLuong: true },
    });

    const stockByProduct = new Map(
      stockRows.map((row) => [row.internationalProductId, row._sum.soLuong ?? 0]),
    );

    // 3b. Weighted average price per product (over priced in-stock parcels).
    // Fallback chain per parcel: parcel.giaThanh → product default giaThanh → unpriced.
    const productDefaultPrice = new Map(allProducts.map((p) => [p.id, (p as any).giaThanh ?? null]));
    const priceRows = await prisma.lotProduct.findMany({
      where: stockWhere,
      select: { internationalProductId: true, soLuong: true, giaThanh: true },
    });
    type PriceAgg = { pricedQty: number; qtyXPrice: number };
    const priceByProduct = new Map<string, PriceAgg>();
    for (const row of priceRows) {
      const pid = row.internationalProductId;
      if (!pid) continue;
      const price = (row as any).giaThanh ?? productDefaultPrice.get(pid) ?? null;
      if (price === null || !Number.isFinite(price as number)) continue;
      const prev = priceByProduct.get(pid);
      if (prev) {
        prev.pricedQty += row.soLuong;
        prev.qtyXPrice += row.soLuong * (price as number);
      } else {
        priceByProduct.set(pid, { pricedQty: row.soLuong, qtyXPrice: row.soLuong * (price as number) });
      }
    }

    // 4. Build inventory items for ALL products
    type ItemWithStock = InventoryItem & { _tongTonKho: number };
    let allItems: ItemWithStock[] = allProducts.map((product) => {
      const tongTonKho = stockByProduct.get(product.id) ?? 0;
      const agg = priceByProduct.get(product.id);
      const giaThanhTB = agg && agg.pricedQty > 0 ? agg.qtyXPrice / agg.pricedQty : null;
      const giaTriTon = giaThanhTB !== null && tongTonKho > 0 ? tongTonKho * giaThanhTB : null;
      return {
        id: product.id,
        maSanPham: product.maSanPham,
        tenSanPham: product.tenSanPham,
        loaiSanPham: product.loaiSanPham ?? null,
        donViTinh: product.donViTinh ?? null,
        tongTonKho,
        giaThanhTB,
        giaTriTon,
        chiTietTheoKho: [], // filled later for paginated subset
        _tongTonKho: tongTonKho,
      };
    });

    // 5. Filter by stockStatus
    if (params.stockStatus === 'low') {
      allItems = allItems.filter((item) => item._tongTonKho > 0 && item._tongTonKho <= LOW_STOCK_THRESHOLD);
    } else if (params.stockStatus === 'normal') {
      allItems = allItems.filter((item) => item._tongTonKho > LOW_STOCK_THRESHOLD);
    }

    const total = allItems.length;

    // 6. Sort
    const sortBy = params.sortBy || 'maSanPham';
    const sortOrder = params.sortOrder || 'asc';
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

    allItems.sort((a, b) => {
      if (sortBy === 'tongTonKho') {
        return (a._tongTonKho - b._tongTonKho) * sortMultiplier;
      }
      if ((sortBy as string) === 'giaThanhTB' || (sortBy as string) === 'giaTriTon') {
        const av = (a as any)[sortBy] as number | null;
        const bv = (b as any)[sortBy] as number | null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;  // null last regardless of direction
        if (bv === null) return -1;
        return (av - bv) * sortMultiplier;
      }
      const aVal = (a[sortBy as keyof ItemWithStock] ?? '') as string;
      const bVal = (b[sortBy as keyof ItemWithStock] ?? '') as string;
      return aVal.localeCompare(bVal, 'vi') * sortMultiplier;
    });

    // 7. Paginate
    const skip = (page - 1) * limit;
    const paginatedItems = allItems.slice(skip, skip + limit);
    const paginatedIds = paginatedItems.map((item) => item.id);

    // 8. Warehouse breakdown for paginated subset only
    if (paginatedIds.length > 0) {
      const lotProductRows = await prisma.lotProduct.findMany({
        where: {
          internationalProductId: { in: paginatedIds },
          soLuong: { gt: 0 },
          ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
        },
        select: {
          internationalProductId: true,
          soLuong: true,
          giaThanh: true,
          lot: {
            select: {
              warehouseId: true,
              warehouse: { select: { tenKho: true } },
            },
          },
        },
      });

      const warehouseBreakdown = new Map<string, Map<string, { tenKho: string; soLuong: number; pricedQty: number; qtyXPrice: number }>>();
      for (const lp of lotProductRows) {
        const pid = lp.internationalProductId;
        if (!pid) continue;
        const wid = lp.lot.warehouseId;
        const tenKho = lp.lot.warehouse.tenKho;
        if (!warehouseBreakdown.has(pid)) warehouseBreakdown.set(pid, new Map());
        const byWarehouse = warehouseBreakdown.get(pid)!;
        const price = (lp as any).giaThanh ?? productDefaultPrice.get(pid) ?? null;
        const existing = byWarehouse.get(wid);
        if (existing) {
          existing.soLuong += lp.soLuong;
          if (price !== null && Number.isFinite(price as number)) {
            existing.pricedQty += lp.soLuong;
            existing.qtyXPrice += lp.soLuong * (price as number);
          }
        } else {
          const pricedQty = price !== null && Number.isFinite(price as number) ? lp.soLuong : 0;
          const qtyXPrice = price !== null && Number.isFinite(price as number) ? lp.soLuong * (price as number) : 0;
          byWarehouse.set(wid, { tenKho, soLuong: lp.soLuong, pricedQty, qtyXPrice });
        }
      }

      for (const item of paginatedItems) {
        const byWarehouse = warehouseBreakdown.get(item.id);
        if (byWarehouse) {
          item.chiTietTheoKho = Array.from(byWarehouse.entries()).map(([wid, detail]) => {
            const giaThanhTB = detail.pricedQty > 0 ? detail.qtyXPrice / detail.pricedQty : null;
            const giaTriTon = giaThanhTB !== null ? detail.soLuong * giaThanhTB : null;
            return {
              warehouseId: wid,
              tenKho: detail.tenKho,
              soLuong: detail.soLuong,
              giaThanhTB,
              giaTriTon,
            };
          });
        }
      }
    }

    // 9. Strip internal field and return
    const data = paginatedItems.map(({ _tongTonKho, ...item }) => item);

    return { data, total, page, limit, totalPages: calculateTotalPages(total, limit) };
  }
}

export default new InventoryService();
