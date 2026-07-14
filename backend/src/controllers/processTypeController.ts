import { Response, NextFunction } from 'express';
import processTypeService from '@services/processTypeService';
import { assertDepartment } from '@utils/permissions';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class ProcessTypeController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let kichHoat: boolean | undefined;
      const raw = req.query.kichHoat;
      if (raw === 'true') kichHoat = true;
      else if (raw === 'false') kichHoat = false;

      const data = await processTypeService.getAllProcessTypes({ kichHoat });
      res.json({ success: true, data } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = await processTypeService.getProcessTypeById(id);
      res.json({ success: true, data } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertDepartment(req, ['DEPT_QUALITY']);
      const data = await processTypeService.createProcessType(req.body);
      res.status(201).json({
        success: true,
        data,
        message: 'Tạo loại quy trình thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertDepartment(req, ['DEPT_QUALITY']);
      const id = req.params.id as string;
      const data = await processTypeService.updateProcessType(id, req.body);
      res.json({
        success: true,
        data,
        message: 'Cập nhật loại quy trình thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await assertDepartment(req, ['DEPT_QUALITY']);
      const id = req.params.id as string;
      await processTypeService.deleteProcessType(id);
      res.json({
        success: true,
        message: 'Xóa loại quy trình thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProcessTypeController();
