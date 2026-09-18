import { Request, Response, NextFunction } from 'express';
import outboundPlanService from '@services/outboundPlanService';

export const getAllOutboundPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || undefined;
    const filters = {
      trangThai: (req.query.trangThai as string) || undefined,
      warehouseId: (req.query.warehouseId as string) || undefined,
      overdueOnly: req.query.overdueOnly === 'true' || req.query.overdueOnly === '1',
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
    const { ngayDuKien, ghiChu, warehouseId } = req.body;
    const plan = await outboundPlanService.updateOutboundPlan(req.params.id, { ngayDuKien, ghiChu, warehouseId });
    res.json({ success: true, data: plan, message: 'Cập nhật kế hoạch xuất kho thành công' });
  } catch (error) {
    next(error);
  }
};

export const cancelOutboundPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lyDo } = req.body;
    const plan = await outboundPlanService.cancelOutboundPlan(req.params.id, { lyDo });
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
