import { Router } from 'express';
import materialStandardController from '@controllers/materialStandardController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All material standard routes require authentication
router.use(authenticate);

// Get all material standards
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  materialStandardController.getAllMaterialStandards
);

// Get material standard by ID
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  materialStandardController.getMaterialStandardById
);

// Generate material standard code
router.post(
  '/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.generateMaterialStandardCode
);

// Create material standard
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.createMaterialStandard
);

// Update material standard
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialStandardController.updateMaterialStandard
);

// Delete material standard
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  materialStandardController.deleteMaterialStandard
);

export default router;

