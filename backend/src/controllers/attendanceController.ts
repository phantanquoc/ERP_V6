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
      if (!req.user) {
        throw new ValidationError('Thiếu thông tin người dùng');
      }

      const requestedEmployeeId = req.params.employeeId as string;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format');
      }

      const employeeId = await attendanceService.resolveEmployeeAttendanceAccess(requestedEmployeeId, {
        userId: req.user.id,
        role: req.user.role,
      });

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

  async exportToExcelCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, month, year, search, departmentId, positionId } = req.query;

      const monthNum = month ? parseInt(month as string) : undefined;
      const yearNum = year ? parseInt(year as string) : undefined;

      if (!monthNum && !yearNum && (!startDate || !endDate)) {
        throw new ValidationError('Cần cung cấp month/year hoặc startDate/endDate');
      }

      const buffer = await attendanceService.exportToExcelCalendar({
        startDate: startDate ? (startDate as string) : undefined,
        endDate: endDate ? (endDate as string) : undefined,
        month: monthNum,
        year: yearNum,
        search: search ? (search as string) : undefined,
        departmentId: departmentId ? (departmentId as string) : undefined,
        positionId: positionId ? (positionId as string) : undefined,
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bang-cham-cong-${yearNum || ''}-${monthNum || ''}-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async importFromExcelCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { month, year } = req.body;
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
        throw new ValidationError('Tháng và năm không hợp lệ');
      }

      if (!req.file) {
        throw new ValidationError('Không tìm thấy file Excel');
      }

      const result = await attendanceService.importFromExcelCalendar(req.file.buffer, {
        month: monthNum,
        year: yearNum,
      });

      res.json({
        success: true,
        message: `Import thành công ${result.imported} ô chấm công`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceController();
