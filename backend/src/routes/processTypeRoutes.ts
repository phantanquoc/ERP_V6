import { Router } from 'express';
import processTypeController from '@controllers/processTypeController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
const router = Router();

// All routes require authentication
router.use(authenticate);

// Read endpoints — any authenticated user
router.get('/', processTypeController.getAll);
router.get('/:id', processTypeController.getById);

// Mutations — ADMIN or DEPARTMENT_HEAD (controller enforces DEPT_QUALITY via assertDepartment)
router.post(
  '/',
  requireRule('process-types', 'READ'),
  processTypeController.create
);

router.patch(
  '/:id',
  requireRule('process-types', 'UPDATE'),
  processTypeController.update
);

router.delete(
  '/:id',
  requireRule('process-types', 'DELETE'),
  processTypeController.remove
);

export default router;
