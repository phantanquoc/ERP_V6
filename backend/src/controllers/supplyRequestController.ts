import { Request, Response, NextFunction } from 'express';
import supplyRequestService from '@services/supplyRequestService';

class SupplyRequestController {
  async getAllSupplyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await supplyRequestService.getAllSupplyRequests(page, limit, search);

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

