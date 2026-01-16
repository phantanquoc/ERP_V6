import { Router } from 'express';
import exportCostController from '../controllers/exportCostController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/export-costs - Get all export costs
router.get('/', exportCostController.getAllExportCosts);

// GET /api/export-costs/:id - Get export cost by ID
router.get('/:id', exportCostController.getExportCostById);

// POST /api/export-costs - Create export cost
router.post('/', exportCostController.createExportCost);

// PUT /api/export-costs/:id - Update export cost
router.put('/:id', exportCostController.updateExportCost);

// DELETE /api/export-costs/:id - Delete export cost
router.delete('/:id', exportCostController.deleteExportCost);

export default router;

