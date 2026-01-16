import { Router } from 'express';
import positionController from '@controllers/positionController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All position routes require authentication
router.use(authenticate);

// Get all positions (with RBAC + ABAC)
router.get('/',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.getAllPositions
);

// Get position by ID (with RBAC + ABAC)
router.get('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.getPositionById
);

// Create position (Admin, Department Head only)
router.post('/', authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD), positionController.createPosition);

// Update position (Admin, Department Head only)
router.patch('/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionController.updatePosition
);

// Delete position (Admin only)
router.delete('/:id', authorize(UserRole.ADMIN), positionController.deletePosition);

export default router;

