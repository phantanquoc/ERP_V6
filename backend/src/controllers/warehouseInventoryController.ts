import { Request, Response } from 'express';
import warehouseInventoryService from '@services/warehouseInventoryService';

class WarehouseInventoryController {
  async getAllInventory(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await warehouseInventoryService.getAllInventory(page, limit, search);

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách tồn kho',
      });
    }
  }

  async getInventoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inventory = await warehouseInventoryService.getInventoryById(id);

      return res.json({
        success: true,
        data: inventory,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || 'Không tìm thấy thông tin tồn kho',
      });
    }
  }

  async createInventory(req: Request, res: Response) {
    try {
      const inventory = await warehouseInventoryService.createInventory(req.body);

      return res.status(201).json({
        success: true,
        data: inventory,
        message: 'Tạo thông tin tồn kho thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi tạo thông tin tồn kho',
      });
    }
  }

  async updateInventory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inventory = await warehouseInventoryService.updateInventory(id, req.body);

      return res.json({
        success: true,
        data: inventory,
        message: 'Cập nhật thông tin tồn kho thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật thông tin tồn kho',
      });
    }
  }

  async deleteInventory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await warehouseInventoryService.deleteInventory(id);

      return res.json({
        success: true,
        message: 'Xóa thông tin tồn kho thành công',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi xóa thông tin tồn kho',
      });
    }
  }

  async getInventoryByProductName(req: Request, res: Response) {
    try {
      const { productName } = req.query;

      if (!productName || typeof productName !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Tên sản phẩm không hợp lệ',
        });
      }

      const inventory = await warehouseInventoryService.getInventoryByProductName(productName);

      return res.json({
        success: true,
        data: inventory,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi lấy thông tin tồn kho',
      });
    }
  }
}

export default new WarehouseInventoryController();

