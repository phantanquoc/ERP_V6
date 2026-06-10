import { Request, Response, NextFunction } from 'express';
import lotService from '@services/lotService';

export const getLotsByWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lots = await lotService.getByWarehouse(req.params.warehouseId);
    res.json({ success: true, data: lots });
  } catch (error) {
    next(error);
  }
};

export const createLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tenLo, warehouseId } = req.body;

    if (!tenLo || !warehouseId) {
      res.status(400).json({ success: false, message: 'Tên lô và mã kho là bắt buộc' });
      return;
    }

    const lot = await lotService.create(tenLo, warehouseId);
    res.status(201).json({ success: true, data: lot, message: 'Tạo lô thành công' });
  } catch (error) {
    next(error);
  }
};

export const deleteLot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lotService.delete(req.params.id);
    res.json({ success: true, message: 'Xóa lô thành công' });
  } catch (error) {
    next(error);
  }
};
