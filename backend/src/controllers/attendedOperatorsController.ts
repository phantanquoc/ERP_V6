import { Request, Response, NextFunction } from 'express';
import attendedOperatorsService from '@services/attendedOperatorsService';
import { ValidationError } from '@utils/errors';

export class AttendedOperatorsController {
  async getAttendedOperators(req: Request, res: Response, next: NextFunction) {
    try {
      const { date, shift, pageKey } = req.query;

      // Validate required params
      if (!date || !shift || !pageKey) {
        throw new ValidationError(
          'Thiếu tham số bắt buộc: date, shift, pageKey'
        );
      }

      const shiftNum = parseInt(shift as string, 10);
      if (isNaN(shiftNum) || shiftNum < 1 || shiftNum > 3) {
        throw new ValidationError('shift phải là số từ 1 đến 3');
      }

      const operators = await attendedOperatorsService.getAttendedOperators(
        date as string,
        shiftNum,
        pageKey as string
      );

      res.json({
        success: true,
        data: operators,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendedOperatorsController();
