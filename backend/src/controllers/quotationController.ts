import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@types';
import quotationService from '@services/quotationService';

export class QuotationController {
  async getAllQuotations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await quotationService.getAllQuotations(page, limit, search);

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
      const { id } = req.params;
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
      const quotation = await quotationService.createQuotation(req.body);

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
      const { id } = req.params;
      const quotation = await quotationService.updateQuotation(id, req.body);

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
      const { id } = req.params;
      await quotationService.deleteQuotation(id);

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
}

export default new QuotationController();

