import { Request, Response, NextFunction } from 'express';
import { QuotationRequestStatus } from '@prisma/client';
import quotationRequestService from '@services/quotationRequestService';
import { AuthenticatedRequest, ApiResponse } from '@types';
import { ValidationError } from '@utils/errors';

const VALID_STATUSES = new Set<string>(Object.values(QuotationRequestStatus));

export class QuotationRequestController {
  async getAllQuotationRequests(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 20;
      const search = req.query.search as string | undefined;
      const customerType = req.query.customerType as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      // Validate optional status filter (task 2.6)
      let status: QuotationRequestStatus | undefined;
      if (req.query.status) {
        const rawStatus = req.query.status as string;
        if (!VALID_STATUSES.has(rawStatus)) {
          throw new ValidationError(`Trạng thái không hợp lệ: ${rawStatus}. Giá trị cho phép: ${[...VALID_STATUSES].join(', ')}`);
        }
        status = rawStatus as QuotationRequestStatus;
      }

      const result = await quotationRequestService.getAllQuotationRequests(page, limit, search, customerType, status, dateFrom, dateTo, month, year);

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
      const id = req.params.id as string;
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
      const code = req.params.code as string;
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
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      const request = await quotationRequestService.createQuotationRequest(req.body, actorId, actorRole);

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
      const id = req.params.id as string;
      const actorRole = req.user?.role;
      const actorId = req.user?.id;
      const request = await quotationRequestService.updateQuotationRequest(id, req.body, actorRole, actorId);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
        message: 'Yêu cầu báo giá đã được cập nhật',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async cancelQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorRole = req.user?.role;
      const actorId = req.user?.id;
      const request = await quotationRequestService.cancelQuotationRequest(id, actorRole, actorId);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
        message: 'Yêu cầu báo giá đã được hủy',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async markInProgress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorRole = req.user?.role;
      const actorId = req.user?.id;
      const request = await quotationRequestService.markInProgress(id, actorId, actorRole);

      const response: ApiResponse<any> = {
        success: true,
        data: request,
        message: 'Yêu cầu báo giá đang được xử lý',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async approveQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorRole = req.user?.role;
      const actorId = req.user?.id;
      const request = await quotationRequestService.approveQuotationRequest(id, actorId, actorRole);
      const response: ApiResponse<any> = { success: true, data: request, message: 'YCBG đã được duyệt' };
      res.json(response);
    } catch (error) { next(error); }
  }

  async rejectQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorRole = req.user?.role;
      const actorId = req.user?.id;
      const lyDo = (req.body as any)?.lyDo as string | undefined;
      const request = await quotationRequestService.rejectQuotationRequest(id, actorId, actorRole, lyDo);
      const response: ApiResponse<any> = { success: true, data: request, message: 'YCBG đã bị từ chối' };
      res.json(response);
    } catch (error) { next(error); }
  }

  async deleteQuotationRequest(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const actorId = req.user?.id;
      const actorRole = req.user?.role;
      await quotationRequestService.deleteQuotationRequest(id, actorId, actorRole);

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

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await quotationRequestService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-bao-gia-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new QuotationRequestController();

