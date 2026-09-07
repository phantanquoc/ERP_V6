import prisma from '@config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { nextStaticCode, staticCodeWhere } from '../utils/codeGenerator';
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
    // Auto-generate the supplier code when the client did not supply one.
    // Previously `findUnique({ where: { maNhaCungCap: undefined } })` threw a
    // confusing PrismaClientValidationError (500) instead of a clean result.
    const maNhaCungCap = data.maNhaCungCap?.trim()
      ? data.maNhaCungCap.trim()
      : await this.generateSupplierCode(data.phanLoaiNCC);

    // Check if maNhaCungCap already exists
    const existing = await prisma.supplier.findUnique({
      where: { maNhaCungCap },
    });

    if (existing) {
      throw new ValidationError('Mã nhà cung cấp đã tồn tại');
    }

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        maNhaCungCap,
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

    // Drop immutable/system fields that must never be overwritten by an update payload
    const { maNhaCungCap: _dropCode, phanLoaiNCC: _dropClass, employeeId: _dropOwner, ...rawUpdate } = data as any;
    const updateData: any = { ...rawUpdate };
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
    const prefix = phanLoaiNCC === 'Thiết bị' ? 'NCC-TB' : 'NCC';
    const last = await prisma.supplier.findFirst({
      where: { maNhaCungCap: staticCodeWhere(prefix) },
      orderBy: { maNhaCungCap: 'desc' },
      select: { maNhaCungCap: true },
    });
    return nextStaticCode(last?.maNhaCungCap ?? null, prefix);
  },

  // Per-supplier purchase history (stats + recent PRs that reference this supplier)
  async getPurchaseStats(id: string) {
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!supplier) throw new NotFoundError('Không tìm thấy nhà cung cấp');
    const prs = await prisma.purchaseRequest.findMany({
      where: { OR: [{ nhaCungCapId: id }, { items: { some: { nhaCungCapId: id } } }] },
      select: {
        id: true, maYeuCau: true, trangThai: true, ngayYeuCau: true, mucDoUuTien: true, supplyRequestId: true, sourceType: true,
        items: { select: { nhaCungCapId: true, giaDuKien: true, soLuong: true } },
      },
      orderBy: { ngayYeuCau: 'desc' },
      take: 50,
    });
    const totalOrders = prs.length;
    const totalSpend = prs.reduce((sum, pr) => sum + pr.items.reduce((s, it) => s + (it.giaDuKien ?? 0) * it.soLuong, 0), 0);
    const pendingOrders = prs.filter((pr) => pr.trangThai !== 'Hoàn thành' && pr.trangThai !== 'Từ chối').length;
    const lastOrderAt = prs[0]?.ngayYeuCau ?? null;
    return { totalOrders, totalSpend, pendingOrders, lastOrderAt, recentOrders: prs.slice(0, 10) };
  },

  async getPurchaseRequestsBySupplier(id: string, page = 1, limit = 10) {
    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!supplier) throw new NotFoundError('Không tìm thấy nhà cung cấp');
    const skip = (page - 1) * limit;
    const where = { OR: [{ nhaCungCapId: id }, { items: { some: { nhaCungCapId: id } } }] };
    const [data, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        skip, take: limit,
        orderBy: { ngayYeuCau: 'desc' },
        include: { items: { include: { supplier: true } }, supplyRequest: { select: { maYeuCau: true, id: true } } },
      }),
      prisma.purchaseRequest.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
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

