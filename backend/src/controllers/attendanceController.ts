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

  async overtimeCheckIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.body;

      if (!employeeId) {
        throw new ValidationError('employeeId is required');
      }

      const attendance = await attendanceService.overtimeCheckIn(employeeId, new Date());
      res.json({
        success: true,
        data: attendance,
        message: 'Chấm công tăng ca vào thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async overtimeCheckOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.body;

      if (!employeeId) {
        throw new ValidationError('employeeId is required');
      }

      const attendance = await attendanceService.overtimeCheckOut(employeeId, new Date());
      res.json({
        success: true,
        data: attendance,
        message: 'Chấm công tăng ca ra thành công',
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

  async getDailySummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const result = await attendanceService.getDailySummary(date);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getOvertimeAttendances(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, page, limit, month, planId } = req.query;
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 10;
      const result = await attendanceService.getOvertimeAttendances({
        search: search as string,
        page: pageNum,
        limit: limitNum,
        month: month as string,
        planId: planId as string,
      });
      res.status(200).json({
        success: true,
        message: 'Lấy danh sách chấm công tăng ca thành công',
        data: result.data,
        pagination: {
          page: result.page,
          limit: limitNum,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();

