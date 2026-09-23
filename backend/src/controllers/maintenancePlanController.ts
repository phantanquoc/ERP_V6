import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import maintenancePlanService from '@services/maintenancePlanService';
import { getFileUrl } from '@middlewares/upload';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import { ValidationError } from '@utils/errors';
import logger from '@config/logger';

const ALLOWED_FIELDS = ['machineSystemId', 'nam', 'nguoiLap', 'ngayLap', 'ghiChu', 'items'] as const;
const ADMIN_ONLY_FIELDS = ['maKeHoach', 'trangThai'] as const;

function pickAllowed(body: Record<string, unknown>, isAdmin: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) if (k in body) out[k] = body[k];
  if (isAdmin) for (const k of ADMIN_ONLY_FIELDS) if (k in body) out[k] = body[k];
  return out;
}

function safeParseJson(value: unknown, field: string): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { throw new ValidationError(`${field} không hợp lệ (JSON parse thất bại)`); }
}

function parseIntStrict(raw: unknown, field: string): number {
  const n = parseInt(String(raw), 10);
  if (isNaN(n)) throw new ValidationError(`${field} phải là số nguyên hợp lệ`);
  return n;
}

function parseNguoiPhu(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    const parsed = safeParseJson(raw, 'nguoiPhu');
    if (!Array.isArray(parsed)) throw new ValidationError('nguoiPhu phải là mảng');
    return parsed as string[];
  }
  throw new ValidationError('nguoiPhu không hợp lệ');
}

class MaintenancePlanController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await maintenancePlanService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        machineSystemId: req.query.machineSystemId as string | undefined,
        nam: req.query.nam ? parseInt(req.query.nam as string, 10) : undefined,
        trangThai: req.query.trangThai as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await maintenancePlanService.getById(req.params.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  async generateCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await maintenancePlanService.generateCode();
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      let items: unknown = picked.items;
      if (typeof picked.items === 'string') items = safeParseJson(picked.items, 'items');
      const namRaw = picked.nam ?? (req.body as Record<string, unknown>).nam;
      const nam = namRaw !== undefined ? parseIntStrict(namRaw, 'nam') : undefined;
      const plan = await maintenancePlanService.create({
        ...(picked as Record<string, unknown>),
        nam: nam as number,
        items: items as any,
        fileDinhKem: req.file ? getFileUrl('maintenance-plans', req.file.filename) : undefined,
        userId: req.user?.id,
      } as Parameters<typeof maintenancePlanService.create>[0]);
      if (plan?.id) {
        try {
          await notificationService.notify(NotificationEvent.MAINTENANCE_PLAN_CREATED, {
            actorUserId: req.user?.id,
            entityId: plan.id,
            metadata: { maKeHoach: (plan as any)?.maKeHoach, nam: (plan as any)?.nam },
          });
        } catch (e) { logger.warn('[MaintenancePlanController] notify MAINTENANCE_PLAN_CREATED failed', e); }
      } else {
        logger.warn('[MaintenancePlanController] MAINTENANCE_PLAN_CREATED skipped: missing plan.id');
      }
      res.status(201).json({ success: true, data: plan, message: 'Tạo kế hoạch bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      let items: unknown = picked.items;
      if (typeof picked.items === 'string') items = safeParseJson(picked.items, 'items');
      // Only include fileDinhKem from body if explicitly picked; file upload takes precedence
      const plan = await maintenancePlanService.update(req.params.id, {
        ...(picked as Record<string, unknown>),
        ...(items !== undefined ? { items: items as any } : {}),
        fileDinhKem: req.file ? getFileUrl('maintenance-plans', req.file.filename) : undefined,
      } as Parameters<typeof maintenancePlanService.update>[1]);
      try {
        await notificationService.notify(NotificationEvent.MAINTENANCE_PLAN_UPDATED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maKeHoach: (plan as any)?.maKeHoach },
        });
      } catch (e) { logger.warn('[MaintenancePlanController] notify MAINTENANCE_PLAN_UPDATED failed', e); }
      res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch thành công' });
    } catch (error) {
      next(error);
    }
  }

  async toggleMonth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = parseIntStrict(req.body.month, 'month');
      const lanThu = req.body.lanThu !== undefined ? parseIntStrict(req.body.lanThu, 'lanThu') : 1;
      const ghiChu = req.body.ghiChu as string | undefined;
      const nguoiThucHien = req.body.nguoiThucHien as string | undefined;
      const nguoiPhu = parseNguoiPhu(req.body.nguoiPhu);
      const item = await maintenancePlanService.toggleMonth(req.params.id, req.params.itemId, month, lanThu, ghiChu, nguoiThucHien, nguoiPhu);
      try {
        const planId = req.params.id;
        let maKeHoach: string | undefined;
        try { const p = await maintenancePlanService.getById(planId); maKeHoach = (p as any)?.maKeHoach; } catch (_) { /* ignore */ }
        await notificationService.notify(NotificationEvent.MAINTENANCE_PLAN_MONTH_TOGGLED, {
          actorUserId: req.user?.id,
          entityId: planId,
          metadata: { maKeHoach, month, itemId: req.params.itemId },
        });
      } catch (e) { logger.warn('[MaintenancePlanController] notify MAINTENANCE_PLAN_MONTH_TOGGLED failed', e); }
      res.json({ success: true, data: item, message: 'Cập nhật tiến độ thành công' });
    } catch (error) {
      next(error);
    }
  }

  async updateLogNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const nguoiPhu = parseNguoiPhu(req.body.nguoiPhu);
      const log = await maintenancePlanService.updateLogNote(req.params.logId, {
        ghiChu: req.body.ghiChu,
        nguoiThucHien: req.body.nguoiThucHien,
        nguoiPhu,
      });
      res.json({ success: true, data: log, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
      next(error);
    }
  }

  async syncDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const plan = await maintenancePlanService.syncDetails(id);
      try {
        await notificationService.notify(NotificationEvent.MAINTENANCE_PLAN_SYNCED, {
          actorUserId: req.user?.id,
          entityId: id,
          metadata: { maKeHoach: (plan as any)?.maKeHoach },
        });
      } catch (e) { logger.warn('[MaintenancePlanController] notify MAINTENANCE_PLAN_SYNCED failed', e); }
      res.json({ success: true, message: 'Đã đồng bộ linh kiện', data: plan });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let maKeHoach: string | undefined;
      try { const p = await maintenancePlanService.getById(req.params.id); maKeHoach = (p as any)?.maKeHoach; } catch (_) { /* ignore */ }
      await maintenancePlanService.delete(req.params.id);
      try {
        await notificationService.notify(NotificationEvent.MAINTENANCE_PLAN_DELETED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maKeHoach },
        });
      } catch (e) { logger.warn('[MaintenancePlanController] notify MAINTENANCE_PLAN_DELETED failed', e); }
      res.json({ success: true, message: 'Xóa kế hoạch bảo dưỡng thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MaintenancePlanController();
