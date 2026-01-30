import { Request, Response, NextFunction } from 'express';
import productionProcessService from '../services/productionProcessService';

class ProductionProcessController {
  // Get all production processes
  async getAllProductionProcesses(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await productionProcessService.getAllProductionProcesses(page, limit);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get production process by ID
  async getProductionProcessById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const productionProcess = await productionProcessService.getProductionProcessById(id);

      res.json({
        success: true,
        data: productionProcess,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create production process
  async createProductionProcess(req: Request, res: Response, next: NextFunction) {
    try {
      const productionProcess = await productionProcessService.createProductionProcess(req.body);

      res.status(201).json({
        success: true,
        data: productionProcess,
        message: 'Production process created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Update production process
  async updateProductionProcess(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const productionProcess = await productionProcessService.updateProductionProcess(id, req.body);

      res.json({
        success: true,
        data: productionProcess,
        message: 'Production process updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete production process
  async deleteProductionProcess(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await productionProcessService.deleteProductionProcess(id);

      res.json({
        success: true,
        message: 'Production process deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Sync production process from template
  async syncFromTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const productionProcess = await productionProcessService.syncFromTemplate(id);

      res.json({
        success: true,
        data: productionProcess,
        message: 'Production process synced from template successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductionProcessController();

