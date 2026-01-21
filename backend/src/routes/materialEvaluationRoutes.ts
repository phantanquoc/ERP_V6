import { Router } from 'express';
import materialEvaluationController from '@controllers/materialEvaluationController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import { createSingleUploadMiddleware } from '@middlewares/upload';

const router = Router();

// Upload middleware for material evaluations
const uploadMaterialEvaluation = createSingleUploadMiddleware('material-evaluations');

// All material evaluation routes require authentication
router.use(authenticate);

// Get all material evaluations
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getAllMaterialEvaluations
);

// Generate ma chien
router.post(
  '/generate-code',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.generateMaChien
);

// Get material evaluation by ID
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getMaterialEvaluationById
);

// Get material evaluation by ma chien
router.get(
  '/ma-chien/:maChien',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  materialEvaluationController.getMaterialEvaluationByMaChien
);

// Create material evaluation
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  uploadMaterialEvaluation,
  materialEvaluationController.createMaterialEvaluation
);

// Update material evaluation
router.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  uploadMaterialEvaluation,
  materialEvaluationController.updateMaterialEvaluation
);

// Delete material evaluation
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  materialEvaluationController.deleteMaterialEvaluation
);

export default router;

