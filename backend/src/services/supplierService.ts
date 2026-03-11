import prisma from '@config/database';
import { NotFoundError } from '../utils/errors';
import ExcelJS from 'exceljs';

interface CreateSupplierData {
  maNhaCungCap: string;
  tenNhaCungCap: string;
  loaiCungCap: string;
  quocGia: string;
  website?: string;
  nguoiLienHe: string;
  soDienThoai: string;
  emailLienHe: string;
  diaChi: string;
  khaNang?: string;
  loaiHinh: string;
  trangThai?: string;
  phanLoaiNCC?: string;
  doanhChi?: number;
  employeeId: string;
}

interface UpdateSupplierData {
  tenNhaCungCap?: string;
  loaiCungCap?: string;
  quocGia?: string;
  website?: string;
  nguoiLienHe?: string;
  soDienThoai?: string;
  emailLienHe?: string;
  diaChi?: string;
  khaNang?: string;
  loaiHinh?: string;
  trangThai?: string;
  doanhChi?: number;
}

export const supplierService = {
  // Get all suppliers with pagination and search
  async getAllSuppliers(page: number = 1, limit: number = 10, search?: string, phanLoaiNCC?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (phanLoaiNCC) {
      where.phanLoaiNCC = phanLoaiNCC;
    }
    if (search) {
      where.AND = [
        ...(where.phanLoaiNCC ? [{ phanLoaiNCC: where.phanLoaiNCC }] : []),
        {
          OR: [
            { maNhaCungCap: { contains: search, mode: 'insensitive' } },
            { tenNhaCungCap: { contains: search, mode: 'insensitive' } },
            { loaiCungCap: { contains: search, mode: 'insensitive' } },
            { nguoiLienHe: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.phanLoaiNCC;
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Get supplier by ID
  async getSupplierById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }

    return supplier;
  },

  // Create new supplier
  async createSupplier(data: CreateSupplierData) {
    // Check if maNhaCungCap already exists
    const existing = await prisma.supplier.findUnique({
      where: { maNhaCungCap: data.maNhaCungCap },
    });

    if (existing) {
      throw new Error('Mã nhà cung cấp đã tồn tại');
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        trangThai: data.trangThai || 'Đang cung cấp',
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    return supplier;
  },

  // Update supplier
  async updateSupplier(id: string, data: UpdateSupplierData) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }

    const updateData: any = { ...data };
    if (updateData.doanhChi !== undefined) {
      updateData.doanhChi = parseFloat(updateData.doanhChi.toString());
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    return supplier;
  },

  // Delete supplier
  async deleteSupplier(id: string) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp');
    }

    await prisma.supplier.delete({ where: { id } });
    return { message: 'Xóa nhà cung cấp thành công' };
  },

  // Generate next supplier code
  async generateSupplierCode(phanLoaiNCC?: string) {
    const prefix = phanLoaiNCC === 'Thiết bị' ? 'NCCTB' : 'NCC';
    const where: any = {
      maNhaCungCap: { startsWith: prefix },
    };

    const lastSupplier = await prisma.supplier.findFirst({
      where,
      orderBy: { maNhaCungCap: 'desc' },
    });

    if (!lastSupplier) {
      return `${prefix}001`;
    }

    const lastCode = lastSupplier.maNhaCungCap;
    const numPart = parseInt(lastCode.replace(prefix, '')) || 0;
    const nextNum = numPart + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  },

  // Export suppliers to Excel
  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.phanLoaiNCC) {
      where.phanLoaiNCC = filters.phanLoaiNCC;
    }

    if (filters?.search) {
      where.AND = [
        ...(where.phanLoaiNCC ? [{ phanLoaiNCC: where.phanLoaiNCC }] : []),
        {
          OR: [
            { maNhaCungCap: { contains: filters.search, mode: 'insensitive' } },
            { tenNhaCungCap: { contains: filters.search, mode: 'insensitive' } },
            { loaiCungCap: { contains: filters.search, mode: 'insensitive' } },
            { nguoiLienHe: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ];
      delete where.phanLoaiNCC;
    }

    const data = await prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nhà cung cấp');

    worksheet.columns = [
      { header: 'Mã NCC', key: 'maNhaCungCap', width: 15 },
      { header: 'Tên NCC', key: 'tenNhaCungCap', width: 30 },
      { header: 'Loại cung cấp', key: 'loaiCungCap', width: 20 },
      { header: 'Quốc gia', key: 'quocGia', width: 15 },
      { header: 'Người liên hệ', key: 'nguoiLienHe', width: 20 },
      { header: 'Số điện thoại', key: 'soDienThoai', width: 15 },
      { header: 'Email', key: 'emailLienHe', width: 25 },
      { header: 'Loại hình', key: 'loaiHinh', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Doanh chi', key: 'doanhChi', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        maNhaCungCap: item.maNhaCungCap,
        tenNhaCungCap: item.tenNhaCungCap,
        loaiCungCap: item.loaiCungCap,
        quocGia: item.quocGia,
        nguoiLienHe: item.nguoiLienHe,
        soDienThoai: item.soDienThoai,
        emailLienHe: item.emailLienHe,
        loaiHinh: item.loaiHinh,
        trangThai: item.trangThai,
        doanhChi: item.doanhChi || 0,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  },
};

