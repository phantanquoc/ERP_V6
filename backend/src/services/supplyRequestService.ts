import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

interface UpdateSupplyRequestRequest {
  phanLoai?: string;
  tenGoi?: string;
  soLuong?: number;
  donViTinh?: string;
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

class SupplyRequestService {
  /**
   * Generate supply request code
   * Format: YC-CC{SEQUENCE}
   * Example: YC-CC001, YC-CC002
   */
  async generateSupplyRequestCode(): Promise<string> {
    const lastRequest = await prisma.supplyRequest.findFirst({
      orderBy: {
        maYeuCau: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest && lastRequest.maYeuCau) {
      const match = lastRequest.maYeuCau.match(/YC-CC(\d+)/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `YC-CC${sequence.toString().padStart(3, '0')}`;
  }

  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            { tenGoi: { contains: search, mode: 'insensitive' as const } },
            { phanLoai: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
        },
      }),
      prisma.supplyRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getSupplyRequestById(id: string) {
    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    if (!supplyRequest) {
      throw new NotFoundError('Supply request not found');
    }

    return supplyRequest;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    const maYeuCau = await this.generateSupplyRequestCode();

    const supplyRequest = await prisma.supplyRequest.create({
      data: {
        maYeuCau,
        employeeId: data.employeeId,
        maNhanVien: data.maNhanVien,
        tenNhanVien: data.tenNhanVien,
        boPhan: data.boPhan,
        phanLoai: data.phanLoai,
        tenGoi: data.tenGoi,
        soLuong: data.soLuong,
        donViTinh: data.donViTinh,
        mucDichYeuCau: data.mucDichYeuCau,
        mucDoUuTien: data.mucDoUuTien,
        ghiChu: data.ghiChu,
        trangThai: data.trangThai || 'Chưa cung cấp',
        fileKemTheo: data.fileKemTheo,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    return supplyRequest;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    const supplyRequest = await prisma.supplyRequest.update({
      where: { id },
      data,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    return supplyRequest;
  }

  async deleteSupplyRequest(id: string) {
    await prisma.supplyRequest.delete({
      where: { id },
    });
  }
}

export default new SupplyRequestService();
