import { Router } from 'express';
import orderController from '@controllers/orderController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', orderController.getAllOrders);
router.get('/generate-code', orderController.generateOrderCode);
router.get('/:id', orderController.getOrderById);

// POST routes - accessible to ADMIN and DEPARTMENT_HEAD
router.post(
  '/from-quotation',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  orderController.createOrderFromQuotation
);

// PATCH routes - accessible to ADMIN and DEPARTMENT_HEAD
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  orderController.updateOrder
);

router.patch(
  '/items/:itemId',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  orderController.updateOrderItem
);

// DELETE routes - accessible to ADMIN only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  orderController.deleteOrder
);

export default router;

