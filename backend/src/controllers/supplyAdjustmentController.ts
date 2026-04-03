import { Response, NextFunction } from 'express';
import supplyAdjustmentService from '@services/supplyAdjustmentService';
import { AppError } from '@utils/errors';
import { AuthenticatedRequest, ApiResponse } from '@types';
import logger from '@config/logger';

class SupplyAdjustmentController {
  /**
   * POST /api/supply-adjustments
   * Create a new supply adjustment request.
   */
  async create(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await supplyAdjustmentService.create(req.body, userId);

      res.status(201).json({
        success: true,
        message: 'Tạo yêu cầu điều chỉnh vật tư thành công',
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('Unexpected error in supplyAdjustmentController.create:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * GET /api/supply-adjustments
   * Get paginated list of supply adjustments (role-filtered).
   */
  async getAll(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const page = req.query.page as string | undefined;
      const limit = req.query.limit as string | undefined;
      const trangThai = req.query.trangThai as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await supplyAdjustmentService.getAll(
        { page, limit, trangThai, search },
        userId,
        userRole
      );

      res.status(200).json({
        success: true,
        message: 'Lấy danh sách điều chỉnh vật tư thành công',
        data: result.data,
        pagination: {
          page: result.page,
          limit: Number(limit) || 10,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<typeof result.data>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('Unexpected error in supplyAdjustmentController.getAll:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * GET /api/supply-adjustments/:id
   * Get a single supply adjustment by ID.
   */
  async getById(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const id = req.params.id as string;

      const result = await supplyAdjustmentService.getById(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Lấy thông tin điều chỉnh vật tư thành công',
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('Unexpected error in supplyAdjustmentController.getById:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * PATCH /api/supply-adjustments/:id/approve
   * Approve a supply adjustment request.
   */
  async approve(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const id = req.params.id as string;

      const result = await supplyAdjustmentService.approve(id, userId, userRole);

      res.status(200).json({
        success: true,
        message: 'Duyệt yêu cầu điều chỉnh vật tư thành công',
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('Unexpected error in supplyAdjustmentController.approve:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * PATCH /api/supply-adjustments/:id/reject
   * Reject a supply adjustment request with a reason.
   */
  async reject(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const id = req.params.id as string;
      const { lyDoTuChoi } = req.body as { lyDoTuChoi: string };

      const result = await supplyAdjustmentService.reject(id, userId, userRole, lyDoTuChoi);

      res.status(200).json({
        success: true,
        message: 'Từ chối yêu cầu điều chỉnh vật tư thành công',
        data: result,
      } as ApiResponse<typeof result>);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('Unexpected error in supplyAdjustmentController.reject:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }
}

export default new SupplyAdjustmentController();
