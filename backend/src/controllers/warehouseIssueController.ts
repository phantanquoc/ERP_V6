import { Request, Response, NextFunction } from 'express';
import warehouseIssueService from '@services/warehouseIssueService';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
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
    const { maPhieuXuat, employeeId, maNhanVien, tenNhanVien, warehouseId, tenKho, lotId, tenLo, lotProductId, tenSanPham, soLuongXuat, donViTinh, ghiChu, supplyRequestId } = req.body;

    const warehouseIssue = await warehouseIssueService.create({
      maPhieuXuat, employeeId, maNhanVien, tenNhanVien, warehouseId, tenKho,
      lotId, tenLo, lotProductId, tenSanPham, soLuongXuat, donViTinh, ghiChu, supplyRequestId,
    });

    res.status(201).json({ success: true, message: 'Tạo phiếu xuất kho thành công', data: warehouseIssue });

    try {
      await notificationService.notify(NotificationEvent.WAREHOUSE_ISSUE_CREATED, {
        actorUserId: (req as any).user?.id,
        entityId: warehouseIssue.id,
        metadata: { maPhieuXuat, soLuongXuat, donViTinh, tenSanPham },
      });
    } catch {}

    if (supplyRequestId) {
      supplyRequestService.onWarehouseDocumentCreated(supplyRequestId)
        .catch(err => console.error('Error in onWarehouseDocumentCreated:', err));
    }
  } catch (error: any) {
    if (error.status === 404 || error.status === 400) {
      res.status(error.status).json({ success: false, message: error.message });
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
    const { warehouseId, tenKho, lotId, tenLo, lotProductId, tenSanPham, soLuongXuat, donViTinh, ghiChu } = req.body;

    const issue = await warehouseIssueService.update(id, {
      warehouseId, tenKho, lotId, tenLo, lotProductId, tenSanPham, soLuongXuat, donViTinh, ghiChu,
    });

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
