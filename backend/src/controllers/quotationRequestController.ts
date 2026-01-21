import { Response, NextFunction } from 'express';
import quotationRequestService from '@services/quotationRequestService';
import { AuthenticatedRequest, ApiResponse } from '@types';

export class QuotationRequestController {
  async getAllQuotationRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const customerType = req.query.customerType as string;

      const result = await quotationRequestService.getAllQuotationRequests(page, limit, search, customerType);

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

  async getQuotationRequestById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const request = await quotationRequestService.getQuotationRequestById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getQuotationRequestByCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const request = await quotationRequestService.getQuotationRequestByCode(code);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const request = await quotationRequestService.createQuotationRequest(req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
        message: 'Quotation request created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const request = await quotationRequestService.updateQuotationRequest(id, req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
        message: 'Quotation request updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await quotationRequestService.deleteQuotationRequest(id);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Quotation request deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async generateQuotationRequestCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await quotationRequestService.generateQuotationRequestCode();

      const response: ApiResponse<any> = {
        success: true,
        data: { code },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new QuotationRequestController();

