import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '@middlewares/auth';
import { UserRole } from '@types';
import materialEvaluationCriteriaService from '../services/materialEvaluationCriteriaService';

const router = Router();

// All material evaluation criteria routes require authentication
router.use(authenticate);

// Get all active criteria
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const criteria = await materialEvaluationCriteriaService.getAllCriteria();
      res.json({ success: true, data: criteria });
    } catch (error) {
      next(error);
    }
  }
);

// Get criterion by ID
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD, UserRole.EMPLOYEE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.getCriteriaById(req.params.id as string);
      res.json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

// Create new criterion
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.createCriteria(req.body);
      res.status(201).json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

// Update criterion
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criterion = await materialEvaluationCriteriaService.updateCriteria(req.params.id as string, req.body);
      res.json({ success: true, data: criterion });
    } catch (error) {
      next(error);
    }
  }
);

// Delete criterion
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await materialEvaluationCriteriaService.deleteCriteria(req.params.id as string);
      res.json({ success: true, message: 'Criterion deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Seed default criteria
router.post(
  '/seed',
  authorize(UserRole.ADMIN),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await materialEvaluationCriteriaService.seedDefaultCriteria();
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

