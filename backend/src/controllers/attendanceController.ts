import { Request, Response } from 'express';
import attendanceService from '@services/attendanceService';
import { ValidationError } from '@utils/errors';

export class AttendanceController {
  async getAttendanceByDateRange(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      const attendances = await attendanceService.getAttendanceByDateRange(start, end);
      res.json({
        success: true,
        data: attendances,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get attendance',
      });
    }
  }

  async getEmployeeAttendance(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      const attendances = await attendanceService.getEmployeeAttendance(employeeId, start, end);
      res.json({
        success: true,
        data: attendances,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get employee attendance',
      });
    }
  }

  async checkIn(req: Request, res: Response) {
    try {
      const { employeeId } = req.body;

      if (!employeeId) {
        throw new ValidationError('employeeId is required');
      }

      const attendance = await attendanceService.checkIn(employeeId, new Date());
      res.json({
        success: true,
        data: attendance,
        message: 'Check-in successful',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed',
      });
    }
  }

  async checkOut(req: Request, res: Response) {
    try {
      const { employeeId } = req.body;

      if (!employeeId) {
        throw new ValidationError('employeeId is required');
      }

      const attendance = await attendanceService.checkOut(employeeId, new Date());
      res.json({
        success: true,
        data: attendance,
        message: 'Check-out successful',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Check-out failed',
      });
    }
  }

  async createAttendance(req: Request, res: Response) {
    try {
      const { employeeId, attendanceDate, checkInTime, checkOutTime, workHours, status, notes } = req.body;

      if (!employeeId || !attendanceDate || !status) {
        throw new ValidationError('employeeId, attendanceDate, and status are required');
      }

      const attendance = await attendanceService.createAttendance({
        employeeId,
        attendanceDate: new Date(attendanceDate),
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        workHours,
        status,
        notes,
      });

      res.status(201).json({
        success: true,
        data: attendance,
        message: 'Attendance created successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create attendance',
      });
    }
  }

  async updateAttendance(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { checkInTime, checkOutTime, workHours, status, notes } = req.body;

      const attendance = await attendanceService.updateAttendance(id, {
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        workHours,
        status,
        notes,
      });

      res.json({
        success: true,
        data: attendance,
        message: 'Attendance updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update attendance',
      });
    }
  }

  async deleteAttendance(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      await attendanceService.deleteAttendance(id);
      res.json({
        success: true,
        message: 'Attendance deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete attendance',
      });
    }
  }
}

export default new AttendanceController();

