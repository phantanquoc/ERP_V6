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
        Number(year),
        req.userDepartmentId || undefined,
        req.userSubDepartmentId || undefined
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
      const { selfScore, supervisorScore1, supervisorScore2, comment } = req.body;
      const userId = req.user?.id;

      const detail = await employeeEvaluationService.updateEvaluationDetail(detailId, {
        selfScore,
        supervisorScore1,
        supervisorScore2,
        comment,
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

  async createBulkEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const result = await employeeEvaluationService.createBulkEvaluations(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: result,
        message: `Tạo đánh giá thành công cho ${result.created} nhân viên (bỏ qua ${result.skipped} đã có đánh giá)`,
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

  async getPendingCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const userId = req.user?.id;
      const count = await employeeEvaluationService.getPendingEvaluationCount(userId!, month, year);
      res.json({ success: true, data: { count } });
    } catch (error) {
      next(error);
    }
  }

  async syncEvaluationDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const result = await employeeEvaluationService.syncEvaluationDetails(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: result,
        message: `Đồng bộ tiêu chí thành công: ${result.synced} đánh giá được cập nhật, ${result.skipped} đã đầy đủ`,
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const evaluationId = req.params.evaluationId as string;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
        return;
      }

      const evaluation = await employeeEvaluationService.acknowledgeEvaluation(evaluationId, userId);

      res.json({
        success: true,
        data: evaluation,
        message: 'Đã xác nhận đánh giá thành công',
      });
      return;
    } catch (error) {
      next(error);
    }
  }

  async getCompletionStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({
          success: false,
          message: 'Month and year are required',
        });
        return;
      }

      const stats = await employeeEvaluationService.getEvaluationCompletionStats(
        Number(month),
        Number(year)
      );

      res.json({
        success: true,
        data: stats,
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
