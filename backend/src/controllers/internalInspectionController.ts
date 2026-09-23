import { Request, Response, NextFunction } from 'express';
import internalInspectionService from '@services/internalInspectionService';
import type { AuthenticatedRequest } from '@types';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';

export class InternalInspectionController {
  async exportToExcel(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await internalInspectionService.exportToExcel();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=kiem-tra-noi-bo-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async getAllInspections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year, search } = req.query;

      let inspections;
      if (search) {
        inspections = await internalInspectionService.searchInspections(search as string);
      } else {
        inspections = await internalInspectionService.getAllInspections(
          month ? Number(month) : undefined,
          year ? Number(year) : undefined
        );
      }

      res.json({
        success: true,
        data: inspections,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getInspectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const inspection = await internalInspectionService.getInspectionById(id);

      res.json({
        success: true,
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      const authReq = req as unknown as AuthenticatedRequest;

      const inspection = await internalInspectionService.createInspection(data, authReq.user?.id);
      try {
        await notificationService.notify(NotificationEvent.INTERNAL_INSPECTION_CREATED, {
          actorUserId: authReq.user?.id,
          entityId: (inspection as any).id,
          metadata: { maKiemTra: (inspection as any).maKiemTra ?? (inspection as any).maChien ?? '', maChien: (inspection as any).maChien ?? '' },
        });
      } catch (e) { logger.warn('[InternalInspectionController] notify INTERNAL_INSPECTION_CREATED failed', e); }

      res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async updateInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = req.body;

      const inspection = await internalInspectionService.updateInspection(id, data);
      try {
        await notificationService.notify(NotificationEvent.INTERNAL_INSPECTION_UPDATED, {
          actorUserId: (req as any).user?.id,
          entityId: id,
          metadata: { maKiemTra: (inspection as any).maKiemTra ?? '', maChien: (inspection as any).maChien ?? '' },
        });
      } catch (e) { logger.warn('[InternalInspectionController] notify INTERNAL_INSPECTION_UPDATED failed', e); }

      res.json({
        success: true,
        message: 'Inspection updated successfully',
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async deleteInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      let _inspMeta: Record<string, unknown> = {};
      try { const _insp = await internalInspectionService.getInspectionById(id); _inspMeta = { maKiemTra: (_insp as any).maKiemTra ?? '', maChien: (_insp as any).maChien ?? '' }; } catch (_) {}
      await internalInspectionService.deleteInspection(id);
      try { await notificationService.notify(NotificationEvent.INTERNAL_INSPECTION_DELETED, { actorUserId: (req as any).user?.id, entityId: id, metadata: _inspMeta }); } catch (e) { logger.warn('[InternalInspectionController] notify INTERNAL_INSPECTION_DELETED failed', e); }

      res.json({
        success: true,
        message: 'Inspection deleted successfully',
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default new InternalInspectionController();

