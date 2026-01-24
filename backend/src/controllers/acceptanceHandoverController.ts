import { Request, Response } from 'express';
import acceptanceHandoverService from '@services/acceptanceHandoverService';

class AcceptanceHandoverController {
  async getAllAcceptanceHandovers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await acceptanceHandoverService.getAllAcceptanceHandovers(page, limit, search);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách nghiệm thu bàn giao',
      });
    }
  }

  async getAcceptanceHandoverById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const handover = await acceptanceHandoverService.getAcceptanceHandoverById(id);

      return res.json({
        success: true,
        data: handover,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin nghiệm thu bàn giao',
      });
    }
  }

  async createAcceptanceHandover(req: Request, res: Response) {
    try {
      // Parse repairRequestId to number since it comes as string from FormData
      const data = {
        ...req.body,
        repairRequestId: parseInt(req.body.repairRequestId, 10),
      };

      const handover = await acceptanceHandoverService.createAcceptanceHandover(data);

      return res.status(201).json({
        success: true,
        data: handover,
        message: 'Tạo nghiệm thu bàn giao thành công',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo nghiệm thu bàn giao',
      });
    }
  }

  async generateAcceptanceHandoverCode(_req: Request, res: Response) {
    try {
      const code = await acceptanceHandoverService.getGeneratedCode();

      return res.json({
        success: true,
        data: { code },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tạo mã nghiệm thu bàn giao',
      });
    }
  }

  async updateAcceptanceHandover(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      // Parse repairRequestId to number if it exists
      const data = {
        ...req.body,
      };
      if (req.body.repairRequestId) {
        data.repairRequestId = parseInt(req.body.repairRequestId, 10);
      }

      const handover = await acceptanceHandoverService.updateAcceptanceHandover(id, data);

      return res.json({
        success: true,
        data: handover,
        message: 'Cập nhật nghiệm thu bàn giao thành công',
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật nghiệm thu bàn giao',
      });
    }
  }

  async deleteAcceptanceHandover(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await acceptanceHandoverService.deleteAcceptanceHandover(id);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi xóa nghiệm thu bàn giao',
      });
    }
  }
}

export default new AcceptanceHandoverController();

