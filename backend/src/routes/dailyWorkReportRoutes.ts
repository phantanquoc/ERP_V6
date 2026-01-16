import { Router } from 'express';
import dailyWorkReportController from '@controllers/dailyWorkReportController';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get my reports (for authenticated employee)
router.get('/my-reports', dailyWorkReportController.getMyReports);

// Get my statistics
router.get('/my-statistics', dailyWorkReportController.getReportStatistics);

// Create a new report (employee can create their own report)
router.post('/', dailyWorkReportController.createReport);

// Update a report (employee can update their own report)
router.patch('/:id', dailyWorkReportController.updateReport);

// Delete a report (employee can delete their own report)
router.delete('/:id', dailyWorkReportController.deleteReport);

// Get all reports (admin, department head, team lead)
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.getAllReports
);

// Get report by ID
router.get('/:id', dailyWorkReportController.getReportById);

// Get reports by employee ID (admin, department head, team lead)
router.get(
  '/employee/:employeeId',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.getReportsByEmployeeId
);

// Add supervisor comment (department head, team lead)
router.post(
  '/:id/comment',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD),
  dailyWorkReportController.addSupervisorComment
);

export default router;

