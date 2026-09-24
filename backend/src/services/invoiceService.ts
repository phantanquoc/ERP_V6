import prisma from '@config/database';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import { NotificationEvent } from '@types';
import notificationService from '@services/notificationService';
import { z } from 'zod';
import ExcelJS from 'exceljs';

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  maSoThue: z.string().optional(),
  loaiHoaDon: z.string().optional(),
  tongTien: z.coerce.number().min(0).optional(),
  thueVAT: z.coerce.number().min(0).max(100).optional(),
  thanhTien: z.coerce.number().min(0).optional(),
  trangThai: z.string().optional(),
  ngayLap: z.string().optional(),
  ngayThanhToan: z.string().optional(),
  soHoaDon: z.string().optional(),
}).passthrough();

const updateInvoiceSchema = z.object({
  tongTien: z.coerce.number().min(0).optional(),
  thueVAT: z.coerce.number().min(0).max(100).optional(),
  thanhTien: z.coerce.number().min(0).optional(),
  ngayLap: z.string().optional(),
  ngayThanhToan: z.string().optional(),
}).passthrough();

function calcThanhTien(tongTien: number, thueVAT: number): number { return tongTien + (tongTien * thueVAT / 100); }

export class InvoiceService {
  private async generateInvoiceNumberTx(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HD-${year}-`;
    const all = await tx.invoice.findMany({ where: { soHoaDon: { startsWith: prefix } }, select: { soHoaDon: true } });
    if (all.length === 0) return `${prefix}001`;
    const maxNum = Math.max(...all.map((r: any) => parseInt(r.soHoaDon.slice(prefix.length), 10) || 0));
    return `${prefix}${String((isNaN(maxNum) ? 0 : maxNum) + 1).padStart(3, '0')}`;
  }
  async generateInvoiceNumber(): Promise<string> { return this.generateInvoiceNumberTx(prisma as any); }

  async getAllInvoices(page: number = 1, limit: number = 10, search?: string, month?: number, year?: number): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);
    const take = Math.min(Math.max(limit, 1), 500);
    const where: any = {};
    if (search) where.OR = [{ soHoaDon: { contains: search, mode: 'insensitive' as const } },{ maSoThue: { contains: search, mode: 'insensitive' as const } },{ loaiHoaDon: { contains: search, mode: 'insensitive' as const } }];
    if (month && year) { const start = new Date(year, month - 1, 1); const end = new Date(year, month, 1); where.ngayLap = { gte: start, lt: end }; }
    const [invoices, total] = await Promise.all([prisma.invoice.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, tenCongTy: true, quocGia: true, tinhThanh: true } } } }), prisma.invoice.count({ where })]);
    return { data: invoices, total, page, limit: take, totalPages: calculateTotalPages(total, take) };
  }

  async getInvoiceById(id: string): Promise<any> {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    return invoice;
  }

  async createInvoice(raw: unknown): Promise<any> {
    const parsed = createInvoiceSchema.parse(raw);
    const data: any = { ...parsed };
    if (!data.customerId) throw new ValidationError('Missing required field: customerId');
    if (data.ngayLap) data.ngayLap = new Date(data.ngayLap); else data.ngayLap = new Date();
    if (data.ngayThanhToan) data.ngayThanhToan = new Date(data.ngayThanhToan);
    const tongTien = data.tongTien !== undefined ? Number(data.tongTien) : 0;
    const thueVAT = data.thueVAT !== undefined ? Number(data.thueVAT) : 0;
    data.tongTien = tongTien; data.thueVAT = thueVAT;
    if (data.thanhTien === undefined || data.thanhTien === null || data.thanhTien === '') data.thanhTien = calcThanhTien(tongTien, thueVAT); else data.thanhTien = Number(data.thanhTien) || 0;

    const supplied = data.soHoaDon?.trim() || null;
    if (supplied) {
      const dup = await prisma.invoice.findUnique({ where: { soHoaDon: supplied }, select: { id: true } });
      if (dup) throw new ValidationError('Invoice number already exists');
      data.soHoaDon = supplied;
      try { const inv = await prisma.invoice.create({ data }); try { await notificationService.notify(NotificationEvent.INVOICE_CREATED, { entityId: inv.id, metadata: { soHoaDon: inv.soHoaDon, customerId: inv.customerId, thanhTien: inv.thanhTien } }); } catch {} return inv; } catch (e: unknown) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Số hóa đơn đã tồn tại'); throw e; }
    }
    try {
      const inv = await prisma.$transaction(async (tx: any) => {
        const soHoaDon = await this.generateInvoiceNumberTx(tx);
        return tx.invoice.create({ data: { ...data, soHoaDon } });
      });
      try { await notificationService.notify(NotificationEvent.INVOICE_CREATED, { entityId: inv.id, metadata: { soHoaDon: inv.soHoaDon, customerId: inv.customerId, thanhTien: inv.thanhTien } }); } catch {}
      return inv;
    } catch (e: unknown) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictError('Số hóa đơn đã tồn tại, vui lòng thử lại'); throw e; }
  }

  async updateInvoice(id: string, raw: unknown): Promise<any> {
    const existing = await this.getInvoiceById(id);
    const parsed = updateInvoiceSchema.parse(raw ?? {});
    const data: any = { ...parsed };
    if (data.ngayLap) data.ngayLap = new Date(data.ngayLap);
    if (data.ngayThanhToan) data.ngayThanhToan = new Date(data.ngayThanhToan);
    const hasTong = data.tongTien !== undefined;
    const hasVat = data.thueVAT !== undefined;
    const hasThanh = data.thanhTien !== undefined && data.thanhTien !== null && data.thanhTien !== '';
    if (hasTong || hasVat || hasThanh) {
      const tongTien = hasTong ? Number(data.tongTien) : Number(existing.tongTien ?? 0);
      const thueVAT = hasVat ? Number(data.thueVAT) : Number(existing.thueVAT ?? 0);
      if (hasTong) data.tongTien = tongTien;
      if (hasVat) data.thueVAT = thueVAT;
      if (!hasThanh) data.thanhTien = calcThanhTien(tongTien, thueVAT); else data.thanhTien = Number(data.thanhTien) || 0;
    }
    const invoice = await prisma.invoice.update({ where: { id }, data });
    return invoice;
  }

  async deleteInvoice(id: string): Promise<void> { await this.getInvoiceById(id); await prisma.invoice.delete({ where: { id } }); }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) where.OR = [{ soHoaDon: { contains: filters.search, mode: 'insensitive' } }];
    const take = 500; const data = await prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take, include: { customer: true } });
    const workbook = new ExcelJS.Workbook(); const worksheet = workbook.addWorksheet('Danh sách hóa đơn');
    worksheet.columns = [{ header: 'Số hóa đơn', key: 'soHoaDon', width: 18 },{ header: 'Ngày lập', key: 'ngayLap', width: 15 },{ header: 'Khách hàng', key: 'khachHang', width: 25 },{ header: 'Mã số thuế', key: 'maSoThue', width: 15 },{ header: 'Tổng tiền', key: 'tongTien', width: 18 },{ header: 'Thuế VAT', key: 'thueVAT', width: 10 },{ header: 'Thành tiền', key: 'thanhTien', width: 18 },{ header: 'Trạng thái', key: 'trangThai', width: 18 },{ header: 'Loại hóa đơn', key: 'loaiHoaDon', width: 18 },{ header: 'Ngày tạo', key: 'createdAt', width: 15 }];
    worksheet.getRow(1).font = { bold: true }; worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    data.forEach((inv: any) => { worksheet.addRow({ soHoaDon: inv.soHoaDon, ngayLap: inv.ngayLap ? new Date(inv.ngayLap).toLocaleDateString('vi-VN') : '', khachHang: inv.customer?.tenCongTy || '', maSoThue: inv.maSoThue || '', tongTien: inv.tongTien?.toLocaleString('vi-VN') || '0', thueVAT: inv.thueVAT != null ? `${inv.thueVAT}%` : '', thanhTien: inv.thanhTien?.toLocaleString('vi-VN') || '0', trangThai: inv.trangThai || '', loaiHoaDon: inv.loaiHoaDon || '', createdAt: new Date(inv.createdAt).toLocaleDateString('vi-VN') }); });
    const buffer = await workbook.xlsx.writeBuffer(); return buffer as any;
  }
}
export default new InvoiceService();
