import { Request, Response, NextFunction } from 'express';
import inboundPlanService from '@services/inboundPlanService';
import prisma from '@config/database';

export const getAllInboundPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const filters = {
      trangThai: (req.query.trangThai as string) || undefined,
      warehouseId: (req.query.warehouseId as string) || undefined,
      overdueOnly: req.query.overdueOnly === 'true' || req.query.overdueOnly === '1',
      sortBy: (req.query.sortBy as string) || undefined,
      sortDir: (req.query.sortDir as string) || undefined,
    };
    const result = await inboundPlanService.getAllInboundPlans(page, limit, search, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const getInboundPlanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plan = await inboundPlanService.getInboundPlanById(req.params.id);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const updateInboundPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngayDuKien, lyDo } = req.body;
    let nguoiThucHien: string | undefined;
    const actorUserId = (req as any).user?.id;
    if (actorUserId) {
      const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { firstName: true, lastName: true } });
      if (user) nguoiThucHien = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || undefined;
    }
    const plan = await inboundPlanService.updateInboundPlan(req.params.id, { ngayDuKien, lyDo, nguoiThucHien });
    res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch nhập kho thành công' });
  } catch (error) {
    next(error);
  }
};

export const cancelInboundPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lyDo } = req.body;
    let nguoiThucHien: string | undefined;
    const actorUserId = (req as any).user?.id;
    if (actorUserId) {
      const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { firstName: true, lastName: true } });
      if (user) nguoiThucHien = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || undefined;
    }
    const plan = await inboundPlanService.cancelInboundPlan(req.params.id, { lyDo, nguoiThucHien });
    res.json({ success: true, data: plan, message: 'Đã hủy kế hoạch nhập kho' });
  } catch (error) {
    next(error);
  }
};

export const markInboundReceived = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { soLuongThucTe, lyDoChenhLech } = req.body;
    let nguoiThucHien: string | undefined;
    const actorUserId = (req as any).user?.id;
    if (actorUserId) {
      const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { firstName: true, lastName: true } });
      if (user) nguoiThucHien = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || undefined;
    }
    const plan = await inboundPlanService.markReceived(req.params.id, {
      soLuongThucTe: soLuongThucTe !== undefined ? Number(soLuongThucTe) : undefined,
      lyDoChenhLech,
      nguoiThucHien,
    });
    res.json({ success: true, data: plan, message: 'Đã đánh dấu đã nhập' });
  } catch (error) {
    next(error);
  }
};
