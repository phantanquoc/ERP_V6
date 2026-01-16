import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, CreateTaskRequest, UpdateTaskRequest, TaskListQuery, ApiResponse } from '@types';
import taskService from '@services/taskService';

class TaskController {
  async createTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const data: CreateTaskRequest = req.body;
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => file.path) || [];

      const task = await taskService.createTask(data, userId, filePaths);

      res.status(201).json({
        success: true,
        data: task,
        message: 'Tạo nhiệm vụ thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getAllTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: TaskListQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
        search: req.query.search as string,
        mucDoUuTien: req.query.mucDoUuTien as any,
        nguoiGiao: req.query.nguoiGiao as string,
        nguoiNhan: req.query.nguoiNhan as string,
        department: req.query.department as string,
      };

      const result = await taskService.getAllTasks(query);

      res.json({
        success: true,
        data: result.tasks,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: query.limit,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);

      res.json({
        success: true,
        data: task,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      const data: UpdateTaskRequest = req.body;
      const files = req.files as Express.Multer.File[] | undefined;
      const filePaths = files?.map(file => file.path) || [];

      const task = await taskService.updateTask(id, data, userId, filePaths);

      res.json({
        success: true,
        data: task,
        message: 'Cập nhật nhiệm vụ thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const { id } = req.params;
      await taskService.deleteTask(id, userId);

      res.json({
        success: true,
        message: 'Xóa nhiệm vụ thành công',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getMyTasks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const query: TaskListQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      const result = await taskService.getMyTasks(userId, query);

      res.json({
        success: true,
        data: result.tasks,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: query.limit,
        },
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }
}

export default new TaskController();

