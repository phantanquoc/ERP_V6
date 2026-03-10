import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class InternationalCustomerService {
  /**
   * Generate customer code
   * Quốc tế: KHQT-{SEQUENCE} (e.g. KHQT-001)
   * Nội địa: KHND-{SEQUENCE} (e.g. KHND-001)
   */
  async generateCustomerCode(type: 'international' | 'domestic' = 'international'): Promise<string> {
    const prefix = type === 'domestic' ? 'KHND-' : 'KHQT-';

    const lastCustomer = await prisma.internationalCustomer.findFirst({
      where: {
        maKhachHang: {
          startsWith: prefix,
        },
      },
      orderBy: {
        maKhachHang: 'desc',
      },
    });

    let sequence = 1;
    if (lastCustomer) {
      const lastCode = lastCustomer.maKhachHang;
      const sequenceStr = lastCode.replace(prefix, '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
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
    // Generate customer code if not provided
    if (!data.maKhachHang) {
      const type = data.tinhThanh ? 'domestic' : 'international';
      data.maKhachHang = await this.generateCustomerCode(type);
    }

    // Check if customer code already exists
    const existingCustomer = await prisma.internationalCustomer.findUnique({
      where: { maKhachHang: data.maKhachHang },
    });

    if (existingCustomer) {
      throw new ValidationError('Customer code already exists');
    }

    // Parse date if provided
    if (data.ngayHopTac) {
      data.ngayHopTac = new Date(data.ngayHopTac);
    }

    const customer = await prisma.internationalCustomer.create({
      data,
    });

    return customer;
  }

  async updateCustomer(id: string, data: any): Promise<any> {
    // Check if customer exists
    await this.getCustomerById(id);

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
