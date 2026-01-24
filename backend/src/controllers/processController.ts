import { Response, NextFunction } from 'express';
import processService from '@services/processService';
import type { AuthenticatedRequest, ApiResponse } from '@types';

export class ProcessController {
  async getAllProcesses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;

      const result = await processService.getAllProcesses(page, limit, search);

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

  async getProcessById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const process = await processService.getProcessById(id);

      const response: ApiResponse<any> = {
        success: true,
        data: process,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createProcess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const process = await processService.createProcess(req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: process,
        message: 'Process created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateProcess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const process = await processService.updateProcess(id, req.body);

      const response: ApiResponse<any> = {
        success: true,
        data: process,
        message: 'Process updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteProcess(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await processService.deleteProcess(id);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Process deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async generateProcessCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await processService.generateProcessCode();

      const response: ApiResponse<any> = {
        success: true,
        data: { code },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ==================== FLOWCHART OPERATIONS ====================

  async getFlowchart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { processId } = req.params;
      const flowchart = await processService.getFlowchartByProcessId(processId);

      if (!flowchart) {
        res.status(404).json({
          success: false,
          message: 'Flowchart not found',
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        data: flowchart,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async createFlowchart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { processId } = req.params;
      const { sections } = req.body;

      const flowchart = await processService.createFlowchart(processId, sections);

      const response: ApiResponse<any> = {
        success: true,
        data: flowchart,
        message: 'Flowchart created successfully',
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async updateFlowchart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { processId } = req.params;
      const { sections } = req.body;

      const flowchart = await processService.updateFlowchart(processId, sections);

      const response: ApiResponse<any> = {
        success: true,
        data: flowchart,
        message: 'Flowchart updated successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteFlowchart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { processId } = req.params;
      await processService.deleteFlowchart(processId);

      const response: ApiResponse<any> = {
        success: true,
        message: 'Flowchart deleted successfully',
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new ProcessController();

