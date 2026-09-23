import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineSystemDetailService from '@services/machineSystemDetailService';
import { getFileUrl } from '@middlewares/upload';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  return value === true || value === 'true';
};

// Whitelist for mass-assignment protection
const ALLOWED_FIELDS = [
  'machineSystemId',
  'loaiChiTiet',
  'tenChiTiet',
  'moTa',
  'viTri',
  'maNguoiPhuTrach',
  'nguoiPhuTrach',
  'parentDetailId',
  'thuTu',
] as const;

const ADMIN_ONLY_FIELDS = ['maChiTiet', 'hoatDong', 'trangThai'] as const;

function pickAllowed(body: Record<string, unknown>, isAdmin: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_FIELDS) if (k in body) out[k] = body[k];
  if (isAdmin) {
    for (const k of ADMIN_ONLY_FIELDS) if (k in body) out[k] = body[k];
  }
  return out;
}

class MachineSystemDetailController {
  async generateCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await machineSystemDetailService.generateCode(req.query.loaiChiTiet as string);
      res.json({ success: true, data: { code } });
    } catch (error) {
      next(error);
    }
  }

  async getTree(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await machineSystemDetailService.getTree(req.query.machineSystemId as string);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await machineSystemDetailService.list({
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 10,
        search: req.query.search as string | undefined,
        machineSystemId: req.query.machineSystemId as string | undefined,
        loaiChiTiet: req.query.loaiChiTiet as string | undefined,
        hoatDong: parseBoolean(req.query.hoatDong),
        trangThai: req.query.trangThai as string | undefined,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.getById(req.params.id);
      res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      const detail = await machineSystemDetailService.create({
        ...picked,
        parentDetailId: (picked.parentDetailId as string) || null,
        thuTu: picked.thuTu !== undefined ? parseInt(String(picked.thuTu), 10) : undefined,
        hoatDong: isAdmin ? parseBoolean(picked.hoatDong) : undefined,
        fileDinhKem: req.file ? getFileUrl('machine-system-details', req.file.filename) : undefined,
      } as Parameters<typeof machineSystemDetailService.create>[0]);
      if (detail?.id) {
        try {
          await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_DETAIL_CREATED, {
            actorUserId: req.user?.id,
            entityId: detail.id,
            metadata: { maChiTiet: (detail as any)?.maChiTiet, tenChiTiet: (detail as any)?.tenChiTiet },
          });
        } catch (e) { logger.warn('[MachineSystemDetailController] notify MACHINE_SYSTEM_DETAIL_CREATED failed', e); }
      }
      res.status(201).json({ success: true, data: detail, message: 'Tạo chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as unknown as { user?: { role?: string } }).user?.role === 'ADMIN';
      const picked = pickAllowed(req.body as Record<string, unknown>, isAdmin);
      // parentDetailId empty string -> null
      if ('parentDetailId' in picked && picked.parentDetailId === '') picked.parentDetailId = null;
      const payload: Record<string, unknown> = {
        ...picked,
        thuTu: picked.thuTu !== undefined ? parseInt(String(picked.thuTu), 10) : undefined,
        fileDinhKem: req.file ? getFileUrl('machine-system-details', req.file.filename) : undefined,
      };
      if ('hoatDong' in picked) payload.hoatDong = parseBoolean(picked.hoatDong);
      // Remove undefined to avoid overwriting with undefined
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const detail = await machineSystemDetailService.update(req.params.id, payload as Parameters<typeof machineSystemDetailService.update>[1]);
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_DETAIL_UPDATED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: { maChiTiet: (detail as any)?.maChiTiet, tenChiTiet: (detail as any)?.tenChiTiet },
        });
      } catch (e) { logger.warn('[MachineSystemDetailController] notify MACHINE_SYSTEM_DETAIL_UPDATED failed', e); }
      res.json({ success: true, data: detail, message: 'Cập nhật chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await machineSystemDetailService.deactivate(req.params.id);
      res.json({ success: true, data: detail, message: 'Ngừng hoạt động chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let meta: Record<string, unknown> = {};
      try { const d = await machineSystemDetailService.getById(req.params.id); meta = { maChiTiet: (d as any)?.maChiTiet, tenChiTiet: (d as any)?.tenChiTiet }; } catch (_) { /* ignore */ }
      await machineSystemDetailService.delete(req.params.id);
      try {
        await notificationService.notify(NotificationEvent.MACHINE_SYSTEM_DETAIL_DELETED, {
          actorUserId: req.user?.id,
          entityId: req.params.id,
          metadata: meta,
        });
      } catch (e) { logger.warn('[MachineSystemDetailController] notify MACHINE_SYSTEM_DETAIL_DELETED failed', e); }
      res.json({ success: true, message: 'Xóa chi tiết hệ thống máy thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineSystemDetailController();
