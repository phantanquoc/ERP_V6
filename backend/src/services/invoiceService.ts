import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';

export class InvoiceService {
  /**
   * Generate invoice number
   * Format: HD-{YEAR}-{SEQUENCE}
   * Example: HD-2026-0001
   */
  async generateInvoiceNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `HD-${currentYear}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        soHoaDon: {
          startsWith: prefix,
        },
      },
      orderBy: {
        soHoaDon: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastCode = lastInvoice.soHoaDon;
      const sequenceStr = lastCode.replace(prefix, '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  async getAllInvoices(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { soHoaDon: { contains: search, mode: 'insensitive' as const } },
        { khachHang: { contains: search, mode: 'insensitive' as const } },
        { maSoThue: { contains: search, mode: 'insensitive' as const } },
        { loaiHoaDon: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getInvoiceById(id: string): Promise<any> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return invoice;
  }

  async createInvoice(data: any): Promise<any> {
    if (!data.khachHang) {
      throw new ValidationError('Missing required field: khachHang');
    }

    // Generate invoice number if not provided
    if (!data.soHoaDon) {
      data.soHoaDon = await this.generateInvoiceNumber();
    }

    // Check if invoice number already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { soHoaDon: data.soHoaDon },
    });

    if (existingInvoice) {
      throw new ValidationError('Invoice number already exists');
    }

    // Parse dates
    if (data.ngayLap) {
      data.ngayLap = new Date(data.ngayLap);
    } else {
      data.ngayLap = new Date();
    }

    if (data.ngayThanhToan) {
      data.ngayThanhToan = new Date(data.ngayThanhToan);
    }

    // Calculate thanhTien
    const tongTien = parseFloat(data.tongTien) || 0;
    const thue = parseFloat(data.thue) || 0;
    data.tongTien = tongTien;
    data.thue = thue;
    data.thanhTien = tongTien + (tongTien * thue / 100);

    const invoice = await prisma.invoice.create({ data });
    return invoice;
  }

  async updateInvoice(id: string, data: any): Promise<any> {
    await this.getInvoiceById(id);

    if (data.ngayLap) {
      data.ngayLap = new Date(data.ngayLap);
    }

    if (data.ngayThanhToan) {
      data.ngayThanhToan = new Date(data.ngayThanhToan);
    }

    // Recalculate thanhTien if tongTien or thue changed
    if (data.tongTien !== undefined || data.thue !== undefined) {
      const tongTien = parseFloat(data.tongTien) || 0;
      const thue = parseFloat(data.thue) || 0;
      data.tongTien = tongTien;
      data.thue = thue;
      data.thanhTien = tongTien + (tongTien * thue / 100);
    }

    const invoice = await prisma.invoice.update({ where: { id }, data });
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.getInvoiceById(id);
    await prisma.invoice.delete({ where: { id } });
  }
}

export default new InvoiceService();

