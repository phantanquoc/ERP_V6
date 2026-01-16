import { Router } from 'express';
import leaveRequestController from '@controllers/leaveRequestController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export leave requests to Excel (must be before /:id route)
router.get('/export/excel', leaveRequestController.exportToExcel);

// Create a new leave request
router.post('/', leaveRequestController.createLeaveRequest);

// Get all leave requests
router.get('/', leaveRequestController.getAllLeaveRequests);

// Get leave request by ID
router.get('/:id', leaveRequestController.getLeaveRequestById);

// Approve leave request
router.patch('/:id/approve', leaveRequestController.approveLeaveRequest);

// Reject leave request
router.patch('/:id/reject', leaveRequestController.rejectLeaveRequest);

export default router;

