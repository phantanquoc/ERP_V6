import { Request, Response, NextFunction } from 'express';
import warehouseIssueService from '@services/warehouseIssueService';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
import { exportIssueXlsx } from '@services/warehouseSlipExportService';
import { NotificationEvent } from '@types';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';

export const generateIssueCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const maPhieuXuat = await warehouseIssueService.generateCode();
    res.status(200).json({ success: true, data: { maPhieuXuat } });
  } catch (error) {
    next(error);
  }
};

export const createWarehouseIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { maPhieuXuat, employeeId, maNhanVien, tenNhanVien, ngayXuat, ghiChu, supplyRequestId, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, lyDoXuatKho, items } = req.body;

    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Thiếu mã nhân viên' });
      return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Phiếu xuất kho phải có ít nhất một mặt hàng' });
      return;
    }

    const warehouseIssue = await warehouseIssueService.create({
      maPhieuXuat, employeeId, maNhanVien, tenNhanVien, ngayXuat, ghiChu, supplyRequestId, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, lyDoXuatKho, items,
    });

    res.status(201).json({ success: true, message: 'Tạo phiếu xuất kho thành công', data: warehouseIssue });

    try {
      const totalQty = items.reduce((sum: number, line: any) => sum + Number(line.soLuongThucTe || 0), 0);
      await notificationService.notify(NotificationEvent.WAREHOUSE_ISSUE_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: warehouseIssue.id,
        metadata: { maPhieuXuat: warehouseIssue.maPhieuXuat, soLuongXuat: totalQty, donViTinh: items[0]?.donViTinh, tenSanPham: `${items.length} mặt hàng` },
      });
    } catch {}

    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId)
        .catch(err => console.error('Error in onWarehouseDocumentCreated:', err));
    }
  } catch (error: any) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAllWarehouseIssues = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const issues = await warehouseIssueService.getAll();
    res.status(200).json({ success: true, data: issues });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseIssueById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const issue = await warehouseIssueService.getById(req.params.id);
    res.status(200).json({ success: true, data: issue });
  } catch (error: any) {
    if (error.status === 404) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateWarehouseIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { ngayXuat, ghiChu, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, lyDoXuatKho, items } = req.body;

    const issue = await warehouseIssueService.update(id, { ngayXuat, ghiChu, nguoiDeNghi, maNguoiDeNghi, boPhan, boPhanId, lyDoXuatKho, items });

    res.status(200).json({ success: true, message: 'Cập nhật phiếu xuất kho thành công', data: issue });
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

export const deleteWarehouseIssue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await warehouseIssueService.delete(id);
    res.status(200).json({ success: true, message: 'Xóa phiếu xuất kho thành công', data: result });
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

export const markIssuePrinted = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await warehouseIssueService.markPrinted(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const exportIssueXlsxHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await exportIssueXlsx(req.params.id, res);
    try { await warehouseIssueService.markPrinted(req.params.id); } catch {}
  } catch (error) {
    next(error);
  }
};
