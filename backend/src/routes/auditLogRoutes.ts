import { Router } from 'express';
import auditLogController from '@controllers/auditLogController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// GET /api/audit-logs — list audit log entries (ADMIN and DEPARTMENT_HEAD only)
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  auditLogController.listAudit.bind(auditLogController)
);

export default router;
