import { Response } from 'express';
import employeeEvaluationService from '@services/employeeEvaluationService';
import type { AuthenticatedRequest } from '@types';

export class EmployeeEvaluationController {
  async getEmployeeEvaluations(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      console.error('Error fetching evaluations:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching evaluations',
      });
      return;
    }
  }

  async getEvaluationDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;
      const userId = req.user?.id;

      const details = await employeeEvaluationService.getEvaluationDetails(evaluationId, userId);

      res.json({
        success: true,
        data: details,
      });
      return;
    } catch (error) {
      console.error('Error fetching evaluation details:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404
        : error instanceof Error && error.message.includes('Access denied') ? 403
        : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching evaluation details',
      });
      return;
    }
  }

  async createOrUpdateEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      console.error('Error creating/updating evaluation:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error creating/updating evaluation',
      });
      return;
    }
  }

  async updateEvaluationDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { detailId } = req.params;
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
      console.error('Error updating evaluation detail:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404
        : error instanceof Error && error.message.includes('Access denied') ? 403
        : 400;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error updating evaluation detail',
      });
      return;
    }
  }

  async getEvaluationHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;
      const userId = req.user?.id;

      const history = await employeeEvaluationService.getEvaluationHistory(evaluationId, userId);

      res.json({
        success: true,
        data: history,
      });
      return;
    } catch (error) {
      console.error('Error fetching evaluation history:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404
        : error instanceof Error && error.message.includes('Access denied') ? 403
        : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching evaluation history',
      });
      return;
    }
  }

  async finalizeEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { evaluationId } = req.params;

      const evaluation = await employeeEvaluationService.finalizeEvaluation(evaluationId);

      res.json({
        success: true,
        data: evaluation,
      });
      return;
    } catch (error) {
      console.error('Error finalizing evaluation:', error);
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error finalizing evaluation',
      });
      return;
    }
  }

  async getSubordinatesForEvaluation(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      console.error('Error fetching subordinates:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error fetching subordinates',
      });
      return;
    }
  }
}

export default new EmployeeEvaluationController();
