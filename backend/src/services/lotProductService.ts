import prisma from '@config/database';

interface AddProductInput {
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
}

interface UpdateQuantityInput {
  soLuong?: number;
  donViTinh?: string;
  giaThanh?: number;
}

const lotProductInclude = {
  internationalProduct: true,
  lot: { include: { warehouse: true } },
} as const;

class LotProductService {
  async getAll(page?: number, limit?: number) {
    if (page && limit) {
      const skip = (page - 1) * limit;
      const [lotProducts, total] = await Promise.all([
        prisma.lotProduct.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: lotProductInclude,
        }),
        prisma.lotProduct.count(),
      ]);
      return { data: lotProducts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    const lotProducts = await prisma.lotProduct.findMany({
      orderBy: { createdAt: 'desc' },
      include: lotProductInclude,
    });
    return { data: lotProducts };
  }

  async addProduct(input: AddProductInput) {
    const existing = await prisma.lotProduct.findFirst({
      where: { lotId: input.lotId, internationalProductId: input.internationalProductId },
      include: { internationalProduct: true },
    });

    if (existing) {
      throw Object.assign(new Error(`Sản phẩm "${existing.internationalProduct?.tenSanPham}" đã được thêm vào lô này trước đó`), { status: 400 });
    }

    return prisma.lotProduct.create({
      data: {
        lotId: input.lotId,
        internationalProductId: input.internationalProductId,
        soLuong: parseFloat(input.soLuong.toString()),
        donViTinh: input.donViTinh,
      },
      include: { internationalProduct: true, lot: true },
    });
  }

  async remove(id: string) {
    await prisma.lotProduct.delete({ where: { id } });
  }

  async moveBetweenLots(lotProductId: string, targetLotId: string) {
    const sourceProduct = await prisma.lotProduct.findUnique({
      where: { id: lotProductId },
      include: { internationalProduct: true },
    });

    if (!sourceProduct) {
      throw Object.assign(new Error('Không tìm thấy sản phẩm'), { status: 404 });
    }

    const existingInTarget = await prisma.lotProduct.findFirst({
      where: { lotId: targetLotId, internationalProductId: sourceProduct.internationalProductId },
    });

    if (existingInTarget) {
      await prisma.$transaction([
        prisma.lotProduct.update({
          where: { id: existingInTarget.id },
          data: { soLuong: existingInTarget.soLuong + sourceProduct.soLuong },
        }),
        prisma.lotProduct.delete({ where: { id: lotProductId } }),
      ]);

      const result = await prisma.lotProduct.findUnique({
        where: { id: existingInTarget.id },
        include: lotProductInclude,
      });

      return { data: result, message: `Đã gộp ${sourceProduct.soLuong} ${sourceProduct.donViTinh} vào sản phẩm cùng loại trong lô đích` };
    }

    const result = await prisma.lotProduct.update({
      where: { id: lotProductId },
      data: { lotId: targetLotId },
      include: lotProductInclude,
    });

    return { data: result, message: 'Di chuyển sản phẩm thành công' };
  }

  async updateQuantity(id: string, input: UpdateQuantityInput) {
    return prisma.lotProduct.update({
      where: { id },
      data: {
        soLuong: input.soLuong !== undefined ? parseFloat(input.soLuong.toString()) : undefined,
        donViTinh: input.donViTinh || undefined,
        giaThanh: input.giaThanh !== undefined ? parseFloat(input.giaThanh.toString()) : undefined,
      },
      include: { internationalProduct: true },
    });
  }
}

export default new LotProductService();