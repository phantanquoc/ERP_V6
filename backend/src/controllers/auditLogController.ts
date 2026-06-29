import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '@types';
import auditLogService from '@services/auditLogService';

class AuditLogController {
  async listAudit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = [10, 20, 50, 100].includes(rawLimit) ? rawLimit : 20;
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;
      const action = req.query.action as string | undefined;
      const actorId = req.query.actorId as string | undefined;

      const result = await auditLogService.listAudit({ entityType, entityId, action, actorId, page, limit });

      const response: ApiResponse<any> = {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuditLogController();
