import { Request, Response } from 'express';
import purchaseRequestService from '@services/purchaseRequestService';

// Helper function to get file URL
const getFileUrl = (filename: string): string => {
  return `/uploads/purchase-requests/${filename}`;
};

class PurchaseRequestController {
  async getAllPurchaseRequests(req: Request, res: Response) {
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách yêu cầu mua hàng',
      });
    }
  }

  async getPurchaseRequestById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const request = await purchaseRequestService.getPurchaseRequestById(id);

      return res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy chi tiết yêu cầu mua hàng',
      });
    }
  }

  async createPurchaseRequest(req: Request, res: Response) {
    try {
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl(req.file.filename);
      }

      const request = await purchaseRequestService.createPurchaseRequest(data);

      return res.status(201).json({
        success: true,
        data: request,
        message: 'Tạo yêu cầu mua hàng thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo yêu cầu mua hàng',
      });
    }
  }

  async generatePurchaseRequestCode(_req: Request, res: Response) {
    try {
      const code = await purchaseRequestService.getGeneratedCode();

      return res.json({
        success: true,
        data: { code },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo mã yêu cầu mua hàng',
      });
    }
  }

  async updatePurchaseRequest(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileKemTheo = getFileUrl(req.file.filename);
      }

      const request = await purchaseRequestService.updatePurchaseRequest(id, data);

      return res.json({
        success: true,
        data: request,
        message: 'Cập nhật yêu cầu mua hàng thành công',
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật yêu cầu mua hàng',
      });
    }
  }

  async deletePurchaseRequest(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await purchaseRequestService.deletePurchaseRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu mua hàng thành công',
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi xóa yêu cầu mua hàng',
      });
    }
  }
}

export default new PurchaseRequestController();

