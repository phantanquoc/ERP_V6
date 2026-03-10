import { Request, Response, NextFunction } from 'express';
import purchaseRequestService from '@services/purchaseRequestService';
import { getFileUrl } from '@middlewares/upload';

class PurchaseRequestController {
  async getAllPurchaseRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await purchaseRequestService.getAllPurchaseRequests(page, limit, search);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getPurchaseRequestById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const request = await purchaseRequestService.getPurchaseRequestById(id);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createPurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl('purchase-requests', req.file.filename);
      }

      const request = await purchaseRequestService.createPurchaseRequest(data);

      return res.status(201).json({
        success: true,
        data: request,
        message: 'Tạo yêu cầu mua hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async generatePurchaseRequestCode(_req: Request, res: Response, next: NextFunction) {
    try {
      const code = await purchaseRequestService.getGeneratedCode();

      return res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updatePurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl('purchase-requests', req.file.filename);
      }

      const request = await purchaseRequestService.updatePurchaseRequest(id, data);

      return res.json({
        success: true,
        data: request,
        message: 'Cập nhật yêu cầu mua hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async deletePurchaseRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await purchaseRequestService.deletePurchaseRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu mua hàng thành công',
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

      const buffer = await purchaseRequestService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-yeu-cau-mua-hang-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new PurchaseRequestController();

