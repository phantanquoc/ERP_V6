import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplierService';

export const supplierController = {
  // Get all suppliers
  async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await supplierService.getAllSuppliers(page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Get supplier by ID
  async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplier = await supplierService.getSupplierById(id);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  },

  // Create supplier
  async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const supplier = await supplierService.createSupplier(data);
      res.status(201).json(supplier);
    } catch (error) {
      next(error);
    }
  },

  // Update supplier
  async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;
      const supplier = await supplierService.updateSupplier(id, data);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  },

  // Delete supplier
  async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await supplierService.deleteSupplier(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Generate next supplier code
  async generateCode(_req: Request, res: Response, next: NextFunction) {
    try {
      const code = await supplierService.generateSupplierCode();
      res.json({ code });
    } catch (error) {
      next(error);
    }
  },
};

