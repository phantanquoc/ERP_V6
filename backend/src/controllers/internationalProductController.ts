import { Response, NextFunction } from 'express';
import internationalProductService from '@services/internationalProductService';
import { AuthenticatedRequest, ApiResponse } from '@types';

export class InternationalProductController {
  async getAllProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await internationalProductService.getAllProducts(page, limit, search);

      const response: ApiResponse<any> = {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await internationalProductService.getProductById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getProductByCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const product = await internationalProductService.getProductByCode(code);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await internationalProductService.createProduct(req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
        message: 'Product created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await internationalProductService.updateProduct(id, req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: product,
        message: 'Product updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await internationalProductService.deleteProduct(id);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Product deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async generateProductCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await internationalProductService.generateProductCode();

      const response: ApiResponse<any> = {
        success: true,
        data: { code },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new InternationalProductController();

