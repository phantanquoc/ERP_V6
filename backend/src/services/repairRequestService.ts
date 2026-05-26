import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import ExcelJS from 'exceljs';

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
  async generateRepairRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.repairRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-SC', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-SC', year);
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

    // Notify quality personnel + admin
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_CREATED, {
      entityId: String(request.id),
      metadata: {
        maYeuCau: request.maYeuCau,
        tenHeThong: request.tenHeThong,
      },
    }).catch(() => {});

    return request;
  }

  /**
   * Update repair request
   */
  async updateRepairRequest(id: number, data: UpdateRepairRequestData) {
    const existing = await this.getRepairRequestById(id);

    const updated = await prisma.repairRequest.update({
      where: { id },
      data,
    });

    // Notify if status changed
    if (data.trangThai && data.trangThai !== existing.trangThai) {
      notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
        entityId: String(updated.id),
        metadata: {
          maYeuCau: updated.maYeuCau,
          tenHeThong: updated.tenHeThong,
          status: data.trangThai,
        },
      }).catch(() => {});
    }

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

  /**
   * Export repair requests to Excel
   */
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu sửa chữa');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ngày tháng', key: 'ngayThang', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 20 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 25 },
      { header: 'Tình trạng thiết bị', key: 'tinhTrangThietBi', width: 20 },
      { header: 'Loại lỗi', key: 'loaiLoi', width: 15 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Nội dung lỗi', key: 'noiDungLoi', width: 30 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      worksheet.addRow({
        stt: index + 1,
        ngayThang: item.ngayThang ? new Date(item.ngayThang).toLocaleDateString('vi-VN') : '',
        maYeuCau: item.maYeuCau,
        tenHeThong: item.tenHeThong,
        tinhTrangThietBi: item.tinhTrangThietBi,
        loaiLoi: item.loaiLoi,
        mucDoUuTien: item.mucDoUuTien,
        noiDungLoi: item.noiDungLoi,
        trangThai: item.trangThai,
        ghiChu: item.ghiChu || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new RepairRequestService();

