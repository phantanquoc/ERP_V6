import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

const LOAI_PREFIX: Record<string, string> = {
  CK: 'LK-CK',
  DT: 'LK-DT',
  D: 'LK-D',
  TH: 'LK-TH',
};

interface CreateSparePartData {
  tenLinhKien: string;
  loai: string;
  donVi: string;
  soLuongTon?: number;
  giaNhap?: number;
  nhaCungCap?: string;
  trangThai?: string;
  ngayMua?: Date;
  fileDinhKem?: string;
}

interface UpdateSparePartData extends Partial<CreateSparePartData> {}

class SparePartService {
  async generateCode(loai: string): Promise<string> {
    const prefix = LOAI_PREFIX[loai] ?? 'LK-TH';
    const year = new Date().getFullYear();
    const last = await prisma.sparePart.findFirst({
      where: { maLinhKien: yearlyCodeWhere(prefix, year) },
      orderBy: { maLinhKien: 'desc' },
      select: { maLinhKien: true },
    });
    return nextYearlyCode(last?.maLinhKien ?? null, prefix, year);
  }

  async getAll(page = 1, limit = 10, search?: string, trangThai?: string, loai?: string) {
    const { skip, limit: lim } = getPaginationParams(page, limit);
    const where: Record<string, unknown> = {};
    if (trangThai) where.trangThai = trangThai;
    if (loai) where.loai = loai;
    if (search) {
      where.OR = [
        { maLinhKien: { contains: search, mode: 'insensitive' } },
        { tenLinhKien: { contains: search, mode: 'insensitive' } },
        { nhaCungCap: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.sparePart.findMany({ where, skip, take: lim, orderBy: { createdAt: 'desc' } }),
      prisma.sparePart.count({ where }),
    ]);

    return { data, pagination: { page, limit: lim, total, totalPages: Math.ceil(total / lim) } };
  }

  async getStats() {
    const [total, hetHang, dangSuDung] = await Promise.all([
      prisma.sparePart.count(),
      prisma.sparePart.count({ where: { trangThai: 'Hết hàng' } }),
      prisma.sparePart.count({ where: { trangThai: 'Đang sử dụng' } }),
    ]);
    return { total, hetHang, dangSuDung, chuaSuDung: total - hetHang - dangSuDung };
  }

  async getById(id: string) {
    const part = await prisma.sparePart.findUnique({ where: { id } });
    if (!part) throw new NotFoundError('Không tìm thấy linh kiện');
    return part;
  }

  async create(data: CreateSparePartData) {
    const maLinhKien = await this.generateCode(data.loai);
    return prisma.sparePart.create({
      data: {
        maLinhKien,
        tenLinhKien: data.tenLinhKien,
        loai: data.loai,
        donVi: data.donVi,
        soLuongTon: data.soLuongTon ?? 0,
        giaNhap: data.giaNhap,
        nhaCungCap: data.nhaCungCap,
        trangThai: data.trangThai ?? 'Chưa sử dụng',
        ngayMua: data.ngayMua,
        fileDinhKem: data.fileDinhKem,
      },
    });
  }

  async update(id: string, data: UpdateSparePartData) {
    await this.getById(id);
    return prisma.sparePart.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.sparePart.delete({ where: { id } });
  }

  async exportToExcel(filters?: { search?: string; trangThai?: string; loai?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.loai) where.loai = filters.loai;
    if (filters?.search) {
      where.OR = [
        { maLinhKien: { contains: filters.search, mode: 'insensitive' } },
        { tenLinhKien: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.sparePart.findMany({ where, orderBy: { createdAt: 'desc' } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách linh kiện');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã linh kiện', key: 'maLinhKien', width: 18 },
      { header: 'Tên linh kiện', key: 'tenLinhKien', width: 30 },
      { header: 'Loại', key: 'loai', width: 10 },
      { header: 'Đơn vị', key: 'donVi', width: 10 },
      { header: 'Số lượng tồn', key: 'soLuongTon', width: 14 },
      { header: 'Giá nhập', key: 'giaNhap', width: 14 },
      { header: 'Nhà cung cấp', key: 'nhaCungCap', width: 24 },
      { header: 'Trạng thái', key: 'trangThai', width: 18 },
      { header: 'Ngày mua', key: 'ngayMua', width: 14 },
    ];

    data.forEach((item: (typeof data)[0], idx: number) => {
      sheet.addRow({
        stt: idx + 1,
        maLinhKien: item.maLinhKien,
        tenLinhKien: item.tenLinhKien,
        loai: item.loai,
        donVi: item.donVi,
        soLuongTon: item.soLuongTon,
        giaNhap: item.giaNhap ?? '',
        nhaCungCap: item.nhaCungCap ?? '',
        trangThai: item.trangThai,
        ngayMua: item.ngayMua ? item.ngayMua.toLocaleDateString('vi-VN') : '',
      });
    });

    return workbook;
  }
}

export default new SparePartService();
