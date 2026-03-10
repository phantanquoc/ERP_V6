import { Request, Response, NextFunction } from 'express';
import exportCostService from '../services/exportCostService';

class ExportCostController {
  // Get all export costs
  async getAllExportCosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await exportCostService.getAllExportCosts(page, limit, search);

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
        return res.status(404).json({ message: 'Không tìm thấy chi phí xuất khẩu' });
      }

      return res.json(exportCost);
    } catch (error) {
      return next(error);
    }
  }

  // Create export cost
  async createExportCost(req: Request, res: Response, next: NextFunction) {
    try {
      const exportCost = await exportCostService.createExportCost(req.body);
      res.status(201).json(exportCost);
    } catch (error) {
      next(error);
    }
  }

  // Update export cost
  async updateExportCost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const exportCost = await exportCostService.updateExportCost(id, req.body);
      res.json(exportCost);
    } catch (error) {
      next(error);
    }
  }

  // Delete export cost
  async deleteExportCost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await exportCostService.deleteExportCost(id);
      res.json({ message: 'Xóa chi phí xuất khẩu thành công' });
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

