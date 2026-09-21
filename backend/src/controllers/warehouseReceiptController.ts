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
    const { maPhieuNhap, employeeId, maNhanVien, tenNhanVien, ngayNhap, mucDich, ghiChu, supplyRequestId, purchaseRequestId, inboundPlanId, lyDoChenhLech, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items } = req.body;

    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Phiếu nhập kho phải có ít nhất một mặt hàng' });
      return;
    }

    const receipt = await warehouseReceiptService.create({
      maPhieuNhap, employeeId, maNhanVien, tenNhanVien, ngayNhap, mucDich, ghiChu, supplyRequestId, purchaseRequestId, inboundPlanId, lyDoChenhLech, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items,
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

    // A receipt opened from a YCMH carries only purchaseRequestId; the service inherits
    // the SR from that PR. Read the persisted value back so the inherited SR still
    // advances to "Đã nhập kho" instead of being stranded at its pre-receipt status.
    const effectiveSupplyRequestId = receipt.supplyRequestId ?? supplyRequestId;
    if (effectiveSupplyRequestId) {
      supplyRequestService.onWarehouseReceiptCreated(effectiveSupplyRequestId).catch((err) => {
        console.error('Error in onWarehouseReceiptCreated:', err);
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getAllWarehouseReceipts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await warehouseReceiptService.getAll({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
      search: req.query.search as string | undefined,
      warehouseId: (req.query.warehouseId as string | undefined) || (req.query.warehouse as string | undefined),
      fromNgay: req.query.fromNgay as string | undefined,
      toNgay: req.query.toNgay as string | undefined,
      sortBy: (req.query.sortBy as string | undefined) || (req.query.sortKey as string | undefined),
      sortOrder: (req.query.sortOrder as string | undefined) || (req.query.sortDir as string | undefined),
      maPhieu: (req.query.maPhieu as string | undefined) || (req.query.maPhieuNhap as string | undefined),
      tenNhanVien: req.query.tenNhanVien as string | undefined,
      nguoiDeNghi: req.query.nguoiDeNghi as string | undefined,
      boPhan: req.query.boPhan as string | undefined,
      tinhTrang: req.query.tinhTrang as string | undefined,
      daIn: req.query.daIn as string | undefined,
    });
    // Backward compat: no pagination params → return bare array like before
    const hasPaging = req.query.page !== undefined || req.query.limit !== undefined || req.query.search !== undefined || req.query.warehouseId !== undefined || req.query.fromNgay !== undefined || req.query.toNgay !== undefined || req.query.sortBy !== undefined || req.query.sortOrder !== undefined || req.query.warehouse !== undefined || req.query.sortKey !== undefined || req.query.sortDir !== undefined || req.query.maPhieu !== undefined || req.query.maPhieuNhap !== undefined || req.query.tenNhanVien !== undefined || req.query.nguoiDeNghi !== undefined || req.query.boPhan !== undefined || req.query.tinhTrang !== undefined || req.query.daIn !== undefined;
    if (!hasPaging) {
      res.status(200).json({ success: true, data: result.data });
      return;
    }
    res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
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
    const { ngayNhap, mucDich, ghiChu, lyDoChenhLech, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items } = req.body;

    const receipt = await warehouseReceiptService.update(id, { ngayNhap, mucDich, ghiChu, lyDoChenhLech, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, items });

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
