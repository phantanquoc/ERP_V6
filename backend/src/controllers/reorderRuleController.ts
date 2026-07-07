import { Request, Response, NextFunction } from 'express';
import reorderRuleService from '@services/reorderRuleService';

class ReorderRuleController {
  async getAllRules(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const activeOnly = req.query.activeOnly === 'true';

      const result = await reorderRuleService.getAllRules(page, limit, search, activeOnly);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getRuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const rule = await reorderRuleService.getRuleById(id);
      return res.json({ success: true, data: rule });
    } catch (error) {
      return next(error);
    }
  }

  async getRuleByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.productId as string;
      const rule = await reorderRuleService.getRuleByProductId(productId);
      return res.json({ success: true, data: rule });
    } catch (error) {
      return next(error);
    }
  }

  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await reorderRuleService.createRule(req.body);
      return res.status(201).json({
        success: true,
        data: rule,
        message: 'Tạo quy tắc bổ sung hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const rule = await reorderRuleService.updateRule(id, req.body);
      return res.json({
        success: true,
        data: rule,
        message: 'Cập nhật quy tắc bổ sung hàng thành công',
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await reorderRuleService.deleteRule(id);
      return res.json({ success: true, message: result.message });
    } catch (error) {
      return next(error);
    }
  }
}

export default new ReorderRuleController();
