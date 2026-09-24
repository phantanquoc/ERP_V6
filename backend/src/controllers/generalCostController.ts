import { Request, Response, NextFunction } from 'express';
import generalCostService from '../services/generalCostService';

const ALLOWED_COST_FIELDS = ['tenChiPhi','loaiChiPhi','noiDung','donViTinh','giaThanhNgay','donViTien','msnv','tenNhanVien'] as const;
function pickAllowedCost(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_COST_FIELDS) if (k in body) out[k]=body[k];
  return out;
}

class GeneralCostController {
  // Get all general costs
  async getAllGeneralCosts(req: Request, res: Response, next: NextFunction) {
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
    } catch (error) {
      next(error);
    }
  }

  // Get general cost by ID
  async getGeneralCostById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const generalCost = await generalCostService.getGeneralCostById(id);

      if (!generalCost) {
        return res.status(404).json({ message: 'Không tìm thấy chi phí chung' });
      }

      return res.json(generalCost);
    } catch (error) {
      return next(error);
    }
  }

  // Create general cost
  async createGeneralCost(req: Request, res: Response, next: NextFunction) {
    try {
      const generalCost = await generalCostService.createGeneralCost(pickAllowedCost(req.body as Record<string, unknown>) as any);
      res.status(201).json(generalCost);
    } catch (error) {
      next(error);
    }
  }

  // Update general cost
  async updateGeneralCost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const generalCost = await generalCostService.updateGeneralCost(id, pickAllowedCost(req.body as Record<string, unknown>) as any);
      res.json(generalCost);
    } catch (error) {
      next(error);
    }
  }

  // Delete general cost
  async deleteGeneralCost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await generalCostService.deleteGeneralCost(id);
      res.json({ message: 'Xóa chi phí chung thành công' });
    } catch (error) {
      next(error);
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

