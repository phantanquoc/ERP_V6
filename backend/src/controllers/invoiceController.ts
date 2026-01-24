import { Response, NextFunction } from 'express';
import invoiceService from '@services/invoiceService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class InvoiceController {
  async getAllInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await invoiceService.getAllInvoices(page, limit, search);

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
      const invoice = await invoiceService.createInvoice(req.body);

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
      const invoice = await invoiceService.updateInvoice(id, req.body);

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
}

export default new InvoiceController();

