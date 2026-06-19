import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import machineStatusLogService from '@services/machineStatusLogService';
import { MachineStatus } from '@prisma/client';

class MachineStatusLogController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const trangThaiMoi = req.query.trangThaiMoi as MachineStatus | undefined;
      const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
      const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;

      const result = await machineStatusLogService.getAllLogs({
        page,
        limit,
        machineSystemId,
        trangThaiMoi,
        fromDate,
        toDate,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const log = await machineStatusLogService.getLogById(req.params.id);
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineStatusLogController();
