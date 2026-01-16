import { PrismaClient, GeneralCost } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGeneralCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
}

export interface UpdateGeneralCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
}

class GeneralCostService {
  // Generate unique code
  private async generateCode(): Promise<string> {
    const lastCost = await prisma.generalCost.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { maChiPhi: true }
    });

    if (!lastCost) {
      return 'CP-001';
    }

    const lastNumber = parseInt(lastCost.maChiPhi.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `CP-${newNumber.toString().padStart(3, '0')}`;
  }

  // Get all general costs with pagination
  async getAllGeneralCosts(page: number = 1, limit: number = 10, search?: string) {
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
      prisma.generalCost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.generalCost.count({ where })
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

  // Get general cost by ID
  async getGeneralCostById(id: string): Promise<GeneralCost | null> {
    return await prisma.generalCost.findUnique({
      where: { id }
    });
  }

  // Create general cost
  async createGeneralCost(input: CreateGeneralCostInput): Promise<GeneralCost> {
    const maChiPhi = await this.generateCode();

    return await prisma.generalCost.create({
      data: {
        maChiPhi,
        ...input
      }
    });
  }

  // Update general cost
  async updateGeneralCost(id: string, input: UpdateGeneralCostInput): Promise<GeneralCost> {
    return await prisma.generalCost.update({
      where: { id },
      data: input
    });
  }

  // Delete general cost
  async deleteGeneralCost(id: string): Promise<GeneralCost> {
    return await prisma.generalCost.delete({
      where: { id }
    });
  }
}

export default new GeneralCostService();

