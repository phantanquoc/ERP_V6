import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '@types';
import technicalSummaryService from '@services/technicalSummaryService';

class TechnicalSummaryController {
  async getSummary(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await technicalSummaryService.getSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }
}

export default new TechnicalSummaryController();
