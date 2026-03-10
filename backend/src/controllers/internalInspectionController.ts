import { Request, Response, NextFunction } from 'express';
import internalInspectionService from '@services/internalInspectionService';

export class InternalInspectionController {
  async exportToExcel(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await internalInspectionService.exportToExcel();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=kiem-tra-noi-bo-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async getAllInspections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year, search } = req.query;

      let inspections;
      if (search) {
        inspections = await internalInspectionService.searchInspections(search as string);
      } else {
        inspections = await internalInspectionService.getAllInspections(
          month ? Number(month) : undefined,
          year ? Number(year) : undefined
        );
      }

      res.json({
        success: true,
        data: inspections,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getInspectionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      const inspection = await internalInspectionService.getInspectionById(id);

      res.json({
        success: true,
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;

      const inspection = await internalInspectionService.createInspection(data);

      res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async updateInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const data = req.body;

      const inspection = await internalInspectionService.updateInspection(id, data);

      res.json({
        success: true,
        message: 'Inspection updated successfully',
        data: inspection,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async deleteInspection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;

      await internalInspectionService.deleteInspection(id);

      res.json({
        success: true,
        message: 'Inspection deleted successfully',
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default new InternalInspectionController();

