import { Response, NextFunction } from 'express';
import employeeEvaluationService from '@services/employeeEvaluationService';
import type { AuthenticatedRequest } from '@types';

export class EmployeeEvaluationController {
  async getEmployeeEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const evaluations = await employeeEvaluationService.getEmployeeEvaluations(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: evaluations,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      const details = await employeeEvaluationService.getEvaluationDetails(evaluationId, userId);

      res.json({
        success: true,
        data: details,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async createOrUpdateEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { employeeId, month, year } = req.body;

      if (!employeeId || !month || !year) {
        res.status(400).json({
          success: false,
          message: 'Employee ID, month, and year are required',
        });
        return;
      }

      const evaluation = await employeeEvaluationService.createOrUpdateEvaluation(
        employeeId,
        month,
        year
      );

      res.json({
        success: true,
        data: evaluation,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async updateEvaluationDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const detailId = req.params.detailId as string;
      const { selfScore, supervisorScore1, supervisorScore2 } = req.body;
      const userId = req.user?.id;

      const detail = await employeeEvaluationService.updateEvaluationDetail(detailId, {
        selfScore,
        supervisorScore1,
        supervisorScore2,
      }, userId);

      res.json({
        success: true,
        data: detail,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getEvaluationHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      const history = await employeeEvaluationService.getEvaluationHistory(evaluationId, userId);

      res.json({
        success: true,
        data: history,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async finalizeEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;

      const evaluation = await employeeEvaluationService.finalizeEvaluation(evaluationId);

      res.json({
        success: true,
        data: evaluation,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getSubordinatesForEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.params;
      const userId = req.user?.id;

      const subordinates = await employeeEvaluationService.getSubordinatesForEvaluation(
        userId!,
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: subordinates,
      });
      return;
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeEvaluationController();
