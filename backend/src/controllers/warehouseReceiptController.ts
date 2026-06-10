import { Request, Response, NextFunction } from 'express';
import warehouseReceiptService from '@services/warehouseReceiptService';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';

export const generateReceiptCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = await warehouseReceiptService.generateCode();
    res.status(200).json({ success: true, data: { code } });
  } catch (error) {
    next(error);
  }
};

export const createWarehouseReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { maPhieuNhap, employeeId, maNhanVien, tenNhanVien, warehouseId, tenKho, lotId, tenLo, lotProductId, tenSanPham, soLuongNhap, donViTinh, ghiChu, supplyRequestId, loaiSanPham } = req.body;

    if (!maPhieuNhap || !employeeId || !warehouseId || !lotId || !tenSanPham || soLuongNhap === undefined || soLuongNhap === null) {
      res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
      return;
    }

    const receipt = await warehouseReceiptService.create({
      maPhieuNhap, employeeId, maNhanVien, tenNhanVien,
      warehouseId, tenKho, lotId, tenLo, lotProductId,
      tenSanPham, soLuongNhap, donViTinh, ghiChu, supplyRequestId, loaiSanPham,
    });

    res.status(201).json({ success: true, data: receipt, message: 'Tạo phiếu nhập kho thành công' });

    try {
      await notificationService.notify(NotificationEvent.WAREHOUSE_RECEIPT_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: receipt.id,
        metadata: { maPhieuNhap, soLuongNhap: parseFloat(soLuongNhap.toString()), donViTinh, tenSanPham },
      });
    } catch {}

    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId).catch((err) => {
        console.error('Error in onWarehouseDocumentCreated:', err);
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getAllWarehouseReceipts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const receipts = await warehouseReceiptService.getAll();
    res.status(200).json({ success: true, data: receipts });
  } catch (error) {
    next(error);
  }
};

export const batchCreateWarehouseReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, supplyRequestId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Vui lòng thêm ít nhất một sản phẩm' });
      return;
    }

    const results = await warehouseReceiptService.batchCreate(items, supplyRequestId);

    res.status(201).json({
      success: true,
      data: results,
      message: `Đã tạo ${results.length} phiếu nhập kho thành công`,
    });

    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId).catch((err) => {
        console.error('Error in onWarehouseDocumentCreated:', err);
      });
    }
  } catch (error) {
    next(error);
  }
};
