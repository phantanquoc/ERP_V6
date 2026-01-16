import { Router } from 'express';
import finishedProductController from '@controllers/finishedProductController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/finished-products - Get all finished products
router.get('/', finishedProductController.getAllFinishedProducts);

// GET /api/finished-products/:id - Get finished product by ID
router.get('/:id', finishedProductController.getFinishedProductById);

// POST /api/finished-products - Create new finished product
router.post('/', finishedProductController.createFinishedProduct);

// PATCH /api/finished-products/:id - Update finished product
router.patch('/:id', finishedProductController.updateFinishedProduct);

// DELETE /api/finished-products/:id - Delete finished product
router.delete('/:id', finishedProductController.deleteFinishedProduct);

export default router;

