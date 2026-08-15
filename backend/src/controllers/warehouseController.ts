import { Request, Response, NextFunction } from 'express';
import warehouseService from '@services/warehouseService';
import { syncAllWarehouseLayouts } from '@services/warehouseLayoutSyncService';

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
    const { maKho, tenKho, loaiKho, diaChi, dienTich, sucChua, nguoiQuanLy, soDienThoai, trangThai, ghiChu } = req.body;

    if (!tenKho) {
      res.status(400).json({ success: false, message: 'Tên kho là bắt buộc' });
      return;
    }

    const warehouse = await warehouseService.create({ tenKho, maKho, loaiKho, diaChi, dienTich, sucChua, nguoiQuanLy, soDienThoai, trangThai, ghiChu });
    res.status(201).json({ success: true, data: warehouse, message: 'Tạo kho thành công' });
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const warehouse = await warehouseService.update(req.params.id, req.body);
    res.json({ success: true, data: warehouse, message: 'Cập nhật kho thành công' });
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

/**
 * Reconcile every CAD-mapped warehouse with its floor-plan baseline (default lots per zone
 * + physical slots). Admin-only. Idempotent — safe to re-run; existing goods are untouched.
 */
export const syncLayouts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await syncAllWarehouseLayouts();
    res.json({
      success: true,
      message: `Đồng bộ sơ đồ hoàn tất: ${stats.lotsCreated} lô mới, ${stats.slotsCreated} vị trí mới`,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
