import { Response, NextFunction } from 'express';
import inventoryService from '@services/inventoryService';
import type { InventoryFilters } from '@services/inventoryService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class InventoryController {
  async getInventoryOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: InventoryFilters = {
        search: req.query.search as string | undefined,
        loaiSanPham: req.query.loaiSanPham as string | undefined,
        warehouseId: req.query.warehouseId as string | undefined,
        donViTinh: req.query.donViTinh as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await inventoryService.getInventoryOverview(filters);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          data: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new InventoryController();
