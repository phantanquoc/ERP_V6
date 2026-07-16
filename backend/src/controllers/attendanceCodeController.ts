import { Request, Response, NextFunction } from 'express';
import attendanceCodeService from '@services/attendanceCodeService';

class AttendanceCodeController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const codes = await attendanceCodeService.list();
      res.json({ success: true, data: codes });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, label, description, sortOrder } = req.body;
      const result = await attendanceCodeService.create({ code, label, description, sortOrder });
      res.status(201).json({ success: true, data: result, message: 'Tạo mã chấm công thành công' });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await attendanceCodeService.update(id, req.body);
      res.json({ success: true, data: result, message: 'Cập nhật mã chấm công thành công' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await attendanceCodeService.delete(id);
      res.json({ success: true, message: 'Xóa mã chấm công thành công' });
    } catch (error) {
      next(error);
    }
  }
}

export default new AttendanceCodeController();
