import { Router } from 'express';
import attendanceController from '@controllers/attendanceController';
import { authenticate } from '@middlewares/auth';

const router = Router();

// Get attendance by date range
router.get('/date-range', authenticate, (req, res) => attendanceController.getAttendanceByDateRange(req, res));

// Get employee attendance
router.get('/employee/:employeeId', authenticate, (req, res) => attendanceController.getEmployeeAttendance(req, res));

// Check in
router.post('/check-in', authenticate, (req, res) => attendanceController.checkIn(req, res));

// Check out
router.post('/check-out', authenticate, (req, res) => attendanceController.checkOut(req, res));

// Create attendance
router.post('/', authenticate, (req, res) => attendanceController.createAttendance(req, res));

// Update attendance
router.put('/:id', authenticate, (req, res) => attendanceController.updateAttendance(req, res));

// Delete attendance
router.delete('/:id', authenticate, (req, res) => attendanceController.deleteAttendance(req, res));

export default router;

