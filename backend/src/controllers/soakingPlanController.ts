import { Response, NextFunction } from 'express';
import soakingPlanService from '@services/soakingPlanService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class SoakingPlanController {
  async createSoakingPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const userId = req.user?.id;
      const plan = await soakingPlanService.createSoakingPlan(data, userId);

      res.status(201).json({
        success: true,
        message: 'Tạo kế hoạch ngâm thành công',
        data: plan,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateSoakingPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;
      const plan = await soakingPlanService.updateSoakingPlan(id, data);

      res.json({
        success: true,
        message: 'Cập nhật kế hoạch ngâm thành công',
        data: plan,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async cancelSoakingPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const plan = await soakingPlanService.cancelSoakingPlan(id);

      res.json({
        success: true,
        message: 'Huỷ kế hoạch ngâm thành công',
        data: plan,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async listSoakingPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const orderId = req.query.orderId as string | undefined;
      const productId = req.query.productId as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;

      const filters: Record<string, any> = {};
      if (orderId) filters.orderId = orderId;
      if (productId) filters.productId = productId;
      if (trangThai) filters.trangThai = trangThai;

      const result = await soakingPlanService.listSoakingPlans(page, limit, filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getActiveByProductId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId } = req.params;
      const plans = await soakingPlanService.getActiveByProductId(productId);

      res.json({
        success: true,
        data: plans,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async listPlannableOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await soakingPlanService.listPlannableOrders(page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

const soakingPlanController = new SoakingPlanController();
export default soakingPlanController;