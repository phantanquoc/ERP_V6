import { Request, Response } from 'express';
import supplyRequestService from '@services/supplyRequestService';

class SupplyRequestController {
  async getAllSupplyRequests(req: Request, res: Response) {
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
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách yêu cầu cung cấp',
      });
    }
  }

  async getSupplyRequestById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplyRequest = await supplyRequestService.getSupplyRequestById(id);

      return res.json({
        success: true,
        data: supplyRequest,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy yêu cầu cung cấp',
      });
    }
  }

  async createSupplyRequest(req: Request, res: Response) {
    try {
      const supplyRequest = await supplyRequestService.createSupplyRequest(req.body);

      return res.status(201).json({
        success: true,
        data: supplyRequest,
        message: 'Tạo yêu cầu cung cấp thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi tạo yêu cầu cung cấp',
      });
    }
  }

  async updateSupplyRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplyRequest = await supplyRequestService.updateSupplyRequest(id, req.body);

      return res.json({
        success: true,
        data: supplyRequest,
        message: 'Cập nhật yêu cầu cung cấp thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật yêu cầu cung cấp',
      });
    }
  }

  async deleteSupplyRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await supplyRequestService.deleteSupplyRequest(id);

      return res.json({
        success: true,
        message: 'Xóa yêu cầu cung cấp thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi xóa yêu cầu cung cấp',
      });
    }
  }
}

export default new SupplyRequestController();

