import { Response } from 'express';
import loginHistoryService from '@services/loginHistoryService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class LoginHistoryController {
  /**
   * Get login history for the authenticated user
   */
  async getMyLoginHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

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
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }

  /**
   * Get all login history (admin only)
   */
  async getAllLoginHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId as string;
      const status = req.query.status as 'success' | 'failed' | undefined;

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
      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  }
}

export default new LoginHistoryController();

