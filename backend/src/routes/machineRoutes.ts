import { Router } from 'express';
import machineController from '@controllers/machineController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET routes - accessible to all authenticated users
router.get('/', machineController.getAllMachines);
router.get('/generate-code', machineController.generateMachineCode);
router.get('/:id', machineController.getMachineById);

// POST routes - accessible to ADMIN and DEPARTMENT_HEAD
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  machineController.createMachine
);

// PATCH routes - accessible to ADMIN and DEPARTMENT_HEAD
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  machineController.updateMachine
);

// DELETE routes - accessible to ADMIN only
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  machineController.deleteMachine
);

export default router;

