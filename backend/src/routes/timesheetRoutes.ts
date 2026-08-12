import { Router } from 'express';
import timesheetController from '@controllers/timesheetController';
import { authenticate, authorize } from '@middlewares/auth';

const router = Router();

router.get('/monthly', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.getMonthly);
router.post('/cell', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.upsertCell);
// Support both POST and PUT for upsert (POST for backwards compat, PUT is semantically correct)
router.post('/cell/upsert', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.upsertCell);
router.put('/cell', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.upsertCell);

router.post('/override', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.upsertOverride);
router.put('/override', authenticate, authorize('ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD', 'EMPLOYEE'), timesheetController.upsertOverride);

export default router;
