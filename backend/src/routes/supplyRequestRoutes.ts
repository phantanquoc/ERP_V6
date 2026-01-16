import { Router } from 'express';
import supplyRequestController from '@controllers/supplyRequestController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all supply requests (all authenticated users can view)
router.get('/', supplyRequestController.getAllSupplyRequests);

// Get supply request by ID (all authenticated users can view)
router.get('/:id', supplyRequestController.getSupplyRequestById);

// Create supply request (all authenticated users can create)
router.post(
  '/',
  supplyRequestController.createSupplyRequest
);

// Update supply request (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, or owner)
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  supplyRequestController.updateSupplyRequest
);

// Delete supply request (ADMIN only)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  supplyRequestController.deleteSupplyRequest
);

export default router;

