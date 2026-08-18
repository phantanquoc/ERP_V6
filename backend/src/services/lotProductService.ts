import prisma from '@config/database';
import { ValidationError, NotFoundError, ConflictError } from '@utils/errors';

interface AddProductInput {
  lotId: string;
  internationalProductId: string;
  soLuong: number;
  donViTinh: string;
  // Target a specific fixed kiện (baseline lots). When absent the service picks a
  // free fixed kiện itself (baseline) or creates an ad-hoc kiện (user lots).
  lotProductId?: string;
  // Manual maKien for ad-hoc kiện (user lots). Ignored when lotProductId is given —
  // fixed kiện keep their slot code (K1.1…) as maKien.
  maKien?: string;
}

interface UpdateLotProductInput {
  maKien?: string;
  soLuong?: number;
  donViTinh?: string;
  giaThanh?: number;
  slotId?: string | null;
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
    const lot = await prisma.lot.findUnique({ where: { id: input.lotId } });
    if (!lot) {
      throw new NotFoundError('Không tìm thấy lô');
    }
    const product = await prisma.internationalProduct.findUnique({ where: { id: input.internationalProductId } });
    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    const soLuong = parseFloat(input.soLuong.toString());
    if (!Number.isFinite(soLuong) || soLuong <= 0) {
      throw new ValidationError('Số lượng phải lớn hơn 0');
    }

    // 1) Explicit target kiện (fixed pallet) — update it, keep its code & slot.
    if (input.lotProductId) {
      const existing = await prisma.lotProduct.findUnique({ where: { id: input.lotProductId } });
      if (!existing || existing.lotId !== lot.id) {
        throw new NotFoundError('Không tìm thấy kiện trong lô');
      }
      return prisma.lotProduct.update({
        where: { id: existing.id },
        data: {
          internationalProductId: product.id,
          soLuong,
          donViTinh: input.donViTinh || existing.donViTinh,
        },
        include: { internationalProduct: true, lot: true },
      });
    }

    const isBaseline = lot.zone != null;
    // 2) Baseline lot (zone set = fixed kiện from the CAD layout): fill the first
    //    free fixed kiện. Products may repeat across different kiện of the same lot.
    if (isBaseline) {
      const free = await prisma.lotProduct.findFirst({
        where: { lotId: lot.id, internationalProductId: null, soLuong: 0, slotId: { not: null } },
        orderBy: { maKien: 'asc' },
      });
      if (free) {
        return prisma.lotProduct.update({
          where: { id: free.id },
          data: { internationalProductId: product.id, soLuong, donViTinh: input.donViTinh },
          include: { internationalProduct: true, lot: true },
        });
      }
      // All fixed kiện busy → keep a legacy ad-hoc kiện (no slot) as overflow.
    }

    // 3) User lot (zone null) or baseline overflow: one row per product per lot,
    //    with a manual or auto-generated maKien.
    const existing = await prisma.lotProduct.findFirst({
      where: { lotId: lot.id, internationalProductId: product.id },
      include: { internationalProduct: true },
    });
    if (existing) {
      throw Object.assign(new Error(`Sản phẩm "${existing.internationalProduct?.tenSanPham}" đã được thêm vào lô này trước đó`), { status: 400 });
    }

    const created = await prisma.lotProduct.create({
      data: {
        lotId: lot.id,
        internationalProductId: product.id,
        soLuong,
        donViTinh: input.donViTinh,
      },
      include: { internationalProduct: true, lot: true },
    });

    const maKien = input.maKien?.trim() ? input.maKien.trim() : `${lot?.tenLo ?? lot.id.slice(-4)}-${created.id.slice(-4)}`;
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
      // physical slot is warehouse-scoped — moving lots always unplaces the item
      data: { lotId: targetLotId, slotId: null },
      include: lotProductInclude,
    });

    return { data: result, message: 'Di chuyển sản phẩm thành công' };
  }

  /** @deprecated Use updateLotProduct instead */
  async updateQuantity(id: string, input: UpdateQuantityInput) {
    return this.updateLotProduct(id, input);
  }

  async updateLotProduct(id: string, input: UpdateLotProductInput) {
    const existing = await prisma.lotProduct.findUnique({ where: { id }, include: { lot: true } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy kiện');
    }

    // A physical slot belongs to exactly one warehouse — reject cross-warehouse placement
    if (input.slotId) {
      const slot = await prisma.warehouseSlot.findUnique({ where: { id: input.slotId } });
      if (!slot) {
        throw new NotFoundError('Không tìm thấy vị trí');
      }
      if (slot.warehouseId !== existing.lot.warehouseId) {
        throw new ConflictError('Vị trí không thuộc kho của lô hàng');
      }
    }

    try {
      return await prisma.lotProduct.update({
        where: { id },
        data: {
          maKien: input.maKien !== undefined ? (input.maKien || null) : undefined,
          soLuong: input.soLuong !== undefined ? parseFloat(input.soLuong.toString()) : undefined,
          donViTinh: input.donViTinh || undefined,
          giaThanh: input.giaThanh !== undefined ? parseFloat(input.giaThanh.toString()) : undefined,
          slotId: input.slotId !== undefined ? (input.slotId || null) : undefined,
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
  async getLotsByProduct(internationalProductId: string, donViTinh?: string) {
    if (!internationalProductId) {
      throw new ValidationError('internationalProductId là bắt buộc');
    }

    // Find all lotIds that have positive stock for the product (unit-aware when specified)
    const where: any = {
      internationalProductId,
      soLuong: { gt: 0 },
    };
    if (donViTinh) where.donViTinh = donViTinh;

    const lotProducts = await prisma.lotProduct.findMany({
      where,
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
  async getKienByProductAndLot(internationalProductId: string, lotId: string, donViTinh?: string) {
    if (!internationalProductId) {
      throw new ValidationError('internationalProductId là bắt buộc');
    }
    if (!lotId) {
      throw new ValidationError('lotId là bắt buộc');
    }

    const where: any = {
      internationalProductId,
      lotId,
      soLuong: { gt: 0 },
    };
    if (donViTinh) where.donViTinh = donViTinh;

    return prisma.lotProduct.findMany({
      where,
      include: {
        internationalProduct: true,
        lot: { include: { warehouse: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export default new LotProductService();