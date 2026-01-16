import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';

interface CreateWarehouseInventoryRequest {
  productId: string;
  soLuongTon: number;
  donVi?: string;
  giaTriTon?: number;
  viTriKho?: string;
  ngayNhapGanNhat?: Date;
  hanSuDung?: Date;
  trangThai?: string;
  mucCanhBao?: number;
  nhaCungCap?: string;
  ghiChu?: string;
}

interface UpdateWarehouseInventoryRequest {
  soLuongTon?: number;
  donVi?: string;
  giaTriTon?: number;
  viTriKho?: string;
  ngayNhapGanNhat?: Date;
  hanSuDung?: Date;
  trangThai?: string;
  mucCanhBao?: number;
  nhaCungCap?: string;
  ghiChu?: string;
}

class WarehouseInventoryService {
  async getAllInventory(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { product: { maSanPham: { contains: search, mode: 'insensitive' as const } } },
            { product: { tenSanPham: { contains: search, mode: 'insensitive' as const } } },
            { viTriKho: { contains: search, mode: 'insensitive' as const } },
            { nhaCungCap: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [inventory, total] = await Promise.all([
      prisma.warehouseInventory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              maSanPham: true,
              tenSanPham: true,
              moTaSanPham: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.warehouseInventory.count({ where }),
    ]);

    return {
      data: inventory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInventoryById(id: string) {
    const inventory = await prisma.warehouseInventory.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            maSanPham: true,
            tenSanPham: true,
            moTaSanPham: true,
          },
        },
      },
    });

    if (!inventory) {
      throw new Error('Không tìm thấy thông tin tồn kho');
    }

    return inventory;
  }

  async createInventory(data: CreateWarehouseInventoryRequest) {
    // Check if product exists
    const product = await prisma.internationalProduct.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    // Check if inventory already exists for this product
    const existingInventory = await prisma.warehouseInventory.findFirst({
      where: { productId: data.productId },
    });

    if (existingInventory) {
      throw new Error('Sản phẩm này đã có trong kho');
    }

    const inventory = await prisma.warehouseInventory.create({
      data: {
        productId: data.productId,
        soLuongTon: data.soLuongTon,
        donVi: data.donVi || 'kg',
        giaTriTon: data.giaTriTon || 0,
        viTriKho: data.viTriKho || undefined,
        ngayNhapGanNhat: data.ngayNhapGanNhat || undefined,
        hanSuDung: data.hanSuDung || undefined,
        trangThai: data.trangThai || 'Bình thường',
        mucCanhBao: data.mucCanhBao || 0,
        nhaCungCap: data.nhaCungCap || undefined,
        ghiChu: data.ghiChu || undefined,
      },
      include: {
        product: true,
      },
    });

    return inventory;
  }

  async updateInventory(id: string, data: UpdateWarehouseInventoryRequest) {
    const inventory = await prisma.warehouseInventory.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });

    return inventory;
  }

  async deleteInventory(id: string) {
    await prisma.warehouseInventory.delete({
      where: { id },
    });
  }

  /**
   * Get inventory by product name
   * Try exact match first, then fallback to contains search
   */
  async getInventoryByProductName(productName: string) {
    // Try exact match first
    let inventory = await prisma.warehouseInventory.findFirst({
      where: {
        product: {
          tenSanPham: {
            equals: productName,
            mode: 'insensitive',
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            maSanPham: true,
            tenSanPham: true,
          },
        },
      },
    });

    // If not found, try contains search
    if (!inventory) {
      inventory = await prisma.warehouseInventory.findFirst({
        where: {
          product: {
            tenSanPham: {
              contains: productName,
              mode: 'insensitive',
            },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              maSanPham: true,
              tenSanPham: true,
            },
          },
        },
      });
    }

    return inventory;
  }
}

export default new WarehouseInventoryService();

