import prisma from '@config/database';

class LotService {
  async getByWarehouse(warehouseId: string) {
    return prisma.lot.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'asc' },
      include: {
        lotProducts: {
          include: { internationalProduct: true },
        },
      },
    });
  }

  async create(tenLo: string, warehouseId: string) {
    return prisma.lot.create({
      data: { tenLo, warehouseId },
      include: {
        lotProducts: {
          include: { internationalProduct: true },
        },
      },
    });
  }

  async delete(id: string) {
    await prisma.lot.delete({ where: { id } });
  }
}

export default new LotService();
