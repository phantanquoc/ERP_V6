import { Router } from 'express';
import technicalSummaryController from '@controllers/technicalSummaryController';
import { authenticate } from '@middlewares/auth';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from './technicalAccess';

const router = Router();
const technicalAccess = requireTechnicalAccess(
  TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM,
  TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL,
  TECHNICAL_SUB_DEPARTMENT_CODES.PROJECTS,
);

router.use(authenticate);

router.get('/', technicalAccess, technicalSummaryController.getSummary.bind(technicalSummaryController));

export default router;
