import { Router } from 'express';
import payrollController from '@controllers/payrollController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

// Get all payrolls for a specific month/year
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  payrollController.getPayrollByMonthYear
);

// Get payroll detail
router.get(
  '/:payrollId/detail',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'),
  payrollController.getPayrollDetail
);

// Create or update payroll
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  payrollController.createOrUpdatePayroll
);

// Update payroll
router.patch(
  '/:payrollId',
  authenticate,
  authorize('ADMIN', 'DEPARTMENT_HEAD'),
  payrollController.updatePayroll
);

export default router;

