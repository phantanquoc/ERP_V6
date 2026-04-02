import { Response } from 'express';
import { AuthenticatedRequest } from '@/types';
import systemSettingService from '@services/systemSettingService';
import { AppError } from '@utils/errors';
import logger from '@config/logger';

class SystemSettingController {
  /**
   * GET /api/system-settings/banner
   * Public — user cần đọc để hiển thị banner đúng
   */
  async getBanner(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const value = await systemSettingService.getBanner();
      res.status(200).json({ success: true, data: { value } });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.getBanner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * PUT /api/system-settings/banner
   * Admin only — đổi banner toàn hệ thống + broadcast WS
   */
  async setBanner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value } = req.body as { value: string };
      if (!value) {
        res.status(400).json({ success: false, message: 'Thiếu trường value' });
        return;
      }
      const updatedBy = req.user?.id;
      const result = await systemSettingService.setBanner(value, updatedBy);
      res.status(200).json({ success: true, data: { value: result } });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else if (error instanceof Error && error.message.startsWith('Invalid banner value')) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.setBanner error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * GET /api/system-settings/slogan
   * Public — lấy slogan hiện tại (có thể rỗng)
   */
  async getSlogan(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const value = await systemSettingService.getSlogan();
      res.status(200).json({ success: true, data: { value } });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.getSlogan error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * PUT /api/system-settings/slogan
   * Admin only — đổi slogan + broadcast WebSocket realtime. Cho phép value rỗng (xoá slogan).
   */
  async setSlogan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value } = req.body as { value?: string };
      const updatedBy = req.user?.id;
      const result = await systemSettingService.setSlogan(value ?? '', updatedBy);
      res.status(200).json({ success: true, data: { value: result } });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.setSlogan error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }
}

export default new SystemSettingController();
