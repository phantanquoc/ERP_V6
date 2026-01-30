import express from 'express';
import productionProcessController from '../controllers/productionProcessController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/production-processes - Get all production processes
router.get('/', productionProcessController.getAllProductionProcesses);

// GET /api/production-processes/:id - Get production process by ID
router.get('/:id', productionProcessController.getProductionProcessById);

// POST /api/production-processes - Create production process
router.post('/', productionProcessController.createProductionProcess);

// PUT /api/production-processes/:id - Update production process
router.put('/:id', productionProcessController.updateProductionProcess);

// POST /api/production-processes/:id/sync - Sync production process from template
router.post('/:id/sync', productionProcessController.syncFromTemplate);

// DELETE /api/production-processes/:id - Delete production process
router.delete('/:id', productionProcessController.deleteProductionProcess);

export default router;

