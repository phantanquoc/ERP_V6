import prisma from '@config/database';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';

export interface InventoryFilters {
  search?: string;
  loaiSanPham?: string;
  warehouseId?: string;
  donViTinh?: string;
  hasStock?: boolean;
  stockStatus?: 'all' | 'low' | 'normal';
  sortBy?: 'maSanPham' | 'tenSanPham' | 'loaiSanPham' | 'tongTonKho';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface WarehouseStockDetail {
  warehouseId: string;
  tenKho: string;
  soLuong: number;
}

export interface InventoryItem {
  id: string;
  maSanPham: string;
  tenSanPham: string;
  loaiSanPham: string | null;
  donViTinh: string | null;
  tongTonKho: number;
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
      where.lotProducts = { some: { soLuong: { gt: 0 } } };
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

    // 4. Build inventory items for ALL products
    type ItemWithStock = InventoryItem & { _tongTonKho: number };
    let allItems: ItemWithStock[] = allProducts.map((product) => {
      const tongTonKho = stockByProduct.get(product.id) ?? 0;
      return {
        id: product.id,
        maSanPham: product.maSanPham,
        tenSanPham: product.tenSanPham,
        loaiSanPham: product.loaiSanPham ?? null,
        donViTinh: product.donViTinh ?? null,
        tongTonKho,
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
      const aVal = (a[sortBy] ?? '') as string;
      const bVal = (b[sortBy] ?? '') as string;
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
          lot: {
            select: {
              warehouseId: true,
              warehouse: { select: { tenKho: true } },
            },
          },
        },
      });

      const warehouseBreakdown = new Map<string, Map<string, { tenKho: string; soLuong: number }>>();
      for (const lp of lotProductRows) {
        const pid = lp.internationalProductId;
        const wid = lp.lot.warehouseId;
        const tenKho = lp.lot.warehouse.tenKho;
        if (!warehouseBreakdown.has(pid)) warehouseBreakdown.set(pid, new Map());
        const byWarehouse = warehouseBreakdown.get(pid)!;
        const existing = byWarehouse.get(wid);
        if (existing) {
          existing.soLuong += lp.soLuong;
        } else {
          byWarehouse.set(wid, { tenKho, soLuong: lp.soLuong });
        }
      }

      for (const item of paginatedItems) {
        const byWarehouse = warehouseBreakdown.get(item.id);
        if (byWarehouse) {
          item.chiTietTheoKho = Array.from(byWarehouse.entries()).map(([wid, detail]) => ({
            warehouseId: wid,
            tenKho: detail.tenKho,
            soLuong: detail.soLuong,
          }));
        }
      }
    }

    // 9. Strip internal field and return
    const data = paginatedItems.map(({ _tongTonKho, ...item }) => item);

    return { data, total, page, limit, totalPages: calculateTotalPages(total, limit) };
  }
}

export default new InventoryService();
