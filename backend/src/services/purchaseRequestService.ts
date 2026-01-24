import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

interface CreatePurchaseRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  fileKemTheo?: string;
  supplyRequestId?: string;
}

class PurchaseRequestService {
  private async generatePurchaseRequestCode(): Promise<string> {
    const lastRequest = await prisma.purchaseRequest.findFirst({
      where: {
        maYeuCau: {
          startsWith: 'YC-MH',
        },
      },
      orderBy: {
        maYeuCau: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest) {
      const lastCode = lastRequest.maYeuCau;
      const sequenceStr = lastCode.replace('YC-MH', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `YC-MH${String(sequence).padStart(4, '0')}`;
  }

  async getAllPurchaseRequests(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            { tenHangHoa: { contains: search, mode: 'insensitive' as const } },
            { phanLoai: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
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
          supplyRequest: true,
        },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseRequestById(id: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
      },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    return request;
  }

  async createPurchaseRequest(data: CreatePurchaseRequestRequest) {
    const maYeuCau = await this.generatePurchaseRequestCode();

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        maYeuCau,
        employeeId: data.employeeId,
        maNhanVien: data.maNhanVien,
        tenNhanVien: data.tenNhanVien,
        phanLoai: data.phanLoai,
        tenHangHoa: data.tenHangHoa,
        soLuong: data.soLuong,
        donViTinh: data.donViTinh,
        mucDichYeuCau: data.mucDichYeuCau,
        mucDoUuTien: data.mucDoUuTien,
        ghiChu: data.ghiChu,
        fileKemTheo: data.fileKemTheo,
        supplyRequestId: data.supplyRequestId,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
      },
    });

    return purchaseRequest;
  }

  async getGeneratedCode() {
    return this.generatePurchaseRequestCode();
  }

  async updatePurchaseRequest(id: string, data: {
    phanLoai?: string;
    tenHangHoa?: string;
    soLuong?: number | string;
    donViTinh?: string;
    mucDichYeuCau?: string;
    mucDoUuTien?: string;
    ghiChu?: string;
    fileKemTheo?: string;
    trangThai?: string;
    nguoiDuyet?: string;
    ngayDuyet?: string;
  }) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    // Parse soLuong to float if it's a string (from FormData)
    const updateData: any = { ...data };
    if (updateData.soLuong !== undefined) {
      updateData.soLuong = parseFloat(updateData.soLuong.toString());
    }
    if (updateData.ngayDuyet) {
      updateData.ngayDuyet = new Date(updateData.ngayDuyet);
    }

    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        supplyRequest: true,
      },
    });

    return purchaseRequest;
  }

  async deletePurchaseRequest(id: string) {
    const existingRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      throw new NotFoundError('Không tìm thấy yêu cầu mua hàng');
    }

    await prisma.purchaseRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu mua hàng thành công' };
  }
}

export default new PurchaseRequestService();

