import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

interface CreateAcceptanceHandoverRequest {
  repairRequestId: number;
  maYeuCauSuaChua: string;
  tenHeThongThietBi: string;
  tinhTrangTruocSuaChua: string;
  tinhTrangSauSuaChua: string;
  nguoiBanGiao: string;
  nguoiNhan: string;
  fileDinhKem?: string;
  ghiChu?: string;
}

interface UpdateAcceptanceHandoverRequest {
  tinhTrangTruocSuaChua?: string;
  tinhTrangSauSuaChua?: string;
  nguoiBanGiao?: string;
  nguoiNhan?: string;
  fileDinhKem?: string;
  ghiChu?: string;
}

class AcceptanceHandoverService {
  /**
   * Generate acceptance handover code
   * Format: NT-{SEQUENCE}
   * Example: NT-001, NT-002
   */
  async generateAcceptanceHandoverCode(): Promise<string> {
    const lastHandover = await prisma.acceptanceHandover.findFirst({
      where: {
        maNghiemThu: {
          startsWith: 'NT-',
        },
      },
      orderBy: {
        maNghiemThu: 'desc',
      },
    });

    let sequence = 1;
    if (lastHandover) {
      const lastCode = lastHandover.maNghiemThu;
      const sequenceStr = lastCode.replace('NT-', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `NT-${String(sequence).padStart(3, '0')}`;
  }

  async getAllAcceptanceHandovers(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { maNghiemThu: { contains: search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: search, mode: 'insensitive' } },
        { nguoiNhan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [handovers, total] = await Promise.all([
      prisma.acceptanceHandover.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.acceptanceHandover.count({ where }),
    ]);

    return {
      data: handovers,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getAcceptanceHandoverById(id: string) {
    const handover = await prisma.acceptanceHandover.findUnique({
      where: { id },
    });

    if (!handover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    return handover;
  }

  async createAcceptanceHandover(data: CreateAcceptanceHandoverRequest) {
    const maNghiemThu = await this.generateAcceptanceHandoverCode();

    const handover = await prisma.acceptanceHandover.create({
      data: {
        maNghiemThu,
        repairRequestId: data.repairRequestId,
        maYeuCauSuaChua: data.maYeuCauSuaChua,
        tenHeThongThietBi: data.tenHeThongThietBi,
        tinhTrangTruocSuaChua: data.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: data.tinhTrangSauSuaChua,
        nguoiBanGiao: data.nguoiBanGiao,
        nguoiNhan: data.nguoiNhan,
        fileDinhKem: data.fileDinhKem,
        ghiChu: data.ghiChu,
      },
    });

    return handover;
  }

  async getGeneratedCode() {
    return this.generateAcceptanceHandoverCode();
  }

  async updateAcceptanceHandover(id: string, data: UpdateAcceptanceHandoverRequest) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    const handover = await prisma.acceptanceHandover.update({
      where: { id },
      data,
    });

    return handover;
  }

  async deleteAcceptanceHandover(id: string) {
    const existingHandover = await prisma.acceptanceHandover.findUnique({
      where: { id },
    });

    if (!existingHandover) {
      throw new NotFoundError('Không tìm thấy nghiệm thu bàn giao');
    }

    await prisma.acceptanceHandover.delete({
      where: { id },
    });

    return { message: 'Xóa nghiệm thu bàn giao thành công' };
  }
}

export default new AcceptanceHandoverService();

