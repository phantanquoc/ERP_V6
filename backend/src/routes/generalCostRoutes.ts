import { Router } from 'express';
import generalCostController from '../controllers/generalCostController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/general-costs - Get all general costs
router.get('/', generalCostController.getAllGeneralCosts);

// GET /api/general-costs/:id - Get general cost by ID
router.get('/:id', generalCostController.getGeneralCostById);

// POST /api/general-costs - Create general cost
router.post('/', generalCostController.createGeneralCost);

// PUT /api/general-costs/:id - Update general cost
router.put('/:id', generalCostController.updateGeneralCost);

// DELETE /api/general-costs/:id - Delete general cost
router.delete('/:id', generalCostController.deleteGeneralCost);

export default router;

