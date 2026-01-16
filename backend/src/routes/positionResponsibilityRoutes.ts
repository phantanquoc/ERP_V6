import { Router } from 'express';
import positionResponsibilityController from '@controllers/positionResponsibilityController';
import { authenticate, authorize } from '@middlewares/auth';
import { checkAccess } from '@middlewares/rbacAbac';
import { UserRole } from '@types';

const router = Router();

// All responsibility routes require authentication
router.use(authenticate);

// Get all responsibilities for a position
router.get('/:positionId/responsibilities',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionResponsibilityController.getAllResponsibilities
);

// Get responsibility by ID
router.get('/responsibility/:id',
  checkAccess({
    allowedRoles: [UserRole.ADMIN, UserRole.DEPARTMENT_HEAD],
    checkDepartment: true,
  }),
  positionResponsibilityController.getResponsibilityById
);

// Create responsibility for a position
router.post('/:positionId/responsibilities',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  positionResponsibilityController.createResponsibility
);

// Update responsibility
router.patch('/responsibility/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  positionResponsibilityController.updateResponsibility
);

// Delete responsibility
router.delete('/responsibility/:id',
  authorize(UserRole.ADMIN),
  positionResponsibilityController.deleteResponsibility
);

export default router;

