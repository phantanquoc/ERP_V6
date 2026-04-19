import { Request, Response, NextFunction } from 'express';
import systemSettingsService from '@services/systemSettingsService';
import { NotificationRoutingEvent } from '@types';

interface AuthenticatedRequest extends Request {
  user?: any;
}

class SystemSettingsController {
  async getSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await systemSettingsService.getSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { activeTheme, slogan, notificationSettings } = req.body;
      const updatedBy = req.user?.userId || req.user?.id || '';
      const settings = await systemSettingsService.updateSettings(
        { activeTheme, slogan, notificationSettings },
        updatedBy
      );
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateRoutingRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { eventKey } = req.params;
      const { rule } = req.body;
      const updatedBy = req.user?.userId || req.user?.id || '';
      const settings = await systemSettingsService.updateNotificationRoutingRule(
        eventKey as NotificationRoutingEvent,
        rule,
        updatedBy
      );
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notificationSettings = await systemSettingsService.getNotificationSettings();
      res.json({ success: true, data: notificationSettings });
    } catch (error) {
      next(error);
    }
  }
}

export default new SystemSettingsController();

