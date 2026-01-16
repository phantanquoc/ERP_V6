import { Request, Response } from 'express';
import internalInspectionService from '@services/internalInspectionService';

export class InternalInspectionController {
  async getAllInspections(req: Request, res: Response): Promise<void> {
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
      console.error('Error fetching inspections:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching inspections',
      });
      return;
    }
  }

  async getInspectionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const inspection = await internalInspectionService.getInspectionById(id);

      res.json({
        success: true,
        data: inspection,
      });
      return;
    } catch (error) {
      console.error('Error fetching inspection:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching inspection',
      });
      return;
    }
  }

  async createInspection(req: Request, res: Response): Promise<void> {
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
      console.error('Error creating inspection:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error creating inspection',
      });
      return;
    }
  }

  async updateInspection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const inspection = await internalInspectionService.updateInspection(id, data);

      res.json({
        success: true,
        message: 'Inspection updated successfully',
        data: inspection,
      });
      return;
    } catch (error) {
      console.error('Error updating inspection:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error updating inspection',
      });
      return;
    }
  }

  async deleteInspection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await internalInspectionService.deleteInspection(id);

      res.json({
        success: true,
        message: 'Inspection deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting inspection:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error deleting inspection',
      });
      return;
    }
  }
}

export default new InternalInspectionController();

