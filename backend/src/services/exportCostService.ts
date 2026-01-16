import { PrismaClient, ExportCost } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateExportCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
}

export interface UpdateExportCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
}

class ExportCostService {
  // Generate unique code
  private async generateCode(): Promise<string> {
    const lastCost = await prisma.exportCost.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { maChiPhi: true }
    });

    if (!lastCost) {
      return 'CPXK-001';
    }

    const lastNumber = parseInt(lastCost.maChiPhi.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `CPXK-${newNumber.toString().padStart(3, '0')}`;
  }

  // Get all export costs with pagination
  async getAllExportCosts(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { maChiPhi: { contains: search, mode: 'insensitive' as any } },
        { tenChiPhi: { contains: search, mode: 'insensitive' as any } },
        { loaiChiPhi: { contains: search, mode: 'insensitive' as any } },
        { tenNhanVien: { contains: search, mode: 'insensitive' as any } }
      ]
    } : {};

    const [data, total] = await Promise.all([
      prisma.exportCost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exportCost.count({ where })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get export cost by ID
  async getExportCostById(id: string): Promise<ExportCost | null> {
    return await prisma.exportCost.findUnique({
      where: { id }
    });
  }

  // Create export cost
  async createExportCost(input: CreateExportCostInput): Promise<ExportCost> {
    const maChiPhi = await this.generateCode();

    return await prisma.exportCost.create({
      data: {
        maChiPhi,
        ...input
      }
    });
  }

  // Update export cost
  async updateExportCost(id: string, input: UpdateExportCostInput): Promise<ExportCost> {
    return await prisma.exportCost.update({
      where: { id },
      data: input
    });
  }

  // Delete export cost
  async deleteExportCost(id: string): Promise<ExportCost> {
    return await prisma.exportCost.delete({
      where: { id }
    });
  }
}

export default new ExportCostService();

