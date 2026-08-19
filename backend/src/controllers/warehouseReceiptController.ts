import { Request, Response, NextFunction } from 'express';
import warehouseReceiptService from '@services/warehouseReceiptService';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
import { exportReceiptXlsx } from '@services/warehouseSlipExportService';
import { NotificationEvent } from '@types';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';

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
    const { maPhieuNhap, employeeId, maNhanVien, tenNhanVien, ngayNhap, mucDich, ghiChu, supplyRequestId, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items } = req.body;

    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Phiếu nhập kho phải có ít nhất một mặt hàng' });
      return;
    }

    const receipt = await warehouseReceiptService.create({
      maPhieuNhap, employeeId, maNhanVien, tenNhanVien, ngayNhap, mucDich, ghiChu, supplyRequestId, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items,
    });

    res.status(201).json({ success: true, data: receipt, message: 'Tạo phiếu nhập kho thành công' });

    try {
      const totalQty = items.reduce((sum: number, line: any) => sum + Number(line.soLuongThucTe || 0), 0);
      await notificationService.notify(NotificationEvent.WAREHOUSE_RECEIPT_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: receipt.id,
        metadata: { maPhieuNhap: receipt.maPhieuNhap, soLuongNhap: totalQty, donViTinh: items[0]?.donViTinh, tenSanPham: `${items.length} mặt hàng` },
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

export const getWarehouseReceiptById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const receipt = await warehouseReceiptService.getById(req.params.id);
    res.status(200).json({ success: true, data: receipt });
  } catch (error: any) {
    if (error.status === 404) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateWarehouseReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { ngayNhap, mucDich, ghiChu, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items } = req.body;

    const receipt = await warehouseReceiptService.update(id, { ngayNhap, mucDich, ghiChu, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items });

    res.status(200).json({ success: true, message: 'Cập nhật phiếu nhập kho thành công', data: receipt });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof ConflictError) {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getLotProductReceiptHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lotProductId } = req.params;
    const history = await warehouseReceiptService.getByLotProduct(lotProductId);
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const deleteWarehouseReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await warehouseReceiptService.delete(id);
    res.status(200).json({ success: true, message: 'Xóa phiếu nhập kho thành công', data: result });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof ConflictError) {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const markReceiptPrinted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await warehouseReceiptService.markPrinted(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const exportReceiptXlsxHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exportReceiptXlsx(req.params.id, res);
    try { await warehouseReceiptService.markPrinted(req.params.id); } catch {}
  } catch (error) {
    next(error);
  }
};
