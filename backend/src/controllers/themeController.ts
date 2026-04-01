import { Request, Response, NextFunction } from 'express';
import themeService from '@services/themeService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class ThemeController {
  /** GET /api/themes — Lấy tất cả themes active */
  async getAllThemes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const themes = await themeService.getAllThemes();
      res.json({ success: true, data: themes } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/themes/active — Lấy theme đang áp dụng hôm nay */
  async getActiveTheme(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theme = await themeService.getActiveTheme();
      res.json({ success: true, data: theme } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/themes/:id */
  async getThemeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const theme = await themeService.getThemeById(req.params.id as string);
      res.json({ success: true, data: theme } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/themes — Admin only */
  async createTheme(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const theme = await themeService.createTheme(req.body);
      res.status(201).json({ success: true, data: theme, message: 'Theme created' } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/themes/:id — Admin only */
  async updateTheme(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const theme = await themeService.updateTheme(req.params.id as string, req.body);
      res.json({ success: true, data: theme, message: 'Theme updated' } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/themes/:id — Admin only */
  async deleteTheme(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await themeService.deleteTheme(req.params.id as string);
      res.json({ success: true, message: 'Theme deleted' } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new ThemeController();
