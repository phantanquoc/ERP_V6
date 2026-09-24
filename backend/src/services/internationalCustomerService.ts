import prisma from '@config/database';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

const ALLOWED_CUSTOMER_FIELDS = ['maKhachHang','tenCongTy','nguoiLienHe','loaiKhachHang','quocGia','thanhPho','tinhThanh','quanHuyen','maSoThue','email','soDienThoai','diaChi','website','trangThai','ngayHopTac','doanhThuNam','soLuongDonHang','sanPhamChinh','ghiChu'] as const;
function pickCustomer(body: Record<string, unknown>): Record<string, unknown> { const out: Record<string, unknown>={}; for(const k of ALLOWED_CUSTOMER_FIELDS) if(k in body) out[k]=body[k]; return out; }

export class InternationalCustomerService {
  async generateCustomerCode(type: 'international' | 'domestic' = 'international'): Promise<string> {
    return this.generateCustomerCodeTx(prisma as any, type);
  }
  private async generateCustomerCodeTx(tx: any, type: 'international' | 'domestic' = 'international'): Promise<string> {
    const prefix = type === 'domestic' ? 'KHND' : 'KHQT';
    const all = await tx.internationalCustomer.findMany({ where: { maKhachHang: { startsWith: `${prefix}-` } }, select: { maKhachHang: true } });
    if (all.length === 0) return `${prefix}-001`;
    const maxNum = Math.max(...all.map((r: any) => parseInt(r.maKhachHang.split('-').pop() ?? '0', 10) || 0));
    return `${prefix}-${String((isNaN(maxNum) ? 0 : maxNum) + 1).padStart(3, '0')}`;
  }

  async getAllCustomers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    phanLoaiDiaLy?: string // "Quốc tế" hoặc "Nội địa"
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    // Filter by phanLoaiDiaLy (Quốc tế / Nội địa)
    if (phanLoaiDiaLy === 'Quốc tế') {
      where.quocGia = { not: null };
    } else if (phanLoaiDiaLy === 'Nội địa') {
      where.tinhThanh = { not: null };
      where.quocGia = null;
    }

    // Search filter
    if (search) {
      where.OR = [
        { maKhachHang: { contains: search, mode: 'insensitive' as const } },
        { tenCongTy: { contains: search, mode: 'insensitive' as const } },
        { nguoiLienHe: { contains: search, mode: 'insensitive' as const } },
        { quocGia: { contains: search, mode: 'insensitive' as const } },
        { tinhThanh: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.internationalCustomer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.internationalCustomer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getCustomerById(id: string): Promise<any> {
    const customer = await prisma.internationalCustomer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundError('International customer not found');
    }

    return customer;
  }

  async getCustomerByCode(code: string): Promise<any> {
    const customer = await prisma.internationalCustomer.findUnique({
      where: { maKhachHang: code },
    });

    if (!customer) {
      throw new NotFoundError('International customer not found');
    }

    return customer;
  }

  async createCustomer(data: any): Promise<any> {
    data = pickCustomer(data as Record<string, unknown>) as any;
    if (data.ngayHopTac) data.ngayHopTac = new Date(data.ngayHopTac);
    if (data.maKhachHang?.trim()) {
      const dup = await prisma.internationalCustomer.findUnique({ where: { maKhachHang: data.maKhachHang.trim() }, select: { id: true } });
      if (dup) throw new ValidationError('Customer code already exists');
      try { return await prisma.internationalCustomer.create({ data }); } catch (e: unknown) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Mã khách hàng đã tồn tại'); throw e; }
    }
    const type = (data.tinhThanh ? 'domestic' : 'international') as 'international' | 'domestic';
    try {
      return await prisma.$transaction(async (tx: any) => {
        const maKhachHang = await this.generateCustomerCodeTx(tx, type);
        return tx.internationalCustomer.create({ data: { ...data, maKhachHang } });
      });
    } catch (e: unknown) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Mã khách hàng đã tồn tại, vui lòng thử lại'); throw e; }
  }

  async updateCustomer(id: string, data: any): Promise<any> {
    await this.getCustomerById(id);
    data = pickCustomer(data as Record<string, unknown>) as any;
    if (data.maKhachHang) {
      const dup = await prisma.internationalCustomer.findFirst({ where: { maKhachHang: data.maKhachHang as string, id: { not: id } }, select: { id: true } });
      if (dup) throw new ValidationError('Mã khách hàng đã tồn tại');
    }

    // Parse date if provided
    if (data.ngayHopTac) {
      data.ngayHopTac = new Date(data.ngayHopTac);
    }

    const customer = await prisma.internationalCustomer.update({
      where: { id },
      data,
    });

    return customer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.getCustomerById(id);

    await prisma.internationalCustomer.delete({
      where: { id },
    });
  }
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.phanLoaiDiaLy === 'Quốc tế') {
      where.quocGia = { not: null };
    } else if (filters?.phanLoaiDiaLy === 'Nội địa') {
      where.tinhThanh = { not: null };
      where.quocGia = null;
    }

    if (filters?.search) {
      where.OR = [
        { maKhachHang: { contains: filters.search, mode: 'insensitive' as const } },
        { tenCongTy: { contains: filters.search, mode: 'insensitive' as const } },
        { nguoiLienHe: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    const data = await prisma.internationalCustomer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheetName = filters?.phanLoaiDiaLy === 'Nội địa' ? 'Khách hàng nội địa' : 'Khách hàng quốc tế';
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã KH', key: 'maKhachHang', width: 15 },
      { header: 'Tên công ty', key: 'tenCongTy', width: 30 },
      { header: 'Người liên hệ', key: 'nguoiLienHe', width: 20 },
      { header: 'Loại KH', key: 'loaiKhachHang', width: 15 },
      { header: 'Quốc gia', key: 'quocGia', width: 15 },
      { header: 'Tỉnh/Thành', key: 'tinhThanh', width: 15 },
      { header: 'Điện thoại', key: 'soDienThoai', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Doanh thu năm', key: 'doanhThuNam', width: 18 },
      { header: 'Số đơn hàng', key: 'soLuongDonHang', width: 15 },
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
        maKhachHang: item.maKhachHang,
        tenCongTy: item.tenCongTy,
        nguoiLienHe: item.nguoiLienHe,
        loaiKhachHang: item.loaiKhachHang,
        quocGia: item.quocGia || '',
        tinhThanh: item.tinhThanh || '',
        soDienThoai: item.soDienThoai || '',
        email: item.email || '',
        trangThai: item.trangThai,
        doanhThuNam: item.doanhThuNam,
        soLuongDonHang: item.soLuongDonHang,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new InternationalCustomerService();
