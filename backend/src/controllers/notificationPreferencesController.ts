import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import notificationPreferencesService from '@services/notificationPreferencesService';
import { ValidationError } from '@utils/errors';

const updatePreferencesSchema = z.object({
  items: z.array(
    z.object({
      notificationType: z.string().min(1),
      muted: z.boolean(),
    })
  ).min(1),
});

export class NotificationPreferencesController {
  /**
   * GET /api/notifications/preferences
   * Returns the current user's notification preferences.
   */
  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const data = await notificationPreferencesService.getForUser(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/preferences
   * Upsert notification preferences for the current user.
   */
  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const parsed = updatePreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Dữ liệu không hợp lệ: ' + parsed.error.message);
      }

      const data = await notificationPreferencesService.updateMany(userId, parsed.data.items);
      res.json({ success: true, message: 'Cập nhật thành công', data });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationPreferencesController();
