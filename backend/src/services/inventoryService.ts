import prisma from '@config/database';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';

export interface InventoryFilters {
  search?: string;
  loaiSanPham?: string;
  warehouseId?: string;
  donViTinh?: string;
  hasStock?: boolean;         // only return products with stock > 0
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

export class InventoryService {
  async getInventoryOverview(params: InventoryFilters): Promise<InventoryOverviewResult> {
    const { page, limit, skip } = getPaginationParams(params.page, params.limit);

    // Build product filter
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

    const [products, total] = await Promise.all([
      prisma.internationalProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { maSanPham: 'asc' },
      }),
      prisma.internationalProduct.count({ where }),
    ]);

    if (products.length === 0) {
      return { data: [], total, page, limit, totalPages: calculateTotalPages(total, limit) };
    }

    const productIds = products.map((p) => p.id);

    // Aggregate total stock per product (all warehouses, all units)
    const stockWhere: any = {
      internationalProductId: { in: productIds },
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

    // Per-warehouse breakdown: find all lotProducts for these products, grouped by product + warehouse
    const lotProductRows = await prisma.lotProduct.findMany({
      where: {
        internationalProductId: { in: productIds },
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

    // Build per-warehouse breakdown map: productId → { warehouseId → { tenKho, soLuong } }
    const warehouseBreakdown = new Map<string, Map<string, { tenKho: string; soLuong: number }>>();
    for (const lp of lotProductRows) {
      const pid = lp.internationalProductId;
      const wid = lp.lot.warehouseId;
      const tenKho = lp.lot.warehouse.tenKho;

      if (!warehouseBreakdown.has(pid)) {
        warehouseBreakdown.set(pid, new Map());
      }
      const byWarehouse = warehouseBreakdown.get(pid)!;
      const existing = byWarehouse.get(wid);
      if (existing) {
        existing.soLuong += lp.soLuong;
      } else {
        byWarehouse.set(wid, { tenKho, soLuong: lp.soLuong });
      }
    }

    const data: InventoryItem[] = products.map((product) => {
      const byWarehouse = warehouseBreakdown.get(product.id);
      const chiTietTheoKho: WarehouseStockDetail[] = byWarehouse
        ? Array.from(byWarehouse.entries()).map(([warehouseId, detail]) => ({
            warehouseId,
            tenKho: detail.tenKho,
            soLuong: detail.soLuong,
          }))
        : [];

      return {
        id: product.id,
        maSanPham: product.maSanPham,
        tenSanPham: product.tenSanPham,
        loaiSanPham: product.loaiSanPham ?? null,
        donViTinh: product.donViTinh ?? null,
        tongTonKho: stockByProduct.get(product.id) ?? 0,
        chiTietTheoKho,
      };
    });

    return { data, total, page, limit, totalPages: calculateTotalPages(total, limit) };
  }
}

export default new InventoryService();
