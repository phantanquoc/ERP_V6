import { Request, Response, NextFunction } from 'express';
import holidayService from '@services/holidayService';

class HolidayController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { year } = req.query;
      const holidays = year
        ? await holidayService.listByYear(Number(year))
        : await holidayService.list();
      res.json({ success: true, data: holidays });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, date, note } = req.body;
      const result = await holidayService.create({ name, date, note });
      res.status(201).json({ success: true, data: result, message: 'Tạo ngày nghỉ thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await holidayService.update(id, req.body);
      res.json({ success: true, data: result, message: 'Cập nhật ngày nghỉ thành công' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await holidayService.delete(id);
      res.json({ success: true, message: 'Xóa ngày nghỉ thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new HolidayController();
