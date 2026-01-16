import { Router } from 'express';
import processController from '@controllers/processController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', processController.getAllProcesses);
router.get('/generate-code', processController.generateProcessCode);
router.get('/:id', processController.getProcessById);

// POST routes - accessible to ADMIN and DEPARTMENT_HEAD
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.createProcess
);

// PUT routes - accessible to ADMIN and DEPARTMENT_HEAD
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.updateProcess
);

// DELETE routes - accessible to ADMIN only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  processController.deleteProcess
);

// ==================== FLOWCHART ROUTES ====================

// GET flowchart by process ID - accessible to all authenticated users
router.get('/:processId/flowchart', processController.getFlowchart);

// POST create flowchart - accessible to ADMIN and DEPARTMENT_HEAD
router.post(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.createFlowchart
);

// PUT update flowchart - accessible to ADMIN and DEPARTMENT_HEAD
router.put(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  processController.updateFlowchart
);

// DELETE flowchart - accessible to ADMIN only
router.delete(
  '/:processId/flowchart',
  authorize(UserRole.ADMIN),
  processController.deleteFlowchart
);

export default router;

