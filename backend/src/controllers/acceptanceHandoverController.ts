import { Request, Response, NextFunction } from 'express';
import acceptanceHandoverService from '@services/acceptanceHandoverService';
import { getFileUrl } from '@middlewares/upload';

class AcceptanceHandoverController {
  async getAllAcceptanceHandovers(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
      return next(error);
    }
  }

  async getAcceptanceHandoverById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const handover = await acceptanceHandoverService.getAcceptanceHandoverById(id);

      return res.json({
        success: true,
        data: handover,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createAcceptanceHandover(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse repairRequestId to number since it comes as string from FormData
      const file = req.file as Express.Multer.File | undefined;
      const data = {
        ...req.body,
        repairRequestId: parseInt(req.body.repairRequestId, 10),
        fileDinhKem: file ? getFileUrl('acceptance-handovers', file.filename) : undefined,
      };

      const handover = await acceptanceHandoverService.createAcceptanceHandover(data);

      return res.status(201).json({
        success: true,
        data: handover,
        message: 'Tạo nghiệm thu bàn giao thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async generateAcceptanceHandoverCode(_req: Request, res: Response, next: NextFunction) {
    try {
      const code = await acceptanceHandoverService.getGeneratedCode();

      return res.json({
        success: true,
        data: { code },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateAcceptanceHandover(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
      return next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await acceptanceHandoverService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-nghiem-thu-ban-giao-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async deleteAcceptanceHandover(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await acceptanceHandoverService.deleteAcceptanceHandover(id);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export default new AcceptanceHandoverController();

