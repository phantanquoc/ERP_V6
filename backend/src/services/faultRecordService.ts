import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

interface CreateFaultRecordData {
  tenLoi: string;
  moTa: string;
  maHeThong?: string;
  mucDo: string;
  trangThai?: string;
  nguoiPhatHien: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

interface UpdateFaultRecordData {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien?: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

class FaultRecordService {
  async generateFaultCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.faultRecord.findFirst({
      where: { maLoi: yearlyCodeWhere('LI', year) },
      orderBy: { maLoi: 'desc' },
      select: { maLoi: true },
    });
    return nextYearlyCode(last?.maLoi ?? null, 'LI', year);
  }

  async getAllFaultRecords(
    page: number = 1,
    limit: number = 10,
    search?: string,
    trangThai?: string,
    mucDo?: string,
  ) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (trangThai) where.trangThai = trangThai;
    if (mucDo) where.mucDo = mucDo;
    if (search) {
      where.OR = [
        { maLoi: { contains: search, mode: 'insensitive' } },
        { tenLoi: { contains: search, mode: 'insensitive' } },
        { maHeThong: { contains: search, mode: 'insensitive' } },
        { nguoiPhatHien: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.faultRecord.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.faultRecord.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getFaultRecordById(id: string) {
    const record = await prisma.faultRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundError('Không tìm thấy bản ghi lỗi');
    return record;
  }

  async createFaultRecord(data: CreateFaultRecordData) {
    const maLoi = await this.generateFaultCode();
    return prisma.faultRecord.create({
      data: {
        maLoi,
        tenLoi: data.tenLoi,
        moTa: data.moTa,
        maHeThong: data.maHeThong,
        mucDo: data.mucDo,
        trangThai: data.trangThai ?? 'Đang theo dõi',
        nguoiPhatHien: data.nguoiPhatHien,
        ngayPhatHien: data.ngayPhatHien ?? new Date(),
        fileDinhKem: data.fileDinhKem,
      },
    });
  }

  async updateFaultRecord(id: string, data: UpdateFaultRecordData) {
    await this.getFaultRecordById(id);
    return prisma.faultRecord.update({ where: { id }, data });
  }

  async deleteFaultRecord(id: string) {
    await this.getFaultRecordById(id);
    return prisma.faultRecord.delete({ where: { id } });
  }

  async exportToExcel(filters?: { search?: string; trangThai?: string; mucDo?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.mucDo) where.mucDo = filters.mucDo;
    if (filters?.search) {
      where.OR = [
        { maLoi: { contains: filters.search, mode: 'insensitive' } },
        { tenLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.faultRecord.findMany({ where, orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách lỗi');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã lỗi', key: 'maLoi', width: 15 },
      { header: 'Tên lỗi', key: 'tenLoi', width: 30 },
      { header: 'Mô tả', key: 'moTa', width: 40 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Mức độ', key: 'mucDo', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Người phát hiện', key: 'nguoiPhatHien', width: 20 },
      { header: 'Ngày phát hiện', key: 'ngayPhatHien', width: 15 },
    ];

    data.forEach((item: (typeof data)[0], index: number) => {
      sheet.addRow({
        stt: index + 1,
        maLoi: item.maLoi,
        tenLoi: item.tenLoi,
        moTa: item.moTa,
        maHeThong: item.maHeThong ?? '',
        mucDo: item.mucDo,
        trangThai: item.trangThai,
        nguoiPhatHien: item.nguoiPhatHien,
        ngayPhatHien: item.ngayPhatHien.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new FaultRecordService();
