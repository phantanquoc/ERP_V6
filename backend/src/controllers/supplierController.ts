import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplierService';

export const supplierController = {
  // Get all suppliers
  async getAllSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const phanLoaiNCC = req.query.phanLoaiNCC as string;

      const result = await supplierService.getAllSuppliers(page, limit, search, phanLoaiNCC);
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
  async generateCode(req: Request, res: Response, next: NextFunction) {
    try {
      const phanLoaiNCC = req.query.phanLoaiNCC as string;
      const code = await supplierService.generateSupplierCode(phanLoaiNCC);
      res.json({ code });
    } catch (error) {
      next(error);
    }
  },

  // Export suppliers to Excel
  async exportToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const filters: any = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.phanLoaiNCC) {
        filters.phanLoaiNCC = req.query.phanLoaiNCC as string;
      }

      const buffer = await supplierService.exportToExcel(filters);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-nha-cung-cap-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },
};

