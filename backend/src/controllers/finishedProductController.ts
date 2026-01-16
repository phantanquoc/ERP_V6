import { Request, Response, NextFunction } from 'express';
import finishedProductService from '@services/finishedProductService';
import type { AuthenticatedRequest } from '@types';

export class FinishedProductController {
  async getAllFinishedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const tenMay = req.query.tenMay as string | undefined;

      const result = await finishedProductService.getAllFinishedProducts(page, limit, tenMay);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinishedProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await finishedProductService.getFinishedProductById(id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFinishedProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const product = await finishedProductService.createFinishedProduct(req.body, userId);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Tạo thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFinishedProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const product = await finishedProductService.updateFinishedProduct(id, req.body, userId);

      res.json({
        success: true,
        data: product,
        message: 'Cập nhật thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFinishedProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await finishedProductService.deleteFinishedProduct(id);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FinishedProductController();

