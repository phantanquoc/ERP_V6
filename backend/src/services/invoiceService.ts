import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import type { PaginatedResponse } from '@types';
import { NotificationEvent } from '@types';
import notificationService from '@services/notificationService';
import ExcelJS from 'exceljs';

export class InvoiceService {
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.invoice.findFirst({
      where: { soHoaDon: yearlyCodeWhere('HD', year) },
      orderBy: { soHoaDon: 'desc' },
      select: { soHoaDon: true },
    });
    return nextYearlyCode(last?.soHoaDon ?? null, 'HD', year);
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

  async createInvoice(data: any, userId?: string): Promise<any> {
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

    // Calculate thanhTien (auto-calculate, but allow manual override if thanhTien is explicitly provided)
    const tongTien = parseFloat(data.tongTien) || 0;
    const thue = parseFloat(data.thue) || 0;
    data.tongTien = tongTien;
    data.thue = thue;
    // Only auto-calculate if thanhTien was not explicitly provided by the caller
    if (data.thanhTien === undefined || data.thanhTien === null || data.thanhTien === '') {
      data.thanhTien = tongTien + (tongTien * thue / 100);
    } else {
      data.thanhTien = parseFloat(data.thanhTien) || 0;
    }

    const invoice = await prisma.invoice.create({ data: { ...data, createdById: userId ?? null } });

    try {
      await notificationService.notify(NotificationEvent.INVOICE_CREATED, {
        entityId: invoice.id,
        metadata: { soHoaDon: invoice.soHoaDon, khachHang: invoice.khachHang, thanhTien: invoice.thanhTien },
      });
    } catch {}

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

    // Recalculate thanhTien if tongTien or thue changed, but allow manual override
    if (data.tongTien !== undefined || data.thue !== undefined) {
      const tongTien = parseFloat(data.tongTien) || 0;
      const thue = parseFloat(data.thue) || 0;
      data.tongTien = tongTien;
      data.thue = thue;
      // Only auto-calculate if thanhTien was not explicitly provided
      if (data.thanhTien === undefined || data.thanhTien === null || data.thanhTien === '') {
        data.thanhTien = tongTien + (tongTien * thue / 100);
      } else {
        data.thanhTien = parseFloat(data.thanhTien) || 0;
      }
    }

    const invoice = await prisma.invoice.update({ where: { id }, data });
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.getInvoiceById(id);
    await prisma.invoice.delete({ where: { id } });
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { soHoaDon: { contains: filters.search, mode: 'insensitive' } },
        { khachHang: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const data = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách hóa đơn');
    worksheet.columns = [
      { header: 'Số hóa đơn', key: 'soHoaDon', width: 18 },
      { header: 'Ngày lập', key: 'ngayLap', width: 15 },
      { header: 'Khách hàng', key: 'khachHang', width: 25 },
      { header: 'Mã số thuế', key: 'maSoThue', width: 15 },
      { header: 'Tổng tiền', key: 'tongTien', width: 18 },
      { header: 'Thuế', key: 'thue', width: 10 },
      { header: 'Thành tiền', key: 'thanhTien', width: 18 },
      { header: 'Trạng thái', key: 'trangThai', width: 18 },
      { header: 'Loại hóa đơn', key: 'loaiHoaDon', width: 18 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    data.forEach((inv) => {
      worksheet.addRow({
        soHoaDon: inv.soHoaDon,
        ngayLap: inv.ngayLap ? new Date(inv.ngayLap).toLocaleDateString('vi-VN') : '',
        khachHang: inv.khachHang || '',
        maSoThue: inv.maSoThue || '',
        tongTien: inv.tongTien?.toLocaleString('vi-VN') || '0',
        thue: inv.thue != null ? `${inv.thue}%` : '',
        thanhTien: inv.thanhTien?.toLocaleString('vi-VN') || '0',
        trangThai: inv.trangThai || '',
        loaiHoaDon: inv.loaiHoaDon || '',
        createdAt: new Date(inv.createdAt).toLocaleDateString('vi-VN'),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new InvoiceService();

