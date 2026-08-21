import { requireRule } from '@middlewares/requireRule';
import { Router } from 'express';
import exportCostController from '../controllers/exportCostController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET list — all authenticated roles
router.get('/', requireRule('export-costs', 'EXPORT'), exportCostController.getAllExportCosts);

// GET Excel export — all authenticated roles
router.get('/export/excel', requireRule('export-costs', 'EXPORT'), exportCostController.exportToExcel);

// GET by ID — all authenticated roles
router.get('/:id', requireRule('export-costs', 'EXPORT'), exportCostController.getExportCostById);

// POST create — ADMIN and DEPARTMENT_HEAD only
router.post('/', requireRule('export-costs', 'EXPORT'), exportCostController.createExportCost);

// PATCH update — ADMIN and DEPARTMENT_HEAD only
router.patch('/:id', requireRule('export-costs', 'CREATE'), exportCostController.updateExportCost);

// PUT update (legacy support) — ADMIN and DEPARTMENT_HEAD only
router.put('/:id', requireRule('export-costs', 'UPDATE'), exportCostController.updateExportCost);

// DELETE — ADMIN only
router.delete('/:id', requireRule('export-costs', 'UPDATE'), exportCostController.deleteExportCost);

export default router;
