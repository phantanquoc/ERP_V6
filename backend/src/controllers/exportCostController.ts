import { Request, Response, NextFunction } from 'express';
import exportCostService from '../services/exportCostService';
import { NotFoundError } from '../utils/errors';
import { AuthenticatedRequest } from '@types';

class ExportCostController {
  // Get all export costs
  async getAllExportCosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 20;
      const search = req.query.search as string | undefined;
      const loaiChiPhi = req.query.loaiChiPhi as string | undefined;

      const result = await exportCostService.getAllExportCosts(page, limit, search, loaiChiPhi);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get export cost by ID
  async getExportCostById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const exportCost = await exportCostService.getExportCostById(id);

      if (!exportCost) {
        throw new NotFoundError('Không tìm thấy chi phí');
      }

      return res.json({ success: true, data: exportCost });
    } catch (error) {
      return next(error);
    }
  }

  // Create export cost
  async createExportCost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const exportCost = await exportCostService.createExportCost(req.body, req.user?.id, req.user?.role);
      res.status(201).json({
        success: true,
        message: 'Tạo chi phí thành công',
        data: exportCost,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update export cost
  async updateExportCost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const exportCost = await exportCostService.updateExportCost(id, req.body, req.user?.id, req.user?.role);
      res.json({
        success: true,
        message: 'Cập nhật chi phí thành công',
        data: exportCost,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete export cost
  async deleteExportCost(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await exportCostService.deleteExportCost(id, req.user?.id, req.user?.role);
      res.json({ success: true, message: 'Xóa chi phí thành công' });
    } catch (error) {
      next(error);
    }
  }

  // Export to Excel
  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await exportCostService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=chi-phi-xuat-khau-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new ExportCostController();
