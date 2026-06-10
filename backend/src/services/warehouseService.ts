import prisma from '@config/database';

class WarehouseService {
  async getAll() {
    return prisma.warehouses.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lots: {
          include: {
            lotProducts: {
              select: {
                id: true,
                soLuong: true,
                donViTinh: true,
                giaThanh: true,
                internationalProductId: true,
                internationalProduct: { select: { id: true, tenSanPham: true, maSanPham: true } },
              },
            },
          },
        },
      },
    });
  }

  async generateCode(): Promise<string> {
    const lastWarehouse = await prisma.warehouses.findFirst({ orderBy: { maKho: 'desc' } });
    if (lastWarehouse?.maKho) {
      const lastNumber = parseInt(lastWarehouse.maKho.replace('KHO', ''));
      return `KHO${String(lastNumber + 1).padStart(3, '0')}`;
    }
    return 'KHO001';
  }

  async create(tenKho: string, maKho?: string) {
    const warehouseCode = maKho || await this.generateCode();
    return prisma.warehouses.create({
      data: { id: warehouseCode, maKho: warehouseCode, tenKho, updatedAt: new Date() },
    });
  }

  async delete(id: string) {
    await prisma.warehouses.delete({ where: { id } });
  }
}

export default new WarehouseService();
