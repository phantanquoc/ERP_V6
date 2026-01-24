import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';

interface CreateRepairRequestData {
  ngayThang: Date;
  maYeuCau: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  mucDoUuTien: string;
  noiDungLoi: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
}

interface UpdateRepairRequestData {
  ngayThang?: Date;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien?: string;
  noiDungLoi?: string;
  ghiChu?: string;
  trangThai?: string;
  fileDinhKem?: string;
}

class RepairRequestService {
  /**
   * Generate repair request code
   * Format: YC-{TIMESTAMP}
   * Example: YC-1769142322648
   */
  generateRepairRequestCode(): string {
    return `YC-${Date.now()}`;
  }

  /**
   * Get all repair requests with pagination
   */
  async getAllRepairRequests(page: number = 1, limit: number = 10) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const [data, total] = await Promise.all([
      prisma.repairRequest.findMany({
        skip,
        take: limitNum,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.repairRequest.count(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get repair request by ID
   */
  async getRepairRequestById(id: number) {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: {
        acceptanceHandovers: true,
      },
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
    }

    return request;
  }

  /**
   * Create new repair request
   */
  async createRepairRequest(data: CreateRepairRequestData) {
    const request = await prisma.repairRequest.create({
      data: {
        ngayThang: data.ngayThang,
        maYeuCau: data.maYeuCau,
        tenHeThong: data.tenHeThong,
        tinhTrangThietBi: data.tinhTrangThietBi,
        loaiLoi: data.loaiLoi,
        mucDoUuTien: data.mucDoUuTien,
        noiDungLoi: data.noiDungLoi,
        ghiChu: data.ghiChu,
        trangThai: data.trangThai || 'Chờ xử lý',
        fileDinhKem: data.fileDinhKem,
      },
    });

    return request;
  }

  /**
   * Update repair request
   */
  async updateRepairRequest(id: number, data: UpdateRepairRequestData) {
    // Check if exists
    await this.getRepairRequestById(id);

    const updated = await prisma.repairRequest.update({
      where: { id },
      data,
    });

    return updated;
  }

  /**
   * Delete repair request
   */
  async deleteRepairRequest(id: number) {
    // Check if exists
    await this.getRepairRequestById(id);

    await prisma.repairRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu sửa chữa thành công' };
  }
}

export default new RepairRequestService();

