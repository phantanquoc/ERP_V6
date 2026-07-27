import { Request, Response, NextFunction } from 'express';
import finishedProductService from '@services/finishedProductService';
import type { AuthenticatedRequest } from '@types';
import { getFileUrl } from '@middlewares/upload';
import { ValidationError } from '@utils/errors';
import prisma from '@config/database';

interface RequestWithFile extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export class FinishedProductController {
  async getAllFinishedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const thoiGianChienFrom = typeof req.query.thoiGianChienFrom === 'string' ? req.query.thoiGianChienFrom : undefined;
      const thoiGianChienTo = typeof req.query.thoiGianChienTo === 'string' ? req.query.thoiGianChienTo : undefined;

      const dateRange = thoiGianChienFrom || thoiGianChienTo
        ? { thoiGianChienFrom, thoiGianChienTo }
        : undefined;

      const result = await finishedProductService.getAllFinishedProducts(page, limit, machineSystemId, dateRange);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinishedProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const product = await finishedProductService.getFinishedProductById(id);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFinishedProduct(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('finished-products', req.file.filename);
      }

      const product = await finishedProductService.createFinishedProduct(data, userId);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Tạo thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFinishedProduct(req: RequestWithFile, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('finished-products', req.file.filename);
      }

      const product = await finishedProductService.updateFinishedProduct(id, data, userId);

      res.json({
        success: true,
        data: product,
        message: 'Cập nhật thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFinishedProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await finishedProductService.deleteFinishedProduct(id);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/finished-products/:id/receipt-rows
   * Returns auto-filled grade rows for a finished product (for pre-filling the receipt modal)
   */
  async getReceiptRows(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const rows = await finishedProductService.buildReceiptRowsForFinishedProduct(id);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/finished-products/:id/warehouse-receipt
   * Confirm warehouse receipt with user-edited rows, warehouseId, lotId
   */
  async confirmWarehouseReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const finishedProductId = req.params.id as string;
      const { warehouseId, lotId, rows } = req.body;
      const employeeId = req.user?.id ?? '';

      const receipts = await finishedProductService.confirmFinishedProductWarehouseReceipt(
        finishedProductId,
        warehouseId,
        lotId,
        rows,
        employeeId,
      );

      res.status(201).json({
        success: true,
        message: 'Nhập kho thành phẩm thành công',
        data: receipts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/finished-products/bulk-warehouse-receipt
   * Bulk confirm warehouse receipt for multiple fry-batches (maChien)
   */
  async bulkConfirmReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { maChienList, warehouseId, lotId } = req.body;
      let employeeId: string;
      if (req.isKioskDevice) {
        const operatorId = req.kioskOperatorId;
        if (!operatorId) throw new ValidationError('Thiếu x-operator-id header');
        const employee = await prisma.employee.findUnique({ where: { id: operatorId } });
        if (!employee) throw new ValidationError('Người thực hiện không tồn tại');
        employeeId = operatorId;
      } else {
        employeeId = req.user?.id ?? '';
      }

      const result = await finishedProductService.confirmBulkFinishedProductWarehouseReceipt(
        maChienList,
        warehouseId,
        lotId,
        employeeId,
      );

      res.status(201).json({
        success: true,
        message: 'Nhập kho toàn bộ thành phẩm thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/finished-products/output-statistics
   * Multi-dimensional output statistics: date × product × grade × machine
   */
  async getOutputStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const machineSystemId = req.query.machineSystemId as string | undefined;
      const tenHangHoa = req.query.tenHangHoa as string | undefined;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu (dateFrom) và ngày kết thúc (dateTo) là bắt buộc',
        });
        return;
      }

      const result = await finishedProductService.getOutputStatistics({
        dateFrom,
        dateTo,
        machineSystemId,
        tenHangHoa,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) filters.search = req.query.search as string;
      if (req.query.tenMay) filters.tenMay = req.query.tenMay as string;
      const buffer = await finishedProductService.exportToExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-thanh-pham-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/finished-products/by-batch-machine
   * Upsert a finished product by (maChien, machineSystemId).
   * Used by kiosk tablet grid when a cell has no existing record.
   */
  async upsertByBatchMachine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let userId: string | undefined;
      if (req.isKioskDevice) {
        const operatorId = req.kioskOperatorId;
        if (!operatorId) throw new ValidationError('Thiếu x-operator-id header');
        userId = operatorId;
      } else {
        userId = req.user?.id;
      }

      const product = await finishedProductService.upsertByBatchMachine(req.body, userId);

      res.json({
        success: true,
        data: product,
        message: 'Lưu thành phẩm thành công',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FinishedProductController();

