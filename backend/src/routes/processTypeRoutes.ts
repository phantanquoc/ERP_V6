import { Router } from 'express';
import processTypeController from '@controllers/processTypeController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read endpoints — any authenticated user
router.get('/', processTypeController.getAll);
router.get('/:id', processTypeController.getById);

// Mutations — ADMIN or DEPARTMENT_HEAD (controller enforces DEPT_QUALITY via assertDepartment)
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processTypeController.create
);

router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processTypeController.update
);

router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processTypeController.remove
);

export default router;
