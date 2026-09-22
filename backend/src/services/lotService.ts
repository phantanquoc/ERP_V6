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
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { lotProducts: { select: { soLuong: true } } },
    });
    if (!lot) {
      const { NotFoundError } = await import('@utils/errors');
      throw new NotFoundError('Không tìm thấy lô');
    }
    const hasStock = (lot.lotProducts ?? []).some((lp) => Number(lp.soLuong) > 0);
    if (hasStock) {
      const { ConflictError } = await import('@utils/errors');
      throw new ConflictError('Không thể xóa lô khi còn tồn kho (soLuong > 0). Vui lòng xuất hết hàng trước khi xóa.');
    }
    await prisma.lot.delete({ where: { id } });
  }
}

export default new LotService();
