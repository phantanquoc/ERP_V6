import { Request, Response, NextFunction } from 'express';
import outboundPlanService from '@services/outboundPlanService';
import prisma from '@config/database';

async function resolveActorName(req: Request): Promise<string | undefined> {
  const actorUserId = (req as any).user?.id;
  if (!actorUserId) return undefined;
  const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { firstName: true, lastName: true } });
  if (!user) return undefined;
  return `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() || undefined;
}

export const getAllOutboundPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      fromNgay: (req.query.fromNgay as string) || undefined,
      toNgay: (req.query.toNgay as string) || undefined,
    };
    const result = await outboundPlanService.getAllOutboundPlans(page, limit, search, filters);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const getOutboundPlanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const plan = await outboundPlanService.getOutboundPlanById(req.params.id);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const updateOutboundPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ngayDuKien, ghiChu, warehouseId, lyDo } = req.body;
    const nguoiThucHien = await resolveActorName(req);
    const plan = await outboundPlanService.updateOutboundPlan(req.params.id, { ngayDuKien, ghiChu, warehouseId, lyDo, nguoiThucHien });
    res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch xuất kho thành công' });
  } catch (error) {
    next(error);
  }
};

export const cancelOutboundPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lyDo } = req.body;
    const nguoiThucHien = await resolveActorName(req);
    const plan = await outboundPlanService.cancelOutboundPlan(req.params.id, { lyDo, nguoiThucHien });
    res.json({ success: true, data: plan, message: 'Đã hủy kế hoạch xuất kho' });
  } catch (error) {
    next(error);
  }
};

export const markOutboundReceived = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { soLuongThucTe, lyDoChenhLech } = req.body;
    const plan = await outboundPlanService.markReceived(req.params.id, {
      soLuongThucTe: soLuongThucTe !== undefined ? Number(soLuongThucTe) : undefined,
      lyDoChenhLech,
    });
    res.json({ success: true, data: plan, message: 'Đã đánh dấu đã xuất' });
  } catch (error) {
    next(error);
  }
};
