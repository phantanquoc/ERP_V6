import { Router } from 'express';
import productionReportController from '@controllers/productionReportController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/production-reports - Get all production reports
router.get('/', productionReportController.getAllProductionReports);

// GET /api/production-reports/:id - Get production report by ID
router.get('/:id', productionReportController.getProductionReportById);

// POST /api/production-reports - Create new production report
router.post('/', productionReportController.createProductionReport);

// PUT /api/production-reports/:id - Update production report
router.put('/:id', productionReportController.updateProductionReport);

// DELETE /api/production-reports/:id - Delete production report
router.delete('/:id', productionReportController.deleteProductionReport);

export default router;

