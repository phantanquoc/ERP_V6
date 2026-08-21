import { Router } from 'express';
import auditLogController from '@controllers/auditLogController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';

const router = Router();

// GET /api/audit-logs — list audit log entries (ADMIN and DEPARTMENT_HEAD only)
router.get(
  '/',
  authenticate,
  requireRule('audit-logs', 'READ'),
  auditLogController.listAudit.bind(auditLogController)
);

export default router;
