import { Response, NextFunction } from 'express';
import loginHistoryService from '@services/loginHistoryService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class LoginHistoryController {
  /**
   * Get login history for the authenticated user
   */
  async getMyLoginHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const cursor = req.query.cursor as string | undefined;

      if (cursor !== undefined) {
        const limit = parseInt(req.query.limit as string) || 10;
        const result = await loginHistoryService.getUserLoginHistoryCursor(userId, cursor || undefined, limit);
        res.status(200).json({ success: true, data: result.data, nextCursor: result.nextCursor, hasMore: result.hasMore });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await loginHistoryService.getUserLoginHistory(userId, {
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        total: result.total,
        message: 'Login history retrieved successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all login history (admin only)
   */
  async getAllLoginHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cursor = req.query.cursor as string | undefined;
      const userId = req.query.userId as string;
      const status = req.query.status as 'success' | 'failed' | undefined;

      if (cursor !== undefined) {
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await loginHistoryService.getAllLoginHistoryCursor({ cursor: cursor || undefined, limit, userId, status });
        res.status(200).json({ success: true, data: result.data, nextCursor: result.nextCursor, hasMore: result.hasMore });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await loginHistoryService.getAllLoginHistory({
        limit,
        offset,
        userId,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        total: result.total,
        message: 'Login history retrieved successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new LoginHistoryController();

