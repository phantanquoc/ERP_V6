import { Request, Response, NextFunction } from 'express';
import exportCostService from '../services/exportCostService';
import logger from '@config/logger';

class ExportCostController {
  // Get all export costs
  async getAllExportCosts(req: Request, res: Response) {
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
    } catch (error: any) {
      logger.error('Error getting export costs:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách chi phí xuất khẩu', error: error.message });
    }
  }

  // Get export cost by ID
  async getExportCostById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const exportCost = await exportCostService.getExportCostById(id);

      if (!exportCost) {
        return res.status(404).json({ message: 'Không tìm thấy chi phí xuất khẩu' });
      }

      return res.json(exportCost);
    } catch (error: any) {
      logger.error('Error getting export cost:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy chi phí xuất khẩu', error: error.message });
    }
  }

  // Create export cost
  async createExportCost(req: Request, res: Response) {
    try {
      const exportCost = await exportCostService.createExportCost(req.body);
      res.status(201).json(exportCost);
    } catch (error: any) {
      logger.error('Error creating export cost:', error);
      res.status(500).json({ message: 'Lỗi khi tạo chi phí xuất khẩu', error: error.message });
    }
  }

  // Update export cost
  async updateExportCost(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const exportCost = await exportCostService.updateExportCost(id, req.body);
      res.json(exportCost);
    } catch (error: any) {
      logger.error('Error updating export cost:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật chi phí xuất khẩu', error: error.message });
    }
  }

  // Delete export cost
  async deleteExportCost(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await exportCostService.deleteExportCost(id);
      res.json({ message: 'Xóa chi phí xuất khẩu thành công' });
    } catch (error: any) {
      logger.error('Error deleting export cost:', error);
      res.status(500).json({ message: 'Lỗi khi xóa chi phí xuất khẩu', error: error.message });
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

