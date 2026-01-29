import { Router } from 'express';
import systemOperationController from '@controllers/systemOperationController';
import { authenticate, authorize } from '@middlewares/auth';
import { zodValidate } from '@middlewares/zodValidation';
import { createSystemOperationSchema, createBulkSystemOperationSchema, updateSystemOperationSchema } from '@schemas';
import { UserRole } from '@types';

const router = Router();

// All system operation routes require authentication
router.use(authenticate);

// Get all system operations
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getAllSystemOperations
);

// Get system operation by ID
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getSystemOperationById
);

// Get system operations by ma chien
router.get(
  '/ma-chien/:maChien',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  systemOperationController.getSystemOperationsByMaChien
);

// Create bulk system operations for all machines
router.post(
  '/bulk',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(createBulkSystemOperationSchema),
  systemOperationController.createBulkSystemOperations
);

// Create system operation
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(createSystemOperationSchema),
  systemOperationController.createSystemOperation
);

// Update system operation
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  zodValidate(updateSystemOperationSchema),
  systemOperationController.updateSystemOperation
);

// Delete system operation
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  systemOperationController.deleteSystemOperation
);

export default router;

