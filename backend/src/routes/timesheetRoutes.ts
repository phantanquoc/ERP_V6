import { Router } from 'express';
import timesheetController from '@controllers/timesheetController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.get('/monthly', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'), timesheetController.getMonthly);
router.post('/cell', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), timesheetController.upsertCell);
router.put('/cell', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), timesheetController.upsertCell);
router.post('/override', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), timesheetController.upsertOverride);
router.put('/override', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD'), timesheetController.upsertOverride);

export default router;
