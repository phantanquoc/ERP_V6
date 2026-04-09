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

  // ─── Attendance Reminder Settings ───────────────────────────────────────────

  /**
   * GET /api/system-settings/attendance-reminder
   * Authenticated — lấy cài đặt nhắc nhở chấm công hiện tại
   */
  async getAttendanceReminder(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const settings = await systemSettingService.getAttendanceReminderSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.getAttendanceReminder error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }

  /**
   * PUT /api/system-settings/attendance-reminder
   * Admin only — cập nhật cài đặt nhắc nhở chấm công
   */
  async setAttendanceReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { checkinReminder, checkoutReminder, autoAbsent } = req.body as {
        checkinReminder?: string;
        checkoutReminder?: string;
        autoAbsent?: string;
      };

      // Validate HH:mm format
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      for (const [name, val] of [
        ['checkinReminder', checkinReminder],
        ['checkoutReminder', checkoutReminder],
        ['autoAbsent', autoAbsent],
      ] as const) {
        if (val && !timeRegex.test(val)) {
          res.status(400).json({
            success: false,
            message: `${name} phải đúng định dạng HH:mm (ví dụ: 08:30)`,
          });
          return;
        }
      }

      const updatedBy = req.user?.id;
      const result = await systemSettingService.setAttendanceReminderSettings(
        { checkinReminder, checkoutReminder, autoAbsent },
        updatedBy,
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Cập nhật cài đặt nhắc nhở chấm công thành công',
      });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ success: false, message: error.message });
      } else {
        logger.error('SystemSettingController.setAttendanceReminder error:', error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
      }
    }
  }
}

export default new SystemSettingController();
