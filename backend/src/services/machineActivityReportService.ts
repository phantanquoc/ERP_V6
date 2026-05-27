import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import ExcelJS from 'exceljs';

interface CreateMachineActivityReportData {
  viTri: string;
  tenHeThong: string;
  tongSoLuong: number;
  soLuongHoatDong: number;
  soLuongNgung: number;
  nguyenNhan: string;
  nguoiBaoCao: string;
  fileDinhKem?: string;
}

interface UpdateMachineActivityReportData {
  viTri?: string;
  tenHeThong?: string;
  tongSoLuong?: number;
  soLuongHoatDong?: number;
  soLuongNgung?: number;
  nguyenNhan?: string;
  nguoiBaoCao?: string;
  fileDinhKem?: string;
}

class MachineActivityReportService {
  async getAllReports(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { tenHeThong: { contains: search, mode: 'insensitive' as const } },
            { viTri: { contains: search, mode: 'insensitive' as const } },
            { nguoiBaoCao: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.machineActivityReport.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.machineActivityReport.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getReportById(id: string) {
    const report = await prisma.machineActivityReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo hoạt động máy');
    return report;
  }

  async createReport(data: CreateMachineActivityReportData) {
    return prisma.machineActivityReport.create({ data });
  }

  async updateReport(id: string, data: UpdateMachineActivityReportData) {
    await this.getReportById(id);
    return prisma.machineActivityReport.update({ where: { id }, data });
  }

  async deleteReport(id: string) {
    await this.getReportById(id);
    return prisma.machineActivityReport.delete({ where: { id } });
  }

  async exportToExcel() {
    const data = await prisma.machineActivityReport.findMany({ orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo hoạt động máy');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Vị trí', key: 'viTri', width: 20 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 30 },
      { header: 'Tổng số lượng', key: 'tongSoLuong', width: 15 },
      { header: 'SL hoạt động', key: 'soLuongHoatDong', width: 15 },
      { header: 'SL ngưng', key: 'soLuongNgung', width: 12 },
      { header: 'Nguyên nhân', key: 'nguyenNhan', width: 35 },
      { header: 'Người báo cáo', key: 'nguoiBaoCao', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    data.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,
        viTri: item.viTri,
        tenHeThong: item.tenHeThong,
        tongSoLuong: item.tongSoLuong,
        soLuongHoatDong: item.soLuongHoatDong,
        soLuongNgung: item.soLuongNgung,
        nguyenNhan: item.nguyenNhan,
        nguoiBaoCao: item.nguoiBaoCao,
        createdAt: item.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new MachineActivityReportService();
