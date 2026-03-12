import { Request, Response, NextFunction } from 'express';
import workShiftService from '@services/workShiftService';
import { ValidationError } from '@utils/errors';

interface AuthenticatedRequest extends Request {
  user?: any;
}

class WorkShiftController {
  async getAll(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const shifts = await workShiftService.getAllShifts();
      res.json({ success: true, data: shifts });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, startTime, endTime } = req.body;

      if (!name || !startTime || !endTime) {
        throw new ValidationError('name, startTime, and endTime are required');
      }

      const shift = await workShiftService.createShift({ name, startTime, endTime });
      res.status(201).json({ success: true, data: shift });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const shift = await workShiftService.updateShift(id, req.body);
      res.json({ success: true, data: shift });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await workShiftService.deleteShift(id);
      res.json({ success: true, message: 'Deleted' });
    } catch (error) {
      next(error);
    }
  }
}

export default new WorkShiftController();

