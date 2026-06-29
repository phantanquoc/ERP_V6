import { Router } from 'express';
import exportCostController from '../controllers/exportCostController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET list — all authenticated roles
router.get('/', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), exportCostController.getAllExportCosts);

// GET Excel export — all authenticated roles
router.get('/export/excel', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), exportCostController.exportToExcel);

// GET by ID — all authenticated roles
router.get('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), exportCostController.getExportCostById);

// POST create — ADMIN and DEPARTMENT_HEAD only
router.post('/', authorize('ADMIN', 'DEPARTMENT_HEAD'), exportCostController.createExportCost);

// PATCH update — ADMIN and DEPARTMENT_HEAD only
router.patch('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD'), exportCostController.updateExportCost);

// PUT update (legacy support) — ADMIN and DEPARTMENT_HEAD only
router.put('/:id', authorize('ADMIN', 'DEPARTMENT_HEAD'), exportCostController.updateExportCost);

// DELETE — ADMIN only
router.delete('/:id', authorize('ADMIN'), exportCostController.deleteExportCost);

export default router;
