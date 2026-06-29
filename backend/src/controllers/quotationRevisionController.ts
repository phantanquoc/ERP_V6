import { Response, NextFunction } from 'express';
import quotationRevisionService from '@services/quotationRevisionService';
import { AuthenticatedRequest, ApiResponse } from '@types';

export class QuotationRevisionController {
  async listRevisions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotationId = req.params.id as string;
      const page = parseInt(req.query.page as string) || 1;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = [10, 20, 50].includes(rawLimit) ? rawLimit : 20;

      const result = await quotationRevisionService.listByQuotation(quotationId, page, limit);

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

  async getRevisionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const quotationId = req.params.id as string;
      const revisionId = req.params.revisionId as string;

      const revision = await quotationRevisionService.getById(quotationId, revisionId);

      const response: ApiResponse<any> = {
        success: true,
        data: revision,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new QuotationRevisionController();
