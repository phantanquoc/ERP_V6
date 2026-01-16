import { Router } from 'express';
import employeeEvaluationController from '@controllers/employeeEvaluationController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// Get all employee evaluations for a specific month/year
router.get(
  '/evaluations',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  employeeEvaluationController.getEmployeeEvaluations
);

// Get evaluation details for a specific evaluation (for employee self-evaluation)
router.get(
  '/my-evaluation/:evaluationId',
  authenticate,
  authorize('EMPLOYEE'),
  employeeEvaluationController.getEvaluationDetails
);

// Get evaluation details for a specific evaluation (for HR/Manager)
router.get(
  '/evaluations/:evaluationId/details',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.getEvaluationDetails
);

// Get evaluation history for an employee
router.get(
  '/evaluations/:evaluationId/history',
  authenticate,
  authorize('EMPLOYEE', 'ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.getEvaluationHistory
);

// Create or get evaluation for an employee
router.post(
  '/evaluations',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  employeeEvaluationController.createOrUpdateEvaluation
);

// Update evaluation detail (score) - for employee self-evaluation (only selfScore)
router.patch(
  '/my-evaluation/details/:detailId',
  authenticate,
  authorize('EMPLOYEE'),
  employeeEvaluationController.updateEvaluationDetail
);

// Update evaluation detail (score) - for HR/Manager
router.patch(
  '/evaluations/details/:detailId',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.updateEvaluationDetail
);

// Finalize evaluation (calculate final score)
router.post(
  '/evaluations/:evaluationId/finalize',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  employeeEvaluationController.finalizeEvaluation
);

// Get subordinates for supervisor evaluation
router.get(
  '/subordinates/:month/:year',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  employeeEvaluationController.getSubordinatesForEvaluation
);

export default router;

