import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@types';
import machineService from '@services/machineService';
import { ApiResponse } from '@types';

class MachineController {
  async getAllMachines(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;

      const result = await machineService.getAllMachines(page, limit);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getMachineById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const machine = await machineService.getMachineById(id);

      res.json({
        success: true,
        data: machine,
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async generateMachineCode(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = await machineService.generateMachineCode();

      res.json({
        success: true,
        data: code,
      } as ApiResponse<string>);
    } catch (error) {
      next(error);
    }
  }

  async createMachine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const machine = await machineService.createMachine(req.body);

      res.status(201).json({
        success: true,
        data: machine,
        message: 'Machine created successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateMachine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const machine = await machineService.updateMachine(id, req.body);

      res.json({
        success: true,
        data: machine,
        message: 'Machine updated successfully',
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteMachine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await machineService.deleteMachine(id);

      res.json({
        success: true,
        message: result.message,
      } as ApiResponse<null>);
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineController();

