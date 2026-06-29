import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@types';
import quotationService from '@services/quotationService';

export class QuotationController {
  async getAllQuotations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 20;
      const search = req.query.search as string;
      const customerType = req.query.customerType as string;
      const status = req.query.status as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      const result = await quotationService.getAllQuotations(page, limit, search, customerType, status, dateFrom, dateTo);

      const response: ApiResponse<any> = {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getQuotationById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const quotation = await quotationService.getQuotationById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: quotation,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      const quotation = await quotationService.createQuotation(req.body, actorId, actorRole);

      const response: ApiResponse<any> = {
        success: true,
        data: quotation,
        message: 'Quotation created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const quotation = await quotationService.updateQuotation(id, req.body, req.user?.role, req.user?.id);

      const response: ApiResponse<any> = {
        success: true,
        data: quotation,
        message: 'Quotation updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      await quotationService.deleteQuotation(id, actorId, actorRole);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Quotation deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async generateQuotationCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Quotation code is now auto-generated from quotation request code
      const response: ApiResponse<any> = {
        success: true,
        data: {
          code: 'AUTO_GENERATED',
          message: 'Quotation code will be auto-generated from quotation request code'
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await quotationService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-bao-gia-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async listAgingWarnings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawThreshold = parseInt(req.query.threshold as string);
      // Whitelist: integer 1–90, default 7 (task 7.4)
      const threshold = Number.isInteger(rawThreshold) && rawThreshold >= 1 && rawThreshold <= 90 ? rawThreshold : 7;

      const result = await quotationService.listAgingWarnings(threshold);

      const response: ApiResponse<any> = {
        success: true,
        data: result,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new QuotationController();

