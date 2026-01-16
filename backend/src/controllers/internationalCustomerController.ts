import { Response, NextFunction } from 'express';
import internationalCustomerService from '@services/internationalCustomerService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class InternationalCustomerController {
  async getAllCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const phanLoaiDiaLy = req.query.phanLoaiDiaLy as string; // "Quốc tế" hoặc "Nội địa"

      const result = await internationalCustomerService.getAllCustomers(page, limit, search, phanLoaiDiaLy);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await internationalCustomerService.getCustomerById(id);

      res.json({
        success: true,
        data: customer,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getCustomerByCode(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const customer = await internationalCustomerService.getCustomerByCode(code);

      res.json({
        success: true,
        data: customer,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Received customer data:', req.body);
      const customer = await internationalCustomerService.createCustomer(req.body);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'International customer created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await internationalCustomerService.updateCustomer(id, req.body);

      res.json({
        success: true,
        data: customer,
        message: 'International customer updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await internationalCustomerService.deleteCustomer(id);

      res.json({
        success: true,
        message: 'International customer deleted successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateCustomerCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await internationalCustomerService.generateCustomerCode();

      res.json({
        success: true,
        data: { code },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new InternationalCustomerController();

