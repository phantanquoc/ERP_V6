import { Request, Response, NextFunction } from 'express';
import orderService from '../services/orderService';
import { ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  file?: Express.Multer.File;
}

class OrderController {
  // Generate order code
  async generateOrderCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await orderService.generateOrderCode();

      const response: ApiResponse<{ code: string }> = {
        success: true,
        data: { code },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Create order from quotation
  async createOrderFromQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { quotationId } = req.body;

      // Handle file upload
      let fileDinhKem: string | undefined;
      if (req.file) {
        fileDinhKem = getFileUrl('orders', req.file.filename);
      }

      const order = await orderService.createOrderFromQuotation(quotationId, fileDinhKem);

      const response: ApiResponse<any> = {
        success: true,
        data: order,
        message: 'Tạo đơn hàng thành công',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get all orders
  async getAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const customerType = req.query.customerType as string;

      const result = await orderService.getAllOrders(page, limit, search, customerType);

      const response: ApiResponse<any> = {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Get order by ID
  async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const order = await orderService.getOrderById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: order,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update order
  async updateOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = req.body;

      // Handle file upload
      if (req.file) {
        data.fileDinhKem = getFileUrl('orders', req.file.filename);
      }

      const order = await orderService.updateOrder(id, data);

      const response: ApiResponse<any> = {
        success: true,
        data: order,
        message: 'Cập nhật đơn hàng thành công',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Update order item
  async updateOrderItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { itemId } = req.params;
      const data = req.body;

      const item = await orderService.updateOrderItem(itemId, data);

      const response: ApiResponse<any> = {
        success: true,
        data: item,
        message: 'Cập nhật hàng hóa thành công',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // Delete order
  async deleteOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      await orderService.deleteOrder(id);

      const response: ApiResponse<null> = {
        success: true,
        data: null,
        message: 'Xóa đơn hàng thành công',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new OrderController();

