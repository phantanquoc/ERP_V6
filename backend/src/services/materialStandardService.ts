import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';

export class MaterialStandardService {
  /**
   * Generate material standard code
   * Format: DM-{SEQUENCE}
   * Example: DM-001, DM-002
   */
  async generateMaterialStandardCode(): Promise<string> {
    const lastStandard = await prisma.materialStandard.findFirst({
      where: {
        maDinhMuc: {
          startsWith: 'DM-',
        },
      },
      orderBy: {
        maDinhMuc: 'desc',
      },
    });

    let sequence = 1;
    if (lastStandard) {
      const lastCode = lastStandard.maDinhMuc;
      const sequenceStr = lastCode.split('-')[1];
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `DM-${String(sequence).padStart(3, '0')}`;
  }

  async getAllMaterialStandards(page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const [standards, total] = await Promise.all([
      prisma.materialStandard.findMany({
        skip,
        take: limit,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.materialStandard.count(),
    ]);

    return {
      data: standards,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getMaterialStandardById(id: string): Promise<any> {
    const standard = await prisma.materialStandard.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    return standard;
  }

  async createMaterialStandard(data: any): Promise<any> {
    const standard = await prisma.materialStandard.create({
      data: {
        maDinhMuc: data.maDinhMuc,
        tenDinhMuc: data.tenDinhMuc,
        loaiDinhMuc: data.loaiDinhMuc,
        tiLeThuHoi: data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : undefined,
        ghiChu: data.ghiChu,
        items: data.items ? {
          create: data.items.map((item: any) => ({
            tenThanhPham: item.tenThanhPham,
            tiLe: parseFloat(item.tiLe),
          })),
        } : undefined,
      },
      include: {
        items: true,
      },
    });

    return standard;
  }

  async updateMaterialStandard(id: string, data: any): Promise<any> {
    const standard = await prisma.materialStandard.findUnique({ 
      where: { id },
      include: { items: true },
    });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    // Delete existing items if new items are provided
    if (data.items) {
      await prisma.materialStandardItem.deleteMany({
        where: { materialStandardId: id },
      });
    }

    const updated = await prisma.materialStandard.update({
      where: { id },
      data: {
        ...(data.tenDinhMuc && { tenDinhMuc: data.tenDinhMuc }),
        ...(data.loaiDinhMuc && { loaiDinhMuc: data.loaiDinhMuc }),
        ...(data.tiLeThuHoi !== undefined && { tiLeThuHoi: data.tiLeThuHoi ? parseFloat(data.tiLeThuHoi) : null }),
        ...(data.ghiChu !== undefined && { ghiChu: data.ghiChu }),
        ...(data.items && {
          items: {
            create: data.items.map((item: any) => ({
              tenThanhPham: item.tenThanhPham,
              tiLe: parseFloat(item.tiLe),
            })),
          },
        }),
      },
      include: {
        items: true,
      },
    });

    return updated;
  }

  async deleteMaterialStandard(id: string): Promise<void> {
    const standard = await prisma.materialStandard.findUnique({ where: { id } });

    if (!standard) {
      throw new NotFoundError('Material standard not found');
    }

    await prisma.materialStandard.delete({ where: { id } });
  }
}

export default new MaterialStandardService();

