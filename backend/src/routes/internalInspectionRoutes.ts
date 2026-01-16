import { Router } from 'express';
import internalInspectionController from '@controllers/internalInspectionController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// Get all inspections
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res) => internalInspectionController.getAllInspections(req, res)
);

// Get inspection by ID
router.get(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  (req, res) => internalInspectionController.getInspectionById(req, res)
);

// Create inspection
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res) => internalInspectionController.createInspection(req, res)
);

// Update inspection
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res) => internalInspectionController.updateInspection(req, res)
);

// Delete inspection
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  (req, res) => internalInspectionController.deleteInspection(req, res)
);

export default router;

