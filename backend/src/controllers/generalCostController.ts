import { Request, Response, NextFunction } from 'express';
import generalCostService from '../services/generalCostService';
import logger from '@config/logger';

class GeneralCostController {
  // Get all general costs
  async getAllGeneralCosts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await generalCostService.getAllGeneralCosts(page, limit, search);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      logger.error('Error getting general costs:', error);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách chi phí chung', error: error.message });
    }
  }

  // Get general cost by ID
  async getGeneralCostById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const generalCost = await generalCostService.getGeneralCostById(id);

      if (!generalCost) {
        return res.status(404).json({ message: 'Không tìm thấy chi phí chung' });
      }

      return res.json(generalCost);
    } catch (error: any) {
      logger.error('Error getting general cost:', error);
      return res.status(500).json({ message: 'Lỗi khi lấy chi phí chung', error: error.message });
    }
  }

  // Create general cost
  async createGeneralCost(req: Request, res: Response) {
    try {
      const generalCost = await generalCostService.createGeneralCost(req.body);
      res.status(201).json(generalCost);
    } catch (error: any) {
      logger.error('Error creating general cost:', error);
      res.status(500).json({ message: 'Lỗi khi tạo chi phí chung', error: error.message });
    }
  }

  // Update general cost
  async updateGeneralCost(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const generalCost = await generalCostService.updateGeneralCost(id, req.body);
      res.json(generalCost);
    } catch (error: any) {
      logger.error('Error updating general cost:', error);
      res.status(500).json({ message: 'Lỗi khi cập nhật chi phí chung', error: error.message });
    }
  }

  // Delete general cost
  async deleteGeneralCost(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await generalCostService.deleteGeneralCost(id);
      res.json({ message: 'Xóa chi phí chung thành công' });
    } catch (error: any) {
      logger.error('Error deleting general cost:', error);
      res.status(500).json({ message: 'Lỗi khi xóa chi phí chung', error: error.message });
    }
  }

  // Export to Excel
  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await generalCostService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=chi-phi-chung-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new GeneralCostController();

