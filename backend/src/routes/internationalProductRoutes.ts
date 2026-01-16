import { Router } from 'express';
import internationalProductController from '@controllers/internationalProductController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', internationalProductController.getAllProducts);
router.get('/generate-code', internationalProductController.generateProductCode);
router.get('/code/:code', internationalProductController.getProductByCode);
router.get('/:id', internationalProductController.getProductById);

// POST routes - require ADMIN or DEPARTMENT_HEAD role
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.createProduct
);

// PATCH routes - require ADMIN or DEPARTMENT_HEAD role
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  internationalProductController.updateProduct
);

// DELETE routes - require ADMIN role only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  internationalProductController.deleteProduct
);

export default router;

