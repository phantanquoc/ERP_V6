import { Response, NextFunction } from 'express';
import processService from '@services/processService';
import type { AuthenticatedRequest, ApiResponse } from '@types';
import { getFileUrl } from '@middlewares/upload';

export class ProcessController {
  async exportToExcel(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await processService.exportToExcel();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=danh-sach-quy-trinh-${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async getAllProcesses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const hienThiTrongChung = req.query.hienThiTrongChung === 'true'
        ? true
        : req.query.hienThiTrongChung === 'false'
          ? false
          : undefined;

      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const result = await processService.getAllProcesses(page, limit, search, hienThiTrongChung, month, year);

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
      const actor = { actorId: req.user?.id, actorRole: req.user?.role };
      const process = await processService.updateProcess(id, req.body, actor);

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

  async toggleHienThiTrongChung(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const process = await processService.toggleHienThiTrongChung(id);

      res.json({
        success: true,
        data: process,
        message: 'Cập nhật hiển thị thành công',
      } as ApiResponse<any>);
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

  async uploadFile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const fileUrl = getFileUrl('processes', file.filename);

      res.json({
        success: true,
        data: { fileUrl, fileName: file.originalname },
        message: 'File uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadFiles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
        return;
      }

      const uploadedFiles = files.map(file => ({
        fileUrl: getFileUrl('processes', file.filename),
        fileName: file.originalname,
      }));

      res.json({
        success: true,
        data: uploadedFiles,
        message: 'Files uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== FLOWCHART OPERATIONS ====================

  async getFlowchart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const processId = req.params.processId as string;
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
      const processId = req.params.processId as string;
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
      const processId = req.params.processId as string;
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
      const processId = req.params.processId as string;
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

