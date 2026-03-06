import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import ExcelJS from 'exceljs';

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

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maNghiemThu: { contains: filters.search, mode: 'insensitive' } },
        { maYeuCauSuaChua: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThongThietBi: { contains: filters.search, mode: 'insensitive' } },
        { nguoiBanGiao: { contains: filters.search, mode: 'insensitive' } },
        { nguoiNhan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.acceptanceHandover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nghiệm thu bàn giao');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã nghiệm thu', key: 'maNghiemThu', width: 18 },
      { header: 'Mã yêu cầu sửa chữa', key: 'maYeuCauSuaChua', width: 22 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThongThietBi', width: 25 },
      { header: 'Tình trạng trước sửa chữa', key: 'tinhTrangTruocSuaChua', width: 25 },
      { header: 'Tình trạng sau sửa chữa', key: 'tinhTrangSauSuaChua', width: 25 },
      { header: 'Người bàn giao', key: 'nguoiBanGiao', width: 20 },
      { header: 'Người nhận', key: 'nguoiNhan', width: 20 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
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
        maNghiemThu: item.maNghiemThu,
        maYeuCauSuaChua: item.maYeuCauSuaChua,
        tenHeThongThietBi: item.tenHeThongThietBi,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua,
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua,
        nguoiBanGiao: item.nguoiBanGiao,
        nguoiNhan: item.nguoiNhan,
        ghiChu: item.ghiChu || '',
        createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new AcceptanceHandoverService();

