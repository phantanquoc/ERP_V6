import { Response, NextFunction } from 'express';
import timesheetService from '@services/timesheetService';
import { ValidationError } from '@utils/errors';
import { AuthenticatedRequest } from '@types';

class TimesheetController {
  async getMonthly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string);

      if (isNaN(month) || month < 1 || month > 12) {
        throw new ValidationError('Tháng phải từ 1 đến 12');
      }
      if (isNaN(year)) {
        throw new ValidationError('Năm không hợp lệ');
      }

      const filters = {
        search: req.query.search as string | undefined,
        departmentId: req.query.departmentId as string | undefined,
        positionId: req.query.positionId as string | undefined,
      };

      const data = await timesheetService.getMonthly(month, year, filters);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async upsertCell(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, date, code, note, workHours, overtimeHours } = req.body;
      const result = await timesheetService.upsertCell({
        employeeId,
        date,
        code,
        note,
        workHours,
        overtimeHours,
        updatedBy: req.user?.id,
        updatedByName: req.user?.name,
      });
      res.json({ success: true, data: result, message: 'Cập nhật ô chấm công thành công' });
    } catch (error) {
      next(error);
    }
  }

  async upsertOverride(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { employeeId, month, year, fieldKey, value } = req.body;
      const result = await timesheetService.upsertOverride({
        employeeId,
        month: parseInt(month),
        year: parseInt(year),
        fieldKey,
        value: value ?? '',
        updatedBy: req.user?.id,
        updatedByName: req.user?.name,
      });
      res.json({ success: true, data: result, message: 'Cập nhật giá trị thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new TimesheetController();
