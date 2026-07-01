import { Router } from 'express';
import faultRecordController from '@controllers/faultRecordController';
import { authenticate } from '@middlewares/auth';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { requireTechnicalAccess, requireTechnicalAccessWithRoles, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';
import { UserRole } from '@types';

const router = Router();
const upload = createSingleUploadMiddleware('fault-records');
const technicalAccess = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL);
const markResolvedAccess = requireTechnicalAccessWithRoles(
  [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD],
  TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL
);
const markRecurredAccess = requireTechnicalAccessWithRoles(
  [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
  TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL
);

router.use(authenticate);

// Read-only + create: open to all authenticated users
router.get('/', faultRecordController.getAll.bind(faultRecordController));
router.get('/export/excel', faultRecordController.exportExcel.bind(faultRecordController));
// New aggregate endpoints must come BEFORE /:id to avoid route shadowing
router.get('/recurrence', faultRecordController.checkRecurrence.bind(faultRecordController));
router.get('/stats', faultRecordController.getStats.bind(faultRecordController));
router.get('/heatmap', faultRecordController.getHeatmap.bind(faultRecordController));
router.get('/typeahead', faultRecordController.getForTypeahead.bind(faultRecordController));
router.get('/:id', faultRecordController.getById.bind(faultRecordController));
router.post('/', upload, faultRecordController.create.bind(faultRecordController));

// ── New lifecycle endpoints (Task 4.3) ────────────────────────────────────────
// POST /:id/mark-resolved — ADMIN, DEPARTMENT_HEAD, TEAM_LEAD in technical/mechanical
router.post('/:id/mark-resolved', markResolvedAccess, faultRecordController.markResolved.bind(faultRecordController));
// POST /:id/mark-recurred — ADMIN, DEPARTMENT_HEAD in technical/mechanical
router.post('/:id/mark-recurred', markRecurredAccess, faultRecordController.markRecurred.bind(faultRecordController));
// GET /:id/status-history — any authenticated user
router.get('/:id/status-history', faultRecordController.getStatusHistory.bind(faultRecordController));

// Mutating operations remain restricted to technical-mechanical users
router.put('/:id', technicalAccess, upload, faultRecordController.update.bind(faultRecordController));
router.delete('/:id', technicalAccess, faultRecordController.remove.bind(faultRecordController));

export default router;
