import { Request, Response, NextFunction } from 'express';
import invoiceService from '@services/invoiceService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

const ALLOWED_INVOICE_FIELDS = ['customerId','maSoThue','loaiHoaDon','boPhanSuDung','mucDichSuDung','tongTien','thueVAT','thanhTien','trangThai','phuongThucThanhToan','ngayLap','ngayThanhToan','nhanVienLap','ghiChu','soHoaDon','files'] as const;
const ALLOWED_INVOICE_UPDATE_FIELDS = ['customerId','maSoThue','loaiHoaDon','boPhanSuDung','mucDichSuDung','tongTien','thueVAT','thanhTien','trangThai','phuongThucThanhToan','ngayLap','ngayThanhToan','ghiChu'] as const;
function pickAllowedInvoice(body: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const allow = isCreate ? ALLOWED_INVOICE_FIELDS : ALLOWED_INVOICE_UPDATE_FIELDS;
  const out: Record<string, unknown> = {};
  for (const k of allow) if (k in body) out[k]=body[k];
  return out;
}

export class InvoiceController {
  async getAllInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const result = await invoiceService.getAllInvoices(page, limit, search, month, year);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const invoice = await invoiceService.getInvoiceById(id);

      res.json({
        success: true,
        data: invoice,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await invoiceService.createInvoice(pickAllowedInvoice(req.body as Record<string, unknown>, true));

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const invoice = await invoiceService.updateInvoice(id, pickAllowedInvoice(req.body as Record<string, unknown>, false));

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await invoiceService.deleteInvoice(id);

      res.json({
        success: true,
        message: 'Invoice deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateInvoiceNumber(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await invoiceService.generateInvoiceNumber();

      res.json({
        success: true,
        data: { code },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await invoiceService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-hoa-don-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new InvoiceController();

