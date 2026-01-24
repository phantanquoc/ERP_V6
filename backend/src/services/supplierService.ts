import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

const prisma = new PrismaClient();

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
  async getAllSuppliers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { maNhaCungCap: { contains: search, mode: 'insensitive' } },
        { tenNhaCungCap: { contains: search, mode: 'insensitive' } },
        { loaiCungCap: { contains: search, mode: 'insensitive' } },
        { nguoiLienHe: { contains: search, mode: 'insensitive' } },
      ];
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
  async generateSupplierCode() {
    const lastSupplier = await prisma.supplier.findFirst({
      orderBy: { maNhaCungCap: 'desc' },
    });

    if (!lastSupplier) {
      return 'NCC001';
    }

    const lastCode = lastSupplier.maNhaCungCap;
    const numPart = parseInt(lastCode.replace('NCC', '')) || 0;
    const nextNum = numPart + 1;
    return `NCC${nextNum.toString().padStart(3, '0')}`;
  },
};

