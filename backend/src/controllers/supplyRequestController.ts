import { Request, Response, NextFunction } from 'express';
import supplyRequestService from '@services/supplyRequestService';
import type { AuthenticatedRequest } from '@types';

class SupplyRequestController {
  async getAllSupplyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const requestType = req.query.requestType as string | undefined;

      const result = await supplyRequestService.getAllSupplyRequests(page, limit, search, requestType);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getSupplyRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplyRequest = await supplyRequestService.getSupplyRequestById(id);

      return res.json({
        success: true,
        data: supplyRequest,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const supplyRequest = await supplyRequestService.createSupplyRequest(req.body);

      return res.status(201).json({
        success: true,
        data: supplyRequest,
        message: 'Tạo yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplyRequest = await supplyRequestService.updateSupplyRequest(id, req.body);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Cập nhật yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateSupplyRequestStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { trangThai } = req.body as { trangThai?: string };
      const supplyRequest = await supplyRequestService.updateSupplyRequestStatus(id, String(trangThai || ''), req.user);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Cập nhật trạng thái yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async approveSupplyRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplyRequest = await supplyRequestService.approveSupplyRequest(id, req.user);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Duyệt yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async rejectSupplyRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { rejectionReason } = req.body as { rejectionReason?: string };
      const supplyRequest = await supplyRequestService.rejectSupplyRequest(id, rejectionReason, req.user);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Từ chối yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteSupplyRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await supplyRequestService.deleteSupplyRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu cung cấp thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: any = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.requestType) {
        filters.requestType = req.query.requestType as string;
      }

      const buffer = await supplyRequestService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-cung-cap-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplyRequestController();
