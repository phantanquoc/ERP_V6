import prisma from '@config/database';
import { ValidationError, NotFoundError, ConflictError } from '@utils/errors';

interface AddProductInput {
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
}

interface UpdateLotProductInput {
  maKien?: string;
  soLuong?: number;
  donViTinh?: string;
  giaThanh?: number;
}

/** @deprecated Use UpdateLotProductInput instead */
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

    // Fetch lot to build default maKien
    const lot = await prisma.lot.findUnique({ where: { id: input.lotId } });

    // Create first, then update with the generated maKien (needs the new id)
    const created = await prisma.lotProduct.create({
      data: {
        lotId: input.lotId,
        internationalProductId: input.internationalProductId,
        soLuong: parseFloat(input.soLuong.toString()),
        donViTinh: input.donViTinh,
      },
      include: { internationalProduct: true, lot: true },
    });

    const maKien = `${lot?.tenLo ?? input.lotId.slice(-4)}-${created.id.slice(-4)}`;
    return prisma.lotProduct.update({
      where: { id: created.id },
      data: { maKien },
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

  /** @deprecated Use updateLotProduct instead */
  async updateQuantity(id: string, input: UpdateQuantityInput) {
    return this.updateLotProduct(id, input);
  }

  async updateLotProduct(id: string, input: UpdateLotProductInput) {
    const existing = await prisma.lotProduct.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy kiện');
    }

    try {
      return await prisma.lotProduct.update({
        where: { id },
        data: {
          maKien: input.maKien !== undefined ? (input.maKien || null) : undefined,
          soLuong: input.soLuong !== undefined ? parseFloat(input.soLuong.toString()) : undefined,
          donViTinh: input.donViTinh || undefined,
          giaThanh: input.giaThanh !== undefined ? parseFloat(input.giaThanh.toString()) : undefined,
        },
        include: { internationalProduct: true },
      });
    } catch (err: any) {
      // Prisma unique constraint violation
      if (err?.code === 'P2002') {
        throw new ConflictError('Mã kiện đã tồn tại trong lô này');
      }
      throw err;
    }
  }

  /**
   * Returns distinct Lot records that have at least one LotProduct row
   * for the given InternationalProduct with soLuong > 0.
   */
  async getLotsByProduct(internationalProductId: string) {
    if (!internationalProductId) {
      throw new ValidationError('internationalProductId là bắt buộc');
    }

    // Find all lotIds that have positive Kg stock for the product
    const lotProducts = await prisma.lotProduct.findMany({
      where: {
        internationalProductId,
        soLuong: { gt: 0 },
        donViTinh: 'Kg',
      },
      select: { lotId: true },
      distinct: ['lotId'],
    });

    const lotIds = lotProducts.map(lp => lp.lotId);

    if (lotIds.length === 0) {
      return [];
    }

    return prisma.lot.findMany({
      where: { id: { in: lotIds } },
      include: { warehouse: true },
      orderBy: { tenLo: 'asc' },
    });
  }

  /**
   * Returns LotProduct rows inside a given lot for a given product,
   * filtered to rows with soLuong > 0.
   */
  async getKienByProductAndLot(internationalProductId: string, lotId: string) {
    if (!internationalProductId) {
      throw new ValidationError('internationalProductId là bắt buộc');
    }
    if (!lotId) {
      throw new ValidationError('lotId là bắt buộc');
    }

    return prisma.lotProduct.findMany({
      where: {
        internationalProductId,
        lotId,
        soLuong: { gt: 0 },
        donViTinh: 'Kg',
      },
      include: {
        internationalProduct: true,
        lot: { include: { warehouse: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export default new LotProductService();