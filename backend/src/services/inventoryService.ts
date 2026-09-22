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
  summary: { lowStockCount: number; tongGiaTriTon: number };
}

const LOW_STOCK_THRESHOLD = 10;

type ItemWithStock = InventoryItem & { _tongTonKho: number };

async function attachWarehouseBreakdown(
  paginatedItems: ItemWithStock[],
  productDefaultPrice: Map<string, number | null>,
  warehouseId?: string,
): Promise<void> {
  const paginatedIds = paginatedItems.map((item) => item.id);
  if (paginatedIds.length === 0) return;
  const lotProductRows = await prisma.lotProduct.findMany({
    where: {
      internationalProductId: { in: paginatedIds },
      soLuong: { gt: 0 },
      ...(warehouseId ? { lot: { warehouseId } } : {}),
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

export class InventoryService {
  async getInventoryOverview(params: InventoryFilters): Promise<InventoryOverviewResult> {
    const { page, limit } = getPaginationParams(params.page, params.limit);

    // 1. Build product filter
    const where: any = {};
    if (params.search?.trim()) {
      const s = params.search.trim().slice(0, 100);
      if (s) {
        const escaped = s.replace(/[\\%_]/g, '\\$&');
        where.OR = [
          { maSanPham: { contains: escaped, mode: 'insensitive' as const } },
          { tenSanPham: { contains: escaped, mode: 'insensitive' as const } },
        ];
        const wMatch = await prisma.lotProduct.findMany({
          where: { lot: { warehouse: { tenKho: { contains: escaped, mode: 'insensitive' as const } } } },
          select: { internationalProductId: true },
          distinct: ['internationalProductId'],
        });
        const warehouseMatchedIds = [...new Set(wMatch.map((r) => r.internationalProductId).filter(Boolean) as string[])];
        if (warehouseMatchedIds.length > 0) {
          where.OR.push({ id: { in: warehouseMatchedIds } });
        }
        if (where.OR.length === 0) delete where.OR;
      }
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

    const sortBy = params.sortBy || 'maSanPham';
    const sortOrder = params.sortOrder || 'asc';

    // DB pagination is safe only when sort is a plain product column matching DB orderBy
    // and no post-aggregation filter (stockStatus) is active.
    const needsStockStatusFilter = params.stockStatus === 'low' || params.stockStatus === 'normal';
    const needsComputedSort =
      sortBy === 'tongTonKho' ||
      (sortBy as string) === 'giaThanhTB' ||
      (sortBy as string) === 'giaTriTon' ||
      sortBy === 'tenSanPham' ||
      sortBy === 'loaiSanPham';
    const canUseDbPagination = !needsStockStatusFilter && !needsComputedSort;

    const skip = (page - 1) * limit;

    // ── Fast path: DB pagination ──
    if (canUseDbPagination) {
      const orderBy: any = { maSanPham: sortOrder };
      const total = await prisma.internationalProduct.count({ where });
      if (total === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, summary: { lowStockCount: 0, tongGiaTriTon: 0 } };
      }
      const products = await prisma.internationalProduct.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });
      const pageIds = products.map((p) => p.id);
      const productDefaultPrice = new Map(products.map((p) => [p.id, (p as any).giaThanh ?? null]));

      const stockWherePage: any = {
        internationalProductId: { in: pageIds },
        soLuong: { gt: 0 },
        ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
      };
      const [stockRowsPage, priceRowsPage] = await Promise.all([
        prisma.lotProduct.groupBy({ by: ['internationalProductId'], where: stockWherePage, _sum: { soLuong: true } }),
        prisma.lotProduct.findMany({ where: stockWherePage, select: { internationalProductId: true, soLuong: true, giaThanh: true } }),
      ]);
      const stockByPage = new Map(stockRowsPage.map((r) => [r.internationalProductId, r._sum.soLuong ?? 0]));
      const priceByPage = new Map<string, { pricedQty: number; qtyXPrice: number }>();
      for (const row of priceRowsPage) {
        const pid = row.internationalProductId;
        if (!pid) continue;
        const price = (row as any).giaThanh ?? productDefaultPrice.get(pid) ?? null;
        if (price === null || !Number.isFinite(price as number)) continue;
        const prev = priceByPage.get(pid);
        if (prev) { prev.pricedQty += row.soLuong; prev.qtyXPrice += row.soLuong * (price as number); }
        else priceByPage.set(pid, { pricedQty: row.soLuong, qtyXPrice: row.soLuong * (price as number) });
      }

      const paginatedItems: ItemWithStock[] = products.map((product) => {
        const tongTonKho = stockByPage.get(product.id) ?? 0;
        const agg = priceByPage.get(product.id);
        const giaThanhTB = agg && agg.pricedQty > 0 ? agg.qtyXPrice / agg.pricedQty : null;
        const giaTriTon = giaThanhTB !== null && tongTonKho > 0 ? tongTonKho * giaThanhTB : null;
        return {
          id: product.id, maSanPham: product.maSanPham, tenSanPham: product.tenSanPham,
          loaiSanPham: product.loaiSanPham ?? null, donViTinh: product.donViTinh ?? null,
          tongTonKho, giaThanhTB, giaTriTon, chiTietTheoKho: [], _tongTonKho: tongTonKho,
        };
      });

      // Summary over full filtered set (not just page)
      let summaryLowStockCount = 0;
      let summaryTongGiaTriTon = 0;
      const allIdRows = await prisma.internationalProduct.findMany({ where, select: { id: true, giaThanh: true } });
      if (allIdRows.length > 0) {
        const allIds = allIdRows.map((r) => r.id);
        const allDefaultPrice = new Map(allIdRows.map((r) => [r.id, (r as any).giaThanh ?? null]));
        const summaryStockWhere: any = {
          internationalProductId: { in: allIds },
          soLuong: { gt: 0 },
          ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
        };
        const [summaryStockRows, summaryPriceRows] = await Promise.all([
          prisma.lotProduct.groupBy({ by: ['internationalProductId'], where: summaryStockWhere, _sum: { soLuong: true } }),
          prisma.lotProduct.findMany({ where: summaryStockWhere, select: { internationalProductId: true, soLuong: true, giaThanh: true } }),
        ]);
        const summaryStockBy = new Map(summaryStockRows.map((r) => [r.internationalProductId, r._sum.soLuong ?? 0]));
        const summaryPriceBy = new Map<string, { pricedQty: number; qtyXPrice: number }>();
        for (const row of summaryPriceRows) {
          const pid = row.internationalProductId;
          if (!pid) continue;
          const price = (row as any).giaThanh ?? allDefaultPrice.get(pid) ?? null;
          if (price === null || !Number.isFinite(price as number)) continue;
          const prev = summaryPriceBy.get(pid);
          if (prev) { prev.pricedQty += row.soLuong; prev.qtyXPrice += row.soLuong * (price as number); }
          else summaryPriceBy.set(pid, { pricedQty: row.soLuong, qtyXPrice: row.soLuong * (price as number) });
        }
        for (const pid of allIds) {
          const tong = summaryStockBy.get(pid) ?? 0;
          if (tong > 0 && tong <= LOW_STOCK_THRESHOLD) summaryLowStockCount++;
          const agg = summaryPriceBy.get(pid);
          const gtb = agg && agg.pricedQty > 0 ? agg.qtyXPrice / agg.pricedQty : null;
          if (gtb !== null && tong > 0) summaryTongGiaTriTon += tong * gtb;
        }
      }

      await attachWarehouseBreakdown(paginatedItems, productDefaultPrice, params.warehouseId);
      const data = paginatedItems.map(({ _tongTonKho, ...item }) => item);
      return { data, total, page, limit, totalPages: calculateTotalPages(total, limit), summary: { lowStockCount: summaryLowStockCount, tongGiaTriTon: summaryTongGiaTriTon } };
    }

    // ── Fallback path: in-memory sort/filter (stockStatus or computed sort) ──
    const allProducts = await prisma.internationalProduct.findMany({
      where,
      orderBy: { maSanPham: 'asc' },
    });
    if (allProducts.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0, summary: { lowStockCount: 0, tongGiaTriTon: 0 } };
    }
    const allIds = allProducts.map((p) => p.id);
    const stockWhere: any = {
      internationalProductId: { in: allIds },
      soLuong: { gt: 0 },
      ...(params.warehouseId ? { lot: { warehouseId: params.warehouseId } } : {}),
    };
    const [stockRows, priceRows] = await Promise.all([
      prisma.lotProduct.groupBy({ by: ['internationalProductId'], where: stockWhere, _sum: { soLuong: true } }),
      prisma.lotProduct.findMany({ where: stockWhere, select: { internationalProductId: true, soLuong: true, giaThanh: true } }),
    ]);
    const stockByProduct = new Map(stockRows.map((row) => [row.internationalProductId, row._sum.soLuong ?? 0]));
    const productDefaultPrice = new Map(allProducts.map((p) => [p.id, (p as any).giaThanh ?? null]));
    const priceByProduct = new Map<string, { pricedQty: number; qtyXPrice: number }>();
    for (const row of priceRows) {
      const pid = row.internationalProductId;
      if (!pid) continue;
      const price = (row as any).giaThanh ?? productDefaultPrice.get(pid) ?? null;
      if (price === null || !Number.isFinite(price as number)) continue;
      const prev = priceByProduct.get(pid);
      if (prev) { prev.pricedQty += row.soLuong; prev.qtyXPrice += row.soLuong * (price as number); }
      else priceByProduct.set(pid, { pricedQty: row.soLuong, qtyXPrice: row.soLuong * (price as number) });
    }

    let allItems: ItemWithStock[] = allProducts.map((product) => {
      const tongTonKho = stockByProduct.get(product.id) ?? 0;
      const agg = priceByProduct.get(product.id);
      const giaThanhTB = agg && agg.pricedQty > 0 ? agg.qtyXPrice / agg.pricedQty : null;
      const giaTriTon = giaThanhTB !== null && tongTonKho > 0 ? tongTonKho * giaThanhTB : null;
      return {
        id: product.id, maSanPham: product.maSanPham, tenSanPham: product.tenSanPham,
        loaiSanPham: product.loaiSanPham ?? null, donViTinh: product.donViTinh ?? null,
        tongTonKho, giaThanhTB, giaTriTon, chiTietTheoKho: [], _tongTonKho: tongTonKho,
      };
    });

    if (params.stockStatus === 'low') {
      allItems = allItems.filter((item) => item._tongTonKho > 0 && item._tongTonKho <= LOW_STOCK_THRESHOLD);
    } else if (params.stockStatus === 'normal') {
      allItems = allItems.filter((item) => item._tongTonKho > LOW_STOCK_THRESHOLD);
    }

    const total = allItems.length;
    const summaryLowStockCount = allItems.filter((item) => item._tongTonKho > 0 && item._tongTonKho <= LOW_STOCK_THRESHOLD).length;
    const summaryTongGiaTriTon = allItems.reduce((s, item) => s + ((item as any).giaTriTon ?? 0), 0);

    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    allItems.sort((a, b) => {
      if (sortBy === 'tongTonKho') return (a._tongTonKho - b._tongTonKho) * sortMultiplier;
      if ((sortBy as string) === 'giaThanhTB' || (sortBy as string) === 'giaTriTon') {
        const av = (a as any)[sortBy] as number | null;
        const bv = (b as any)[sortBy] as number | null;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av - bv) * sortMultiplier;
      }
      const aVal = (a[sortBy as keyof ItemWithStock] ?? '') as string;
      const bVal = (b[sortBy as keyof ItemWithStock] ?? '') as string;
      return aVal.localeCompare(bVal, 'vi') * sortMultiplier;
    });

    const paginatedItems = allItems.slice(skip, skip + limit);
    // Rebuild page default price map for breakdown (subset of all)
    const pageDefaultPrice = new Map(paginatedItems.map((it) => [it.id, productDefaultPrice.get(it.id) ?? null]));
    await attachWarehouseBreakdown(paginatedItems, pageDefaultPrice, params.warehouseId);

    const data = paginatedItems.map(({ _tongTonKho, ...item }) => item);
    return { data, total, page, limit, totalPages: calculateTotalPages(total, limit), summary: { lowStockCount: summaryLowStockCount, tongGiaTriTon: summaryTongGiaTriTon } };
  }
}

export default new InventoryService();
