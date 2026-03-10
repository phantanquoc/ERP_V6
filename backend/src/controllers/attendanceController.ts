import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import attendanceService from '@services/attendanceService';
import { ValidationError } from '@utils/errors';

export class AttendanceController {
  async getAttendanceByDateRange(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async getEmployeeAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const employeeId = req.params.employeeId as string;
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
      next(error);
    }
  }

  async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async checkOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async createAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async updateAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  async deleteAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      await attendanceService.deleteAttendance(id);
      res.json({
        success: true,
        message: 'Attendance deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      const buffer = await attendanceService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bang-cham-cong-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();

