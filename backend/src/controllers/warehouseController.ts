import { Request, Response, NextFunction } from 'express';
import warehouseService from '@services/warehouseService';

export const getAllWarehouses = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const warehouses = await warehouseService.getAll();
    res.json({ success: true, data: warehouses });
  } catch (error) {
    next(error);
  }
};

export const generateWarehouseCode = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const code = await warehouseService.generateCode();
    res.json({ success: true, data: { code } });
  } catch (error) {
    next(error);
  }
};

export const createWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { maKho, tenKho } = req.body;

    if (!tenKho) {
      res.status(400).json({ success: false, message: 'Tên kho là bắt buộc' });
      return;
    }

    const warehouse = await warehouseService.create(tenKho, maKho);
    res.status(201).json({ success: true, data: warehouse, message: 'Tạo kho thành công' });
  } catch (error) {
    next(error);
  }
};

export const deleteWarehouse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await warehouseService.delete(req.params.id);
    res.json({ success: true, message: 'Xóa kho thành công' });
  } catch (error) {
    next(error);
  }
};
