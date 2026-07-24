import { Router } from 'express';
import soakingPlanController from '@controllers/soakingPlanController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List plannable orders (orders with trangThaiSanXuat = CHO_LEN_KE_HOACH)
router.get(
  '/plannable-orders',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  soakingPlanController.listPlannableOrders
);

// Get active plans by product ID (used by worker evaluation screen)
router.get(
  '/active-by-product/:productId',
  soakingPlanController.getActiveByProductId
);

// List soaking plans (with filters)
router.get(
  '/',
  soakingPlanController.listSoakingPlans
);

// Create soaking plan
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  soakingPlanController.createSoakingPlan
);

// Update soaking plan
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  soakingPlanController.updateSoakingPlan
);

// Cancel soaking plan
router.patch(
  '/:id/cancel',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  soakingPlanController.cancelSoakingPlan
);

export default router;
