import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';

export class InternationalCustomerService {
  /**
   * Generate customer code
   * Format: KH-INT{SEQUENCE}
   * Example: KH-INT001, KH-INT002
   */
  async generateCustomerCode(): Promise<string> {
    const lastCustomer = await prisma.internationalCustomer.findFirst({
      where: {
        maKhachHang: {
          startsWith: 'KH-INT',
        },
      },
      orderBy: {
        maKhachHang: 'desc',
      },
    });

    let sequence = 1;
    if (lastCustomer) {
      const lastCode = lastCustomer.maKhachHang;
      const sequenceStr = lastCode.replace('KH-INT', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `KH-INT${String(sequence).padStart(3, '0')}`;
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
      data.maKhachHang = await this.generateCustomerCode();
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
}

export default new InternationalCustomerService();
