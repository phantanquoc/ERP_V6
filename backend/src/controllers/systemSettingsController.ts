import { Request, Response, NextFunction } from 'express';
import systemSettingsService from '@services/systemSettingsService';

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
      const { activeTheme, slogan } = req.body;
      const updatedBy = req.user?.userId || req.user?.id || '';
      const settings = await systemSettingsService.updateSettings({ activeTheme, slogan }, updatedBy);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }
}

export default new SystemSettingsController();
