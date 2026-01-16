import { Router } from 'express';
import quotationController from '@controllers/quotationController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', quotationController.getAllQuotations);
router.get('/generate-code', quotationController.generateQuotationCode);
router.get('/:id', quotationController.getQuotationById);

// POST routes - accessible to ADMIN and DEPARTMENT_HEAD
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  quotationController.createQuotation
);

// PATCH routes - accessible to ADMIN and DEPARTMENT_HEAD
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  quotationController.updateQuotation
);

// DELETE routes - accessible to ADMIN only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  quotationController.deleteQuotation
);

export default router;

