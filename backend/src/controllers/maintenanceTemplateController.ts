import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenanceTemplateService from '@services/maintenanceTemplateService';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
};

const ALLOWED_FIELDS = ['machineSystemDetailId', 'noiDung', 'tanSuat', 'toThucHien'] as const;
const ADMIN_ONLY_FIELDS = ['hoatDong'] as const;

function pickAllowed(body: Record<string, unknown>, isAdmin: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) if (k in body) out[k] = body[k];
  if (isAdmin) for (const k of ADMIN_ONLY_FIELDS) if (k in body) out[k] = body[k];
  return out;
}

class MaintenanceTemplateController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await maintenanceTemplateService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 50,
        search: req.query.search as string | undefined,
        machineSystemDetailId: req.query.machineSystemDetailId as string | undefined,
        machineSystemId: req.query.machineSystemId as string | undefined,
        hoatDong: parseBoolean(req.query.hoatDong),
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const template = await maintenanceTemplateService.getById(req.params.id);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      const template = await maintenanceTemplateService.create(picked as unknown as Parameters<typeof maintenanceTemplateService.create>[0]);
      res.status(201).json({ success: true, data: template, message: 'Tạo template bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      if ('hoatDong' in picked) (picked as Record<string, unknown>).hoatDong = parseBoolean(picked.hoatDong);
      const template = await maintenanceTemplateService.update(req.params.id, picked as Parameters<typeof maintenanceTemplateService.update>[1]);
      res.json({ success: true, data: template, message: 'Cập nhật template thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await maintenanceTemplateService.delete(req.params.id);
      res.json({ success: true, message: 'Xóa template thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MaintenanceTemplateController();
