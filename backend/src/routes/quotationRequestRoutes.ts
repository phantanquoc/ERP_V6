import { Router } from 'express';
import quotationRequestController from '@controllers/quotationRequestController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', quotationRequestController.getAllQuotationRequests);
router.get('/generate-code', quotationRequestController.generateQuotationRequestCode);
router.get('/code/:code', quotationRequestController.getQuotationRequestByCode);
router.get('/:id', quotationRequestController.getQuotationRequestById);

// POST routes - require ADMIN or DEPARTMENT_HEAD role
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE),
  quotationRequestController.createQuotationRequest
);

// PATCH routes - require ADMIN or DEPARTMENT_HEAD role
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.EMPLOYEE),
  quotationRequestController.updateQuotationRequest
);

// DELETE routes - require ADMIN role only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  quotationRequestController.deleteQuotationRequest
);

export default router;

